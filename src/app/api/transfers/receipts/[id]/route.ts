import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { receiptDownloadUrl } from "@/lib/cloudinary";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  // RLS permits the reservation owner and administrators only.
  const { data: receipt, error } = await db.from("payment_receipts").select("cloudinary_public_id, image_format").eq("id", id).maybeSingle();
  if (error || !receipt) return new Response("Not found", { status: 404 });
  const response = NextResponse.redirect(receiptDownloadUrl(receipt.cloudinary_public_id, receipt.image_format));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
