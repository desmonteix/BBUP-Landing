"use server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function reviewTransfer(data: FormData) {
  await requireAdmin();
  const id = z.string().uuid().parse(data.get("receiptId"));
  const decision = z.enum(["approved", "rejected"]).parse(data.get("decision"));
  const db = await createClient();
  const { error } = await db.rpc("review_transfer_receipt", { p_id: id, p_decision: decision });
  revalidatePath("/account");
  revalidatePath("/checkout/transfer", "layout");
  revalidatePath("/admin", "layout");
  redirect(`/admin/transfers?${error ? "error=1" : "saved=1"}`);
}
