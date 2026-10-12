import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketReceipt } from "@/lib/resend";
import type { MercadoPagoPaymentInfo } from "@/lib/mercadopago";

export type ApplyPaymentOutcome =
  /** This call claimed the row and attempted the receipt. */
  | "paid"
  /** Already settled by the webhook or an earlier visit; nothing re-sent. */
  | "already-paid"
  /** Mercado Pago rejected or cancelled the payment. Not an error here. */
  | "failed"
  /** Mercado Pago has not decided yet; a later notification or visit will. */
  | "still-pending"
  | "registration-not-found";

/**
 * Writes a Mercado Pago payment's outcome onto its registration.
 *
 * Two callers reach this — the webhook, and the buyer's return page when the
 * webhook has not landed — and both can run for the same payment at once.
 * So settling is a claim, not a read-then-write: each update matches only
 * rows that are not already paid, and only the call that claimed the row
 * sends the receipt. Checking first and then writing would let both callers
 * pass the check and email the buyer twice.
 *
 * Takes the payment rather than an id so the caller decides how it was found
 * (by notification id, or by searching on external_reference).
 *
 * Throws when a write fails, so the webhook can answer 5xx and Mercado Pago
 * retries. A rejected payment is not a failure of this function.
 */
export async function applyPaymentToRegistration(
  payment: MercadoPagoPaymentInfo
): Promise<ApplyPaymentOutcome> {
  if (!payment.externalReference) return "registration-not-found";

  const admin = createAdminClient();

  const { data: registration } = await admin
    .from("registrations")
    .select(
      "id, email, name, event_id, amount_pen, display_price_usd, exchange_rate_applied, payment_status, mercadopago_payment_id"
    )
    .eq("id", payment.externalReference)
    .maybeSingle();

  if (!registration) return "registration-not-found";

  if (payment.status === "approved") {
    const { data: claimed, error: updateError } = await admin
      .from("registrations")
      .update({ payment_status: "paid", mercadopago_payment_id: payment.id })
      .eq("id", registration.id)
      .neq("payment_status", "paid")
      .select("id");

    if (updateError) {
      console.error("[payments] failed to mark registration paid", updateError);
      throw new Error("Could not save payment.");
    }

    if (!claimed || claimed.length === 0) {
      // Already paid: by a redelivery, by the other caller, or by a
      // *different* payment — which means the buyer was charged twice and
      // nothing else in the system would ever surface it.
      if (
        registration.mercadopago_payment_id &&
        registration.mercadopago_payment_id !== payment.id
      ) {
        console.error(
          "[payments] registration %s is already paid by payment %s, but payment %s was also approved for it — possible double charge",
          registration.id,
          registration.mercadopago_payment_id,
          payment.id
        );
      }
      return "already-paid";
    }

    const { data: event } = await admin
      .from("events")
      .select("title, event_date, location")
      .eq("id", registration.event_id)
      .maybeSingle();

    // The ticket is paid either way; the receipt is best-effort and never
    // retried, since the row can only be claimed once. Log when it cannot be
    // built so a buyer missing their email is diagnosable.
    if (event && registration.amount_pen != null) {
      await sendTicketReceipt({
        to: registration.email,
        name: registration.name,
        eventTitle: event.title,
        eventDate: event.event_date,
        location: event.location,
        amountPen: registration.amount_pen,
        displayPriceUsd: registration.display_price_usd,
        exchangeRateApplied: registration.exchange_rate_applied,
        paymentId: payment.id,
      });
    } else {
      console.error(
        "[payments] registration %s paid but no receipt sent (event found: %s, amount: %s)",
        registration.id,
        Boolean(event),
        registration.amount_pen
      );
    }

    return "paid";
  }

  if (payment.status === "rejected" || payment.status === "cancelled") {
    const { data: claimed, error } = await admin
      .from("registrations")
      .update({ payment_status: "failed", mercadopago_payment_id: payment.id })
      .eq("id", registration.id)
      .neq("payment_status", "paid")
      .select("id");

    if (error) {
      console.error("[payments] failed to mark registration failed", error);
      throw new Error("Could not save payment.");
    }

    // Guarded by the same claim: a rejected attempt must never pull a paid
    // registration back down.
    return !claimed || claimed.length === 0 ? "already-paid" : "failed";
  }

  // "pending" / "in_process" and anything else: leave it alone.
  return "still-pending";
}
