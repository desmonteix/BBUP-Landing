"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ApprovalState = { status: "idle" | "success" | "error"; message?: string };
const reviewSchema = z.object({ profileId: z.string().uuid(), dni: z.string().regex(/^[0-9]{8}$/), nationality: z.literal("Peruvian"), decision: z.enum(["approved", "rejected"]) });

export async function reviewNationality(profileId: string, dni: string, nationality: string, _previous: ApprovalState, form: FormData): Promise<ApprovalState> {
  try { await requireAdmin(); }
  catch { return { status: "error", message: "Solo un administrador puede aprobar cuentas." }; }
  const parsed = reviewSchema.safeParse({ profileId, dni, nationality, decision: form.get("decision") });
  if (!parsed.success) return { status: "error", message: "Datos de revisión inválidos. Recarga la lista." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_nationality", {
    p_profile_id: profileId, p_dni: dni, p_nationality: nationality, p_decision: parsed.data.decision,
  });
  if (error) return { status: "error", message: "No se pudo registrar la decisión. Recarga la lista: el documento o su estado pueden haber cambiado." };
  for (const path of ["/admin/approvals", "/admin", "/account", "/events"]) revalidatePath(path);
  return { status: "success", message: parsed.data.decision === "approved" ? "Cuenta aprobada." : "Cuenta rechazada." };
}
