import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketReceipt } from "@/lib/resend";

/**
 * Culqi webhook receiver — asynchronous backstop for the synchronous
 * /api/culqi/charge flow (e.g. if the buyer closes the tab right after
 * paying but before the client-side confirmation call completes).
 *
 * // VERIFICAR: Culqi's current webhook event names, payload shape, and
 * // signing/verification mechanism against https://apidocs.culqi.com/ —
 * // at the time this was built, Culqi's dashboard lets you register a
 * // webhook URL per event type (e.g. "charge.succeeded") but does not
 * // document a single universal HMAC signature header the way Stripe
 * // does. As a pragmatic stand-in, this endpoint is protected by a
 * // shared-secret query param (`?secret=...`) you set when registering
 * // the webhook URL in the Culqi dashboard — swap for real signature
 * // verification once confirmed against current docs.
 *
 * Idempotent: keyed on `culqi_charge_id`, which has a unique index in the
 * DB — a second delivery of the same event is a safe no-op.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.CULQI_WEBHOOK_SECRET || secret !== process.env.CULQI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: { object?: string; type?: string; data?: { object?: { id?: string; reference_code?: string } } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const chargeId = payload?.data?.object?.id;
  if (!chargeId || payload.type !== "charge.succeeded") {
    // Not an event we act on — acknowledge so Culqi doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("registrations")
    .select("id, payment_status")
    .eq("culqi_charge_id", chargeId)
    .maybeSingle();

  if (existing?.payment_status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  // The reference_code is expected to carry our registrationId — set this
  // when creating the charge if you rely on the webhook as the primary
  // confirmation path instead of the synchronous /api/culqi/charge route.
  const registrationId = payload?.data?.object?.reference_code;
  if (!registrationId) {
    return NextResponse.json({ ok: true, noReference: true });
  }

  const { data: registration } = await admin
    .from("registrations")
    .select("id, email, name, event_id, amount, currency, payment_status")
    .eq("id", registrationId)
    .maybeSingle();

  if (!registration || registration.payment_status === "paid") {
    return NextResponse.json({ ok: true });
  }

  await admin
    .from("registrations")
    .update({ payment_status: "paid", culqi_charge_id: chargeId })
    .eq("id", registration.id);

  const { data: event } = await admin
    .from("events")
    .select("title, event_date, location")
    .eq("id", registration.event_id)
    .maybeSingle();

  if (event && registration.amount && registration.currency) {
    await sendTicketReceipt({
      to: registration.email,
      name: registration.name,
      eventTitle: event.title,
      eventDate: event.event_date,
      location: event.location,
      amount: registration.amount,
      currency: registration.currency as "PEN" | "USD",
      chargeId,
    });
  }

  return NextResponse.json({ ok: true });
}
