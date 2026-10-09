"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { getEventRowById } from "@/lib/db/events";
import { resolvePriceForNationality } from "@/lib/pricing";
import { getCurrentExchangeRate } from "@/lib/exchangeRate";
import { createPaymentPreference, getSiteUrl } from "@/lib/mercadopago";
import { rsvpSchema, ticketIntentSchema } from "@/lib/validation/schemas";
import { sendRsvpConfirmation } from "@/lib/resend";

export type RsvpState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/**
 * Free RSVP (spec §5) — no account required. Server-validated, written via
 * the service-role client because there is no user session to satisfy RLS
 * for an anonymous visitor.
 */
export async function submitRsvp(
  _prev: RsvpState,
  formData: FormData
): Promise<RsvpState> {
  const parsed = rsvpSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const admin = createAdminClient();
  const event = await getEventRowById(admin, parsed.data.eventId);

  if (!event) return { status: "error", message: "This event no longer exists." };
  if (event.type !== "free") return { status: "error", message: "This event requires a ticket, not an RSVP." };
  if (event.status !== "open") return { status: "error", message: "RSVPs are closed for this event." };

  if (event.capacity != null) {
    const { count } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .in("payment_status", ["n/a", "pending", "paid"]);
    if (count != null && count >= event.capacity) {
      return { status: "error", message: "This event just filled up." };
    }
  }

  const { error } = await admin.from("registrations").insert({
    event_id: event.id,
    profile_id: null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    kind: "rsvp",
    payment_status: "n/a",
  });

  if (error) {
    console.error("[registrations] rsvp insert failed", error);
    return { status: "error", message: "Something went wrong. Try again in a moment." };
  }

  await sendRsvpConfirmation({
    to: parsed.data.email,
    name: parsed.data.name,
    eventTitle: event.title,
    eventDate: event.event_date,
    location: event.location,
  });

  return { status: "success", message: "You're on the list — check your email for details." };
}

export type TicketIntentResult =
  | {
      ok: true;
      registrationId: string;
      chargeAmountPen: number;
      displayPriceUsd: number | null;
      exchangeRate: number | null;
      initPoint: string;
    }
  | { ok: false; error: string };

/**
 * Creates a pending `registrations` row for a paid ticket, resolves the
 * buyer's price server-side (spec §5, §8 — PEN always, USD is
 * display-only, see src/lib/pricing.ts), and opens a Mercado Pago Checkout
 * Pro preference for the resolved PEN amount. Returns ONLY that buyer's
 * own resolved price plus the hosted-checkout redirect URL — never the
 * other nationality's price. Requires a logged-in profile so the
 * nationality lookup has something to resolve against.
 */
export async function createTicketIntent(
  eventId: string
): Promise<TicketIntentResult> {
  const parsed = ticketIntentSchema.safeParse({ eventId });
  if (!parsed.success) return { ok: false, error: "Invalid event." };

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Log in to buy a ticket." };

  const supabase = await createClient();
  const event = await getEventRowById(supabase, parsed.data.eventId);
  if (!event) return { ok: false, error: "This event no longer exists." };
  if (event.type !== "paid") return { ok: false, error: "This event is free — use the RSVP form." };
  if (event.status !== "open") return { ok: false, error: "Ticket sales are closed for this event." };

  const currentRate = await getCurrentExchangeRate();
  const price = resolvePriceForNationality(profile.nationality, event, currentRate);
  if (!price) {
    return {
      ok: false,
      error:
        profile.nationality === "Peruvian"
          ? "Pricing is not available for this event yet."
          : "We couldn't load today's exchange rate — try again shortly.",
    };
  }

  const admin = createAdminClient();

  if (event.capacity != null) {
    const { count } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .in("payment_status", ["n/a", "pending", "paid"]);
    if (count != null && count >= event.capacity) {
      return { ok: false, error: "This event just sold out." };
    }
  }

  const { data, error } = await admin
    .from("registrations")
    .insert({
      event_id: event.id,
      profile_id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
      phone: null,
      kind: "ticket",
      amount_pen: price.chargeAmountPen,
      display_price_usd: price.displayPriceUsd,
      exchange_rate_applied: price.exchangeRate,
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[registrations] ticket intent insert failed", error);
    return { ok: false, error: "Something went wrong. Try again in a moment." };
  }

  const registrationId = data.id as string;

  const preference = await createPaymentPreference({
    registrationId,
    eventTitle: event.title,
    amountPen: price.chargeAmountPen,
    payerEmail: profile.email,
    payerFirstName: profile.first_name,
    payerLastName: profile.last_name,
    siteUrl: getSiteUrl(),
  });

  if (!preference.ok) {
    await admin.from("registrations").update({ payment_status: "failed" }).eq("id", registrationId);
    return { ok: false, error: preference.error };
  }

  return {
    ok: true,
    registrationId,
    chargeAmountPen: price.chargeAmountPen,
    displayPriceUsd: price.displayPriceUsd,
    exchangeRate: price.exchangeRate,
    initPoint: preference.initPoint,
  };
}
