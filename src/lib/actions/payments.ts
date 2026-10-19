"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileRegistrations, type ReconciliationResult } from "@/lib/paymentReconciliation";

export type ReconciliationState = {
  status: "idle" | "success" | "error";
  message?: string;
  nextOffset?: number;
  result?: ReconciliationResult;
};

export async function refreshEventPayments(eventId: string, previous: ReconciliationState, _data: FormData): Promise<ReconciliationState> {
  await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) return { status: "error", message: "Evento inválido." };
  const offset = Number.isSafeInteger(previous.nextOffset) && previous.nextOffset! >= 0 ? previous.nextOffset! : 0;
  // Stable pagination includes settled rows so recovering a payment cannot skip the next row.
  const { data, error } = await createAdminClient().from("registrations")
    .select("id, payment_status, payment_method").eq("event_id", eventId).eq("kind", "ticket")
    .order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 20);
  if (error) return { status: "error", message: "No se pudieron consultar las compras del evento." };
  const rows = data ?? [];
  const result = await reconcileRegistrations(rows.slice(0, 20));
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/account");
  const nextOffset = rows.length > 20 ? offset + 20 : 0;
  return {
    status: result.errors ? "error" : "success", result, nextOffset,
    message: `${result.checked} pagos consultados: ${result.confirmed} confirmados, ${result.failed} rechazados/cancelados, ${result.notFound} sin pago encontrado.${result.message ? ` ${result.message}` : ""}${nextOffset ? " Continúa con las siguientes compras." : ""}`,
  };
}
