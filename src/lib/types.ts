/**
 * Shared data-model types — single source of truth for the shape of every
 * entity that crosses the client/server boundary. Mirrors
 * `supabase/migrations/0001_init.sql`. Do not redeclare these shapes
 * anywhere else; import from here.
 *
 * IMPORTANT (pricing safety): `PublicEvent` (sent to the browser for
 * anonymous/unauthenticated viewers) intentionally has NO price fields.
 * `EventWithResolvedPrice` (sent only to an authenticated viewer, computed
 * server-side from their own `profiles.nationality`) carries exactly ONE
 * price/currency pair — never both. Never introduce a type here that
 * exposes both `price_pen` and `price_usd` to a client-facing response.
 */

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
export type { CommitteeKey as EventCategory } from "@/lib/committees";

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

export interface ResolvedPrice {
  amount: number;
  currency: "PEN" | "USD";
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
  currency: "PEN" | "USD" | null;
  amount: number | null;
  payment_status: PaymentStatus;
  culqi_charge_id: string | null;
  created_at: string;
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
