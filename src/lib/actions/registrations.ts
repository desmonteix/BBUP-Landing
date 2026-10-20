"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { getEventRowById } from "@/lib/db/events";
import { resolveTicketPricing, resolvePromotionRate } from "@/lib/pricing";
import { getEventsWithTickets } from "@/lib/ticketHistory";
import { verifyNationalityClaim } from "@/lib/nationalityVerification";
import { accountApprovalMessage } from "@/lib/nationality";
import { getCurrentExchangeRate } from "@/lib/exchangeRate";
import { createPaymentPreference, getSiteUrl } from "@/lib/mercadopago";
import { rsvpSchema, ticketIntentSchema } from "@/lib/validation/schemas";
import { sendRsvpConfirmation, sendTicketReceipt } from "@/lib/resend";
import { termsVersion } from "@/lib/terms";
import { quoteTickets } from "@/lib/offers";
import { getEuroPromotionRate } from "@/lib/promotionExchangeRate";

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
    const { data: bookings, error: capacityError } = await admin
      .from("registrations")
      .select("ticket_quantity")
      .eq("event_id", event.id)
      .in("payment_status", ["n/a", "pending", "paid"]);
    if (capacityError) return { status: "error", message: "Could not check availability." };
    const occupied = (bookings ?? []).reduce((sum, row) => sum + row.ticket_quantity, 0);
    if (occupied + 1 > event.capacity) {
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
      displayPriceEur: number | null;
      exchangeRate: number | null;
      initPoint: string;
    }
  | { ok: false; error: string };

/**
 * Resolves the price and payment method from the authenticated profile.
 * Peru uses Mercado Pago in PEN; foreign buyers transfer the EUR quote.
 * PEN totals are retained internally for existing offer and capacity records.
 */
