import { NextResponse, type NextRequest } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { applyPaymentToRegistration } from "@/lib/db/payments";

/**
 * Mercado Pago webhook receiver (spec §5, §8). Verified against the
 * installed SDK's own type definitions
 * (node_modules/mercadopago/dist/utils/webhook/index.d.ts) — not guessed:
 *   - `x-signature` header: `ts=<millis>,v1=<hmac>`
 *   - `x-request-id` header
 *   - `data.id` QUERY STRING parameter (not the JSON body field)
 *   - `WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId,
 *     secret })` throws `InvalidWebhookSignatureError` on any mismatch.
 *
 * Card data never reaches this route — it only ever fetches a Payment by
 * id from Mercado Pago's own API after the signature checks out, then
 * hands it to the settler. A redelivered notification is a safe no-op,
 * because settling claims the row (`.neq("payment_status", "paid")` in
 * src/lib/db/payments.ts) rather than re-writing it; the unique index on
 * `mercadopago_payment_id` in migration 0002 guards something else, that
 * one payment cannot be attached to two registrations.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const dataId = request.nextUrl.searchParams.get("data.id");

  if (!secret) {
    console.error("[mercadopago/webhook] MERCADOPAGO_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      console.warn("[mercadopago/webhook] rejected", err.reason, err.requestId);
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
    throw err;
  }

  let body: { type?: string; action?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Some notification types (e.g. merchant_order) send an empty body —
    // dataId from the query string is still authoritative for `payment`.
  }

  // Only the `payment` topic carries something we act on.
  if (body.type && body.type !== "payment") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!dataId) {
    return NextResponse.json({ ok: true, noDataId: true });
  }

  const payment = await getMercadoPagoPayment(dataId);
  if (!payment) {
    // An API outage or invalid token is not evidence that the buyer did not pay.
    // Do not acknowledge and permanently lose this notification.
    return NextResponse.json({ error: "Payment lookup unavailable. Retry later." }, { status: 503 });
  }
  if (!payment.externalReference) {
    return NextResponse.json({ ok: true, paymentNotFound: true });
  }

  // Settling lives in src/lib/db/payments.ts because the buyer's return page
  // performs the same reconciliation when a notification never arrives.
  try {
    const outcome = await applyPaymentToRegistration(payment);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    // Mercado Pago retries on a 5xx, which is what we want when the write
    // itself failed rather than the payment.
    console.error("[mercadopago/webhook] could not settle payment", err);
    return NextResponse.json({ error: "Could not save payment." }, { status: 500 });
  }
}
