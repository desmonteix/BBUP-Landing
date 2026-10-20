import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadReceipt, deleteReceipt, receiptsConfigured } from "@/lib/cloudinary";
import { receiptFormat } from "@/lib/transfer";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const reply = (message: string, status: number) => NextResponse.json({ message }, { status });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply("Invalid origin.", 403);
  const profile = await getCurrentProfile();
  if (!profile) return reply("Log in to upload your receipt.", 401);
  if (profile.nationality === "Peruvian") return reply("Los usuarios de Perú deben pagar por Mercado Pago.", 403);
  if (!receiptsConfigured()) return reply("Receipt uploads are temporarily unavailable. Please contact the organizer.", 503);
  const length = Number(request.headers.get("content-length"));
  const maxBody = 4.3 * 1024 * 1024;
  if (length > maxBody || !request.body) return reply("Maximum receipt size: 4 MB.", 413);
  let data: FormData;
  try {
    const reader = request.body.getReader();
    const chunks: BlobPart[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBody) { await reader.cancel(); return reply("Maximum receipt size: 4 MB.", 413); }
      chunks.push(new Uint8Array(part.value));
    }
    data = await new Response(new Blob(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch { return reply("Invalid upload.", 400); }
  const id = z.string().uuid().safeParse(data.get("registrationId"));
  const currency = data.get("currency");
  const file = data.get("receipt");
  if (!id.success || currency !== "EUR" || !(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return reply("Choose a valid EUR receipt (maximum 4 MB).", 400);
  const admin = createAdminClient();
  const { data: registration, error } = await admin.from("registrations").select("id, payment_status, payment_method, display_price_eur")
    .eq("id", id.data).eq("profile_id", profile.id).eq("kind", "ticket").maybeSingle();
  if (error) return reply("Could not check your reservation.", 500);
  if (!registration || registration.payment_status !== "pending" || registration.payment_method !== "transfer") return reply("This reservation is not awaiting a bank transfer.", 409);
  if (currency === "EUR" && !(registration.display_price_eur > 0)) return reply("This reservation has no euro amount.", 400);
  const { data: existing, error: receiptError } = await admin.from("payment_receipts").select("id, status, created_at").eq("registration_id", id.data).order("created_at", { ascending: false }).limit(20);
  if (receiptError) return reply("Could not check existing receipts.", 500);
  if (existing?.some(r => r.status !== "rejected")) return reply("A receipt is already awaiting review or approved.", 409);
  if ((existing?.length ?? 0) >= 10) return reply("Please contact the organizer before sending more receipts.", 429);
  if (existing?.[0] && Date.now() - new Date(existing[0].created_at).getTime() < 60000) return reply("Please wait a minute before uploading again.", 429);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = receiptFormat(bytes);
  if (!format) return reply("Only JPG and PNG images are accepted.", 400);
  let asset: string | undefined;
  try {
    asset = await uploadReceipt(bytes, format);
    const { error: saveError } = await admin.rpc("submit_transfer_receipt", { p_id: randomUUID(), p_registration: id.data, p_profile: profile.id, p_asset: asset, p_format: format, p_currency: currency });
    if (saveError) {
      await deleteReceipt(asset);
      return reply("Could not save the receipt. Reload your reservation before trying again.", 409);
    }
    return reply("Receipt received — pending administrator review. / Comprobante recibido, pendiente de revisión.", 200);
  } catch {
    console.error("[receipts] upload or persistence failed");
    return reply("Could not upload your receipt. Please try again shortly.", 502);
  }
}
