import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow, EventType, ExchangeRate, Nationality, PublicEvent } from "@/lib/types";
import { resolvePriceForNationality } from "@/lib/pricing";
import { getCurrentExchangeRate } from "@/lib/exchangeRate";
import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_COLUMNS =
  "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_usd, capacity, status, category, allow_companion, promotions, discounts, created_at";

/**
 * Fetches events and maps each row down to `PublicEvent` — the shape that
 * is allowed to reach the client. For paid events, `resolved_price` is
 * computed from `viewerNationality` (the CURRENT viewer's own profile,
 * passed in by the caller after checking auth) and is the ONLY pricing
 * information attached. `price_pen`/`price_usd` from the source row are
 * read here on the server and then deliberately dropped — never spread
 * into the returned object.
 */
export async function listEvents(
  supabase: SupabaseClient<any, any, any>,
  opts: { when: "upcoming" | "past"; viewerNationality: Nationality | null }
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

  // Only fetch the rate when it's actually needed: a non-Peruvian viewer
  // looking at at least one paid event. Peruvian buyers and anonymous
  // visitors never trigger a conversion, so no need to pay for the read.
  const needsRate =
    opts.viewerNationality != null &&
    opts.viewerNationality !== "Peruvian" &&
    rows.some((r) => r.type === "paid");
  const currentRate = needsRate ? await getCurrentExchangeRate() : null;

  return withCounts.map((row) => toPublicEvent(row, opts.viewerNationality, currentRate));
}

export async function getEventRowBySlug(
  supabase: SupabaseClient<any, any, any>,
  slug: string
): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_usd, capacity, status, category, allow_companion, promotions, discounts, created_at"
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
      "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_usd, capacity, status, category, allow_companion, promotions, discounts, created_at"
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
  currentExchangeRate: ExchangeRate | null = null
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
    resolved_price:
      row.type === "paid" && viewerNationality
        ? resolvePriceForNationality(viewerNationality, row, currentExchangeRate)
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
