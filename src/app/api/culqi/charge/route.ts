import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCulqiCharge } from "@/lib/culqi";
import { sendTicketReceipt } from "@/lib/resend";
import { culqiChargeSchema } from "@/lib/validation/schemas";

/**
 * Finalizes a ticket purchase. The browser only ever sends the Culqi
 * `token.id` produced by the hosted Checkout widget — never raw card data
 * (spec §3). Amount/currency/email are read from OUR OWN pending
 * registration row, never trusted from the request body, so a tampered
 * client request can't change what gets charged.
 *
 * Idempotent: if the registration is already `paid`, returns success
 * without calling Culqi again (guards against double-submit / retries).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = culqiChargeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to complete this purchase." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: registration, error: fetchError } = await admin
    .from("registrations")
    .select("id, event_id, profile_id, name, email, currency, amount, payment_status, kind")
    .eq("id", parsed.data.registrationId)
    .maybeSingle();

  if (fetchError || !registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  // IDOR guard: this ticket must belong to the caller.
  if (registration.profile_id !== user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (registration.kind !== "ticket") {
    return NextResponse.json({ error: "Invalid registration." }, { status: 400 });
  }

  if (registration.payment_status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (!registration.currency || !registration.amount) {
    return NextResponse.json({ error: "This ticket has no price set." }, { status: 400 });
  }

  const { data: event } = await admin
    .from("events")
    .select("title, event_date, location")
    .eq("id", registration.event_id)
    .maybeSingle();

  const result = await createCulqiCharge({
    tokenId: parsed.data.culqiTokenId,
    amount: registration.amount,
    currency: registration.currency as "PEN" | "USD",
    email: registration.email,
    description: `Best Buddy UP! — ${event?.title ?? "event ticket"}`,
  });

  if (!result.ok || !result.chargeId) {
    await admin
      .from("registrations")
      .update({ payment_status: "failed" })
      .eq("id", registration.id);
    return NextResponse.json({ error: result.errorMessage ?? "Payment failed." }, { status: 402 });
  }

  const { error: updateError } = await admin
    .from("registrations")
    .update({ payment_status: "paid", culqi_charge_id: result.chargeId })
    .eq("id", registration.id);

  if (updateError) {
    console.error("[culqi/charge] failed to mark registration paid", updateError);
    return NextResponse.json({ error: "Payment succeeded but we couldn't save it — contact us with your receipt." }, { status: 500 });
  }

  if (event) {
    await sendTicketReceipt({
      to: registration.email,
      name: registration.name,
      eventTitle: event.title,
      eventDate: event.event_date,
      location: event.location,
      amount: registration.amount,
      currency: registration.currency as "PEN" | "USD",
      chargeId: result.chargeId,
    });
  }

  return NextResponse.json({ ok: true, chargeId: result.chargeId });
}
