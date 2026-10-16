import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow, EventType, ExchangeRate, Nationality, PublicEvent, PromotionExchangeRate } from "@/lib/types";
import { resolveTicketPricing, resolvePromotionRate } from "@/lib/pricing";
import { getEventsWithTickets } from "@/lib/ticketHistory";
import { getCurrentExchangeRate } from "@/lib/exchangeRate";
import { createAdminClient } from "@/lib/supabase/admin";
import { termsVersion } from "@/lib/terms";
import { getEuroPromotionRate } from "@/lib/promotionExchangeRate";

const PUBLIC_COLUMNS =
  "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_eur, capacity, status, category, allow_companion, promotions, discounts, offer_rules, terms_text, terms_url, created_at";

/**
 * Fetches events and maps each row down to `PublicEvent` — the shape that
 * is allowed to reach the client. For paid events, `resolved_price` is
 * computed from `viewerNationality` (the CURRENT viewer's own profile,
 * passed in by the caller after checking auth) and is the ONLY pricing
 * information attached. `price_pen`/`price_eur` from the source row are
 * read here on the server and then deliberately dropped — never spread
 * into the returned object.
 */
export async function listEvents(
  supabase: SupabaseClient<any, any, any>,
  opts: { when: "upcoming" | "past"; viewerNationality: Nationality | null; viewerProfileId?: string }
): Promise<PublicEvent[]> {
  const nowIso = new Date().toISOString();
  let query = supabase.from("events").select(PUBLIC_COLUMNS);

  query =
    opts.when === "upcoming"
      ? query.gte("event_date", nowIso).order("event_date", { ascending: true })
      : query.lt("event_date", nowIso).order("event_date", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("[db/events] listEvents failed", error);
    return [];
  }

  const rows = (data ?? []) as EventRow[];

  const withCounts = await attachSpotsRemaining(rows);

  // Logged-in buyers need their nationality rate and any package currency rate.
  // Anonymous event browsing does not trigger currency conversion.
  const needsRate = opts.viewerNationality != null && rows.some((row) => row.type === "paid");
  const needsEuroRate = opts.viewerNationality != null && rows.some((row) => row.type === "paid" && row.offer_rules?.promotion?.type === "bundle_price" && row.offer_rules.promotion.currency === "EUR");
  const [currentRate, euroRate, priorEvents] = await Promise.all([
    needsRate ? getCurrentExchangeRate() : null,
    needsEuroRate ? getEuroPromotionRate() : null,
    opts.viewerProfileId ? getEventsWithTickets(opts.viewerProfileId, rows.filter((row) => row.type === "paid").map((row) => row.id)) : new Set<string>(),
  ]);
  return withCounts.map((row) => toPublicEvent(row, priorEvents == null ? null : opts.viewerNationality, currentRate, euroRate, priorEvents?.has(row.id) ?? false));
}

export async function getEventRowBySlug(
  supabase: SupabaseClient<any, any, any>,
  slug: string
): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_eur, capacity, status, category, allow_companion, promotions, discounts, offer_rules, terms_text, terms_url, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[db/events] getEventRowBySlug failed", error);
    return null;
  }
  return data as EventRow | null;
}

export async function getEventRowById(
  supabase: SupabaseClient<any, any, any>,
  id: string
): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_eur, capacity, status, category, allow_companion, promotions, discounts, offer_rules, terms_text, terms_url, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[db/events] getEventRowById failed", error);
    return null;
  }
  return data as EventRow | null;
}

/**
 * Converts a full server-side row into the client-safe shape. This is the
 * single choke point for the pricing safety rule — call it, don't hand-roll
 * the mapping elsewhere.
 */
export function toPublicEvent(
  row: EventRow & { registration_count?: number },
  viewerNationality: Nationality | null,
  currentExchangeRate: ExchangeRate | null = null,
  euroRate: PromotionExchangeRate | null = null,
  hasPriorTicket = false
): PublicEvent {
  const spotsRemaining =
    row.capacity == null
      ? null
      : Math.max(row.capacity - (row.registration_count ?? 0), 0);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    cover_image: row.cover_image,
    event_date: row.event_date,
    location: row.location,
    type: row.type as EventType,
    capacity: row.capacity,
    spots_remaining: spotsRemaining,
    status: row.status,
    category: row.category,
    allow_companion: row.allow_companion,
    promotions: row.promotions,
    discounts: row.discounts,
    offer_rules: row.offer_rules,
    promotion_exchange_rate: resolvePromotionRate(row.offer_rules, euroRate),
    terms_text: row.terms_text,
    terms_url: row.terms_url,
    terms_version: termsVersion(row.terms_text, row.terms_url),
    resolved_price:
      row.type === "paid" && viewerNationality
        ? resolveTicketPricing(viewerNationality, row, currentExchangeRate, hasPriorTicket)
        : null,
  };
}

async function attachSpotsRemaining(
  rows: EventRow[]
): Promise<(EventRow & { registration_count: number })[]> {
  const eventsWithCapacity = rows.filter((r) => r.capacity != null);
  if (eventsWithCapacity.length === 0) {
    return rows.map((r) => ({ ...r, registration_count: 0 }));
  }

  // Read all bookings on the server: attendee RLS only exposes their own rows.
  // Only aggregated availability reaches the public event object.
  const { data, error } = await createAdminClient()
    .from("registrations")
    .select("event_id, ticket_quantity")
    .in(
      "event_id",
      eventsWithCapacity.map((e) => e.id)
    )
    .in("payment_status", ["n/a", "pending", "paid"]);

  const counts = new Map<string, number>();
  if (!error) {
    for (const row of (data ?? []) as { event_id: string; ticket_quantity: number }[]) {
      counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + row.ticket_quantity);
    }
  }

  return rows.map((r) => ({ ...r, registration_count: counts.get(r.id) ?? 0 }));
}