export async function createTicketIntent(
  eventId: string,
  companion?: { firstName: string; lastName: string },
  consent?: { accepted: boolean; version: string; expectedAmountPen?: number },
  paymentMethod?: "mercadopago" | "transfer"
): Promise<TicketIntentResult> {
  if (paymentMethod !== undefined && paymentMethod !== "mercadopago" && paymentMethod !== "transfer") return { ok: false, error: "Invalid payment method." };
  const parsed = ticketIntentSchema.safeParse({ eventId, companion, accepted: consent?.accepted, version: consent?.version, expectedAmountPen: consent?.expectedAmountPen });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Log in to buy a ticket." };
  const nationalityError = await verifyNationalityClaim({
    nationality: profile.nationality, dniId: profile.dni_id,
    firstName: profile.first_name, lastName: profile.last_name,
    profileId: profile.id, context: "checkout",
  });
  if (nationalityError) return { ok: false, error: `${nationalityError.message} Corrígelo en tu perfil antes de comprar.` };
  const approvalError = accountApprovalMessage(profile);
  if (approvalError) return { ok: false, error: approvalError };
  const allowedMethod = profile.nationality === "Peruvian" ? "mercadopago" : "transfer";
  if (paymentMethod !== undefined && paymentMethod !== allowedMethod) {
    return { ok: false, error: allowedMethod === "mercadopago"
      ? "Los usuarios de Perú solo pueden pagar en soles por Mercado Pago."
      : "Foreign buyers can only pay in euros by bank transfer." };
  }
  paymentMethod = allowedMethod;

  const supabase = await createClient();
  const event = await getEventRowById(supabase, parsed.data.eventId);
  if (!event) return { ok: false, error: "This event no longer exists." };
  if (event.type !== "paid") return { ok: false, error: "This event is free — use the RSVP form." };
  if (event.status !== "open") return { ok: false, error: "Ticket sales are closed for this event." };

  if (!event.terms_text && !event.terms_url) {
    return { ok: false, error: "The organizer has not published the event terms yet." };
  }
  if (parsed.data.version !== termsVersion(event.terms_text, event.terms_url)) {
    return { ok: false, error: "The event terms have changed. Reload the event and accept the updated terms." };
  }
  if (parsed.data.companion && !event.allow_companion) {
    return { ok: false, error: "This event does not allow a +1." };
  }
  const priorEvents = await getEventsWithTickets(profile.id, [event.id]);
  if (priorEvents == null) return { ok: false, error: "Could not check your previous tickets. Try again shortly." };
  const hasPriorTicket = priorEvents.has(event.id);
  if (hasPriorTicket && !parsed.data.companion) {
    return { ok: false, error: "You already have an entry for this event. Reload and enter your +1's name." };
  }
  const quantity = parsed.data.companion && !hasPriorTicket ? 2 : 1;
  const promotion = event.offer_rules?.promotion;
  const [currentRate, euroRate] = await Promise.all([
    getCurrentExchangeRate(),
    promotion?.type === "bundle_price" && promotion.currency === "EUR" ? getEuroPromotionRate() : null,
  ]);
  const price = resolveTicketPricing(profile.nationality, event, currentRate, hasPriorTicket);
  if (!price) {
    return {
      ok: false,
      error:
        profile.nationality === "Peruvian"
          ? "Pricing or the EUR/PEN exchange rate is unavailable. Try again shortly."
          : "We couldn't load today's exchange rate — try again shortly.",
    };
  }

  const admin = createAdminClient();
  const quote = quoteTickets(price, quantity, event.offer_rules, Date.now(), resolvePromotionRate(event.offer_rules, euroRate));
  if (!quote.available) return { ok: false, error: "The EUR/PEN exchange rate is temporarily unavailable. Try again shortly." };
  const totalPen = quote.chargeAmountPen;
  const totalEur = quote.displayPriceEur;
  if (parsed.data.expectedAmountPen != null && Math.round(parsed.data.expectedAmountPen * 100) !== Math.round(totalPen * 100)) {
    return { ok: false, error: "The price or offer changed. Reload the event to see the current total before buying." };
  }

  if (event.capacity != null) {
    const { data: bookings, error: capacityError } = await admin
      .from("registrations")
      .select("ticket_quantity")
      .eq("event_id", event.id)
      .in("payment_status", ["n/a", "pending", "paid"]);
    if (capacityError) return { ok: false, error: "Could not check availability." };
    const occupied = (bookings ?? []).reduce((sum, row) => sum + row.ticket_quantity, 0);
    if (occupied + quantity > event.capacity) {
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
      ticket_quantity: quantity,
      uses_staff_price: price.staffEntryAvailable === true,
      is_companion_ticket: hasPriorTicket,
      pricing_snapshot: { subtotalPen: quote.subtotalPen, savingsPen: quote.savingsPen, appliedOffer: quote.appliedOffer, promotionReference: quote.promotionReference,
        primaryPricePen: price.chargeAmountPen, companionPricePen: quantity === 2 ? price.companionPricePen ?? price.chargeAmountPen : null },
      terms_accepted_at: new Date().toISOString(),
      terms_text_snapshot: event.terms_text,
      terms_url_snapshot: event.terms_url,
      companion_first_name: parsed.data.companion?.firstName ?? null,
      companion_last_name: parsed.data.companion?.lastName ?? null,
      amount_pen: totalPen,
      display_price_eur: totalEur,
      exchange_rate_applied: price.exchangeRate,
      payment_status: totalPen === 0 ? "paid" : "pending",
      payment_method: paymentMethod,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[registrations] ticket intent insert failed", error);
    if (error?.code === "PGRST204" && error.message?.includes("payment_method")) {
      return { ok: false, error: paymentMethod === "transfer"
        ? "Bank transfers are not enabled yet. Please contact the organizer. / Las transferencias aún no están habilitadas. Contacta al organizador."
        : "Payments are temporarily unavailable. Please contact the organizer. / Los pagos no están disponibles temporalmente. Contacta al organizador." };
    }
    if (error?.code === "23505") return { ok: false, error: "Your personal ticket was reserved in another checkout. Reload the event to buy your +1 at the current price." };
    return { ok: false, error: "Something went wrong. Try again in a moment." };
  }

  const registrationId = data.id as string;

  if (totalPen === 0) {
    await sendTicketReceipt({ to: profile.email, name: `${profile.first_name} ${profile.last_name}`,
      eventTitle: event.title, eventDate: event.event_date, location: event.location,
      amountPen: 0, displayPriceEur: totalEur, exchangeRateApplied: price.exchangeRate,
      paymentId: "No payment required", ticketQuantity: quantity, promotionReference: quote.promotionReference,
      companionName: parsed.data.companion ? `${parsed.data.companion.firstName} ${parsed.data.companion.lastName}` : null });
    return { ok: true, registrationId, chargeAmountPen: 0, displayPriceEur: totalEur,
      exchangeRate: price.exchangeRate, initPoint: `/checkout/return?registration_id=${registrationId}` };
  }

  if (paymentMethod === "transfer") return { ok: true, registrationId, chargeAmountPen: totalPen,
    displayPriceEur: totalEur, exchangeRate: price.exchangeRate, initPoint: `/checkout/transfer/${registrationId}` };

  const preference = await createPaymentPreference({
    registrationId,
    eventTitle: `${event.title} (${quantity} ticket${quantity === 1 ? "" : "s"})`,
    amountPen: totalPen,
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
    chargeAmountPen: totalPen,
    displayPriceEur: totalEur,
    exchangeRate: price.exchangeRate,
    initPoint: preference.initPoint,
  };
}
