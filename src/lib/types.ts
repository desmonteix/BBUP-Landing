/**
 * Shared data-model types — single source of truth for the shape of every
 * entity that crosses the client/server boundary. Mirrors
 * `supabase/migrations/0001_init.sql` + `0002_mercadopago_and_exchange_rates.sql`.
 * Do not redeclare these shapes anywhere else; import from here.
 *
 * IMPORTANT (pricing safety): `PublicEvent` (sent to the browser) never
 * carries both `events.price_pen` and `events.price_usd`. `resolved_price`
 * is populated server-side from the viewer's OWN nationality and always
 * charges in PEN (Mercado Pago's Peru Checkout Pro cannot process USD —
 * see src/lib/pricing.ts) — for non-Peruvian buyers it additionally carries
 * their USD reference figure and the exchange rate used to convert it, but
 * never the Peruvian PEN price, and vice versa.
 */

import type { CommitteeKey } from "@/lib/committees";
export type EventCategory = CommitteeKey;

export type Nationality =
  | "Peruvian"
  | "Argentine"
  | "Bolivian"
  | "Brazilian"
  | "Chilean"
  | "Colombian"
  | "Ecuadorian"
  | "American"
  | "Canadian"
  | "Mexican"
  | "German"
  | "French"
  | "Spanish"
  | "Italian"
  | "British"
  | "Dutch"
  | "Other";

export const NATIONALITIES: Nationality[] = [
  "Peruvian",
  "Argentine",
  "Bolivian",
  "Brazilian",
  "Chilean",
  "Colombian",
  "Ecuadorian",
  "American",
  "Canadian",
  "Mexican",
  "German",
  "French",
  "Spanish",
  "Italian",
  "British",
  "Dutch",
  "Other",
];

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  dni_id: string;
  nationality: Nationality;
  email: string;
  created_at: string;
}

export type EventType = "free" | "paid";
export type EventStatus = "open" | "closed";

/** Full row shape — server-only (admin panel, DB access layer). Never send
 * this whole object to a non-admin client for a paid event. */
export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  event_date: string;
  location: string;
  type: EventType;
  price_pen: number | null;
  price_usd: number | null;
  capacity: number | null;
  status: EventStatus;
  category: EventCategory;
  created_at: string;
}

/** What anonymous/public visitors receive for the events grid — no prices,
 * ever, for paid events. Safe to render straight from a Server Component or
 * serialize into a client bundle. */
export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  event_date: string;
  location: string;
  type: EventType;
  capacity: number | null;
  spots_remaining: number | null;
  status: EventStatus;
  category: EventCategory;
  /** Only ever populated server-side for the currently authenticated
   * viewer, resolved from THEIR OWN nationality. Exactly one price. */
  resolved_price: ResolvedPrice | null;
}

/**
 * What a buyer sees and what actually gets charged. `chargeAmountPen` is
 * ALWAYS what Mercado Pago will process — Peruvian buyers get it straight
 * from `events.price_pen`; everyone else gets it converted from
 * `events.price_usd` at the current `exchange_rates.rate`. `displayPriceUsd`
 * and `exchangeRate` are null for Peruvian buyers (no conversion happened)
 * and set for everyone else, purely so the UI/receipt can show "$30 ≈ S/ 112.50".
 */
export interface ResolvedPrice {
  chargeAmountPen: number;
  displayPriceUsd: number | null;
  exchangeRate: number | null;
  /**
   * Whether `exchangeRate` is the BCRP rate plus our margin, as opposed to a
   * rate an organizer set by hand during an outage. Checkout tells the buyer
   * how their charge was derived, and that sentence is only true for the
   * automatic path — without this flag the UI cannot say it accurately.
   */
  includesMargin: boolean;
}

export type RegistrationKind = "rsvp" | "ticket";
export type PaymentStatus = "n/a" | "pending" | "paid" | "failed";

export interface Registration {
  id: string;
  event_id: string;
  profile_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  kind: RegistrationKind;
  amount_pen: number | null;
  display_price_usd: number | null;
  exchange_rate_applied: number | null;
  payment_status: PaymentStatus;
  mercadopago_payment_id: string | null;
  created_at: string;
}

export type ExchangeRateSource = "bcrp_auto" | "manual_override";

export interface ExchangeRate {
  id: string;
  rate: number;
  source: ExchangeRateSource;
  updated_at: string;
}

/** Row shape for the admin registrant table (joins profile for nationality). */
export interface AdminRegistrantRow extends Registration {
  nationality: Nationality | null;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo: string;
  committee: EventCategory;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string | null;
}
