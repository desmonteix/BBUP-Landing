import "server-only";
import { lookupPaymentByRegistration } from "@/lib/mercadopago";
import { applyPaymentToRegistration } from "@/lib/db/payments";

export type PaymentCheck = "not-found" | "error";
export interface ReconciliationResult {
  checked: number;
  confirmed: number;
  failed: number;
  notFound: number;
  errors: number;
  checks: Record<string, PaymentCheck>;
  message?: string;
}

/** Recover lost notifications using verified provider data; never infer a payment from attendance. */
export async function reconcileRegistrations(rows: { id: string; payment_status: string; payment_method?: string }[]): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { checked: 0, confirmed: 0, failed: 0, notFound: 0, errors: 0, checks: {} };
  const pending = rows.filter(row => row.payment_method !== "transfer" && (row.payment_status === "pending" || row.payment_status === "failed"));
  for (let start = 0; start < pending.length; start += 5) {
    await Promise.all(pending.slice(start, start + 5).map(async row => {
      result.checked++;
      try {
        const lookup = await lookupPaymentByRegistration(row.id);
        if (!lookup.ok) {
          result.errors++;result.checks[row.id] = "error";result.message ??= lookup.error;
          return;
        }
        if (!lookup.payment) { result.notFound++;result.checks[row.id] = "not-found";return; }
        const outcome = await applyPaymentToRegistration(lookup.payment);
        if (outcome === "paid" || outcome === "already-paid") result.confirmed++;
        else if (outcome === "failed") result.failed++;
        else if (outcome === "payment-mismatch" || outcome === "registration-not-found") {
          result.errors++;result.checks[row.id] = "error";
          result.message ??= "No se pudo confirmar un pago: su importe o referencia no coincide con la compra.";
        }
      } catch {
        result.errors++;result.checks[row.id] = "error";
        result.message ??= "No se pudieron actualizar algunos pagos. Vuelve a intentarlo.";
      }
    }));
  }
  return result;
}
