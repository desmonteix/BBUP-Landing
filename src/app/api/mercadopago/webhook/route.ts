import { NextResponse, type NextRequest } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { sendTicketReceipt } from "@/lib/resend";

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
 * copies over status/amount. Idempotent on `mercadopago_payment_id`
 * (unique index in migration 0002): a redelivered notification for a
 * payment we've already marked paid is a safe no-op.
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
  if (!payment || !payment.externalReference) {
    return NextResponse.json({ ok: true, paymentNotFound: true });
  }

  const admin = createAdminClient();

  const { data: registration } = await admin
    .from("registrations")
    .select("id, email, name, event_id, amount_pen, display_price_usd, exchange_rate_applied, payment_status, mercadopago_payment_id")
    .eq("id", payment.externalReference)
    .maybeSingle();

  if (!registration) {
    return NextResponse.json({ ok: true, registrationNotFound: true });
  }

  // Idempotency: already recorded as paid (possibly by a prior delivery of
  // this same notification, or by an earlier notification for the same
  // payment) — don't re-send the receipt email.
  if (registration.payment_status === "paid" && registration.mercadopago_payment_id === payment.id) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (payment.status === "approved") {
    const { error: updateError } = await admin
      .from("registrations")
      .update({ payment_status: "paid", mercadopago_payment_id: payment.id })
      .eq("id", registration.id);

    if (updateError) {
      console.error("[mercadopago/webhook] failed to mark registration paid", updateError);
      return NextResponse.json({ error: "Could not save payment." }, { status: 500 });
    }

    const { data: event } = await admin
      .from("events")
      .select("title, event_date, location")
      .eq("id", registration.event_id)
      .maybeSingle();

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
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await admin
      .from("registrations")
      .update({ payment_status: "failed", mercadopago_payment_id: payment.id })
      .eq("id", registration.id);
  }
  // "pending"/"in_process" etc.: leave the registration as pending; a
  // later notification will carry the final status.

  return NextResponse.json({ ok: true });
}
