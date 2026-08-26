# Best Buddy UP! — Website Design Spec

**Date:** 2026-08-25
**Status:** Approved by user, pending written-spec review

## 1. Purpose

Best Buddy UP! is a student organization whose mission is to integrate exchange
students into Peruvian culture. The website needs to:

- Present the organization (mission, team, story) to prospective attendees and
  the wider community.
- List events (free and paid) and let people register or buy tickets directly
  on the site.
- Charge Peruvian buyers and exchange-student buyers different prices per
  paid event, in their respective currency, without either group seeing the
  other's price (see §5).
- Let organizers manage events and see who registered, without touching code.
- Feel warm, premium, and elegant — with animations that stay smooth on any
  device.
- Be entirely in English.

Inspiration reference: [ebnwu.com](https://www.ebnwu.com/) (Erasmus Buddy
Network, WU Vienna) — informal warm hero greeting, a short "who we are" blurb
on the home page leading into a full About page, and a newsletter capture
block. Structure and tone borrowed loosely; visuals are our own (built from
the Best Buddy UP! logo).

## 2. Explicit non-goals

Out of scope for this build (can be revisited later):

- Applications or matching for "become a buddy" / "apply as exchange student"
  — this site is informational + event ticketing only.
- Identity verification of DNI/nationality (self-declared at signup, honor
  system — see §5 and §8).
- Multi-language toggle (English only, per §1).
- Blog/CMS.
- Newsletter *sending* (campaigns) — only capturing emails, see §7.

Note: attendee accounts *are* in scope (needed for nationality-based pricing
— see §5), which supersedes the earlier draft's "no attendee accounts"
non-goal.

## 3. Architecture

Single Next.js (App Router) project — no separate Vite app, no Python
service. One codebase serves the public site, the admin panel, and the
backend (API routes / Server Actions).

- **Frontend + backend:** Next.js (App Router), TypeScript.
- **Database + auth:** Supabase (Postgres + Supabase Auth for two distinct
  populations: attendee accounts, and a small organizer allow-list for
  `/admin` — see §4).
- **Hosting:** Vercel.
- **Payments:** Mercado Pago (Checkout Pro), decided after Culqi turned out
  to require a RUC (business tax ID) + legal representative — not available
  to an informal student org. Full comparison in §10's history, kept there
  rather than repeated here.
  - Signup as an individual ("persona natural"): DNI + a Peruvian bank
    account, no RUC. Public, documented, free-to-integrate API:
    https://www.mercadopago.com.pe/developers
  - ~4% flat fee, same-day settlement.
  - **Constraint that shapes pricing (see §5):** Peru's Checkout Pro only
    ever charges in **PEN** — even for international cards. International
    Visa/Mastercard/Amex/Diners cards are explicitly accepted, and the
    conversion from the student's home currency happens automatically on
    their own card network/issuing bank's side, same mechanism as
    Airbnb/Netflix — but the amount Mercado Pago itself processes is always
    soles. There is no way to make it charge USD directly.
  - Integration uses Checkout Pro's hosted payment page so card data never
    touches our server (minimizes PCI scope).
- **Transactional email:** Resend (free tier) for RSVP/ticket confirmations.
- **Domain:** none yet — user will purchase a domain once the site is
  finished; ship on the Vercel-provided subdomain until then.

## 4. Data model (Supabase / Postgres)

```
profiles
  id            uuid pk (fk -> auth.users.id)
  first_name    text
  last_name     text
  dni_id        text            -- national ID / passport number: stored as
                                 -- a profile field only, NEVER used as a
                                 -- credential (see §8, Security notes)
  nationality   text
  email         text
  created_at    timestamptz

events
  id            uuid pk
  slug          text unique
  title         text
  description   text (rich enough for formatting, markdown or simple HTML)
  cover_image   text (Supabase Storage path/URL)
  event_date    timestamptz
  location      text
  type          enum('free', 'paid')
  price_pen     numeric, nullable (required if type = 'paid')
                -- charged directly to Peruvian buyers
  price_usd     numeric, nullable (required if type = 'paid')
                -- DISPLAY price for exchange-student buyers only. Never
                -- charged directly (Mercado Pago can't process USD, see
                -- §3) — converted to a PEN amount at checkout time using
                -- exchange_rates.rate (below), rounded to 2 decimals. The
                -- checkout UI shows both: "$price_usd" as the headline
                -- price and "≈ S/ <converted>" so the buyer isn't
                -- surprised by the charge.
  capacity      integer, nullable (null = unlimited)
  status        enum('open', 'closed')
  category      enum('Events', 'Finance', 'Legal', 'Merch', 'S&C',
                      'Social Media', 'Sports', 'Tandem', 'Trips')
                -- the committee that owns/runs the event; drives the
                -- category badge color on the event card, see §6
  created_at    timestamptz

registrations
  id                    uuid pk
  event_id              uuid fk -> events
  profile_id            uuid fk -> profiles, nullable
                         -- set for paid tickets (account required); null
                         -- for anonymous free RSVPs (no account required)
  name                  text
  email                 text
  phone                 text, nullable
  kind                  enum('rsvp', 'ticket')  -- rsvp = free, ticket = paid
  amount_pen            numeric, nullable
                         -- the ACTUAL amount charged via Mercado Pago,
                         -- always PEN, for every ticket regardless of buyer
  display_price_usd     numeric, nullable
                         -- set only for exchange-student tickets: the USD
                         -- figure they were shown, kept for their receipt/
                         -- record even though PEN is what was charged
  exchange_rate_applied numeric, nullable
                         -- the exchange_rates.rate value used at the
                         -- moment this ticket was charged (audit trail —
                         -- so a receipt can show its math even after the
                         -- rate later changes)
  payment_status         enum('n/a', 'pending', 'paid', 'failed')
  mercadopago_payment_id text, nullable
  created_at             timestamptz

exchange_rates
  id              uuid pk
  rate            numeric        -- current USD -> PEN rate, e.g. 3.75
  source          enum('bcrp_auto', 'manual_override')
  updated_at      timestamptz
  -- single current-rate row (or latest-by-updated_at); see §5 for how it's
  -- populated and the manual-override fallback

admins
  -- backed by Supabase Auth users; a separate allow-list from `profiles`,
  -- marking which auth users may access /admin (organizers, not attendees)

newsletter_subscribers
  id            uuid pk
  email         text unique
  created_at    timestamptz
```

## 5. Pages & user flows

- **Home (`/`)** — hero (animated logo/gradient treatment, warm greeting in
  the spirit of EBN WU's "Servus 👋", mission statement), short "Who we are"
  blurb linking to the full About page, teaser of the next upcoming event,
  featured testimonial quotes, newsletter signup block.
- **About Us (`/about`)** — full mission/story, values, team grid (photo +
  name + role), fuller set of testimonial quote cards. Team members are
  grouped by committee (Events, Finance, Legal, Merch, S&C, Social Media,
  Sports, Tandem, Trips — see §6 for each committee's color); each
  committee's group heading/section uses that committee's color as an
  accent.
- **Events (`/events`)** — grid of upcoming events (free badge, or "from
  S/ X / $Y" shown only where price-safe — see pricing rule below), each
  card showing a small category badge colored per its committee (§6), and a
  separate/collapsed section for past events. Clicking a card opens the
  **event detail in-page** (modal / expandable panel) — **not** a separate
  route per event. The detail view shows the full description, date,
  location, and:
  - **Free event:** short RSVP form (name, email, phone optional), no
    account required → on submit, writes a `registrations` row
    (`kind='rsvp'`), shows an in-page confirmation, and triggers a
    confirmation email via Resend.
  - **Paid event — nationality-gated pricing:** requires an account (see
    "Attendee accounts" below). Once logged in, the **server** resolves the
    buyer's price using their profile's `nationality`:
    - `nationality == 'Peruvian'` → shows `events.price_pen`, charges that
      exact amount in PEN via Mercado Pago.
    - any other nationality → shows `events.price_usd` as the headline
      price (e.g. "$30"), plus "≈ S/ <price_usd × current exchange_rates.rate,
      rounded to 2 decimals>" underneath so the buyer knows what will
      actually be charged. Mercado Pago charges that converted PEN amount —
      it cannot process USD directly (§3). The rate used is stamped onto
      the registration (`exchange_rate_applied`) at charge time.

    Only the resolved price for the logged-in buyer is ever sent to the
    browser — the other nationality's price is never included in the page's
    HTML, API response, or client-side bundle, so it can't be seen via dev
    tools either. Checkout proceeds into Mercado Pago's hosted Checkout Pro
    for the resolved PEN amount → on success, a webhook marks the
    `registrations` row `payment_status='paid'`, sets `amount_pen` (and
    `display_price_usd`/`exchange_rate_applied` if applicable), and stores
    `mercadopago_payment_id` → confirmation/receipt email via Resend
    (showing the PEN amount charged, and the USD reference if applicable).
    On failure, the row stays `pending`/`failed` and the buyer sees a retry
    option.
  - **Daily exchange-rate update:** a Vercel Cron job runs once a day,
    hitting a Route Handler that fetches Peru's official USD/PEN rate from
    BCRP's (Banco Central de Reserva del Perú) public statistics API —
    confirm the exact series endpoint/code against BCRP's own docs at
    implementation time, don't guess it — and writes a new `exchange_rates`
    row with `source='bcrp_auto'`. If the fetch fails, the previous rate
    stays in effect (checkout must never break because the cron job had a
    bad day) and the admin panel surfaces how stale the current rate is.
    The admin panel also lets an organizer manually set
    `source='manual_override'` as a fallback if the automated job is ever
    down for an extended period.
- **Attendee accounts (`/signup`, `/login`)** — email + password (Supabase
  Auth). Signup collects: first name, last name, DNI/ID, nationality, email,
  password. Nationality is set at signup and used for all future paid-ticket
  pricing; editable later from a profile page if the buyer needs to correct
  it. Accounts exist solely to support nationality-based ticket pricing —
  not for buddy applications/matching (still out of scope, §2).
- **Gallery (`/gallery`)** — responsive photo grid/lightbox, reachable from
  nav, images from past events (see §7 asset checklist).
- **Testimonials** — no dedicated page/route; lives as sections within Home
  (short, featured) and About Us (fuller set).
- **Footer** (site-wide) — contact info, Instagram/TikTok/WhatsApp links,
  newsletter signup (if not already on Home).
- **Admin (`/admin`)** — Supabase-Auth-gated login, restricted to the
  `admins` allow-list (organizers only, separate from attendee accounts).
  Event list with create/edit (title, description, date, location, cover
  image, free/paid + PEN price + USD display price, capacity, open/closed
  toggle, committee category — dropdown of the 9 committees in §6) and, per
  event, a registrant table (name, email, phone, nationality, PEN amount
  charged, USD reference shown if applicable, payment status). Also shows
  the current USD→PEN exchange rate, when it last updated, and a manual
  override field (see §5).

## 6. Visual design & animation

- **Core brand palette:** drawn from the Best Buddy UP! logo — magenta/pink
  → sky-blue gradient, white, and a neutral dark (near-black or deep plum)
  for text. This is what primary UI — main CTAs, links, buttons, the hero —
  should stay built from, so the site reads as one cohesive brand rather
  than a rainbow. Gradient used as an accent (buttons, dividers, background
  blobs), not as a full-bleed background everywhere — keeps it feeling
  premium rather than purely playful.
- **Committee palette:** the org has 9 committees, each with its own brand
  color, supplied as reference gradient swatches in
  `Lading/Paleta de colores/*.png` (one file per committee, named after it).
  These are used specifically — and only — for the two structural cases
  called out in §5: the committee-grouped Team section on About Us, and the
  category badge on Event cards. They are not a general-purpose "pick any
  accent color" palette — each color's job is to mean its committee, so
  using "Sports cyan" somewhere unrelated to sports would undercut that.
  Sample the exact gradient stops from the source PNGs when implementing
  (they're gradients, not flat colors); approximate reference hues below —
  verify precisely against the files rather than trusting these by eye:

  | Committee | Swatch file | Approx. hue |
  |---|---|---|
  | Events | `Events.png` | vivid pink/magenta (~#FF3D9A range) |
  | Finance | `Finance.png` | vivid blue (~#3E8EF7 range) |
  | Legal | `Legal.png` | steel gray/silver (~#A0A0A0 range) |
  | Merch | `Merch.png` | vivid orange (~#FFA020 range) |
  | S&C (Social & Cultural) | `S&C.png` | periwinkle purple (~#9B7FF0 range) |
  | Social Media | `Social Media.png` | bright fuchsia (~#EA3DE0 range) |
  | Sports | `Sports.png` | sky cyan (~#6FD4F5 range) |
  | Tandem | `Tandem.png` | fresh green (~#66C46A range) |
  | Trips | `Trips.png` | golden yellow (~#FFCB2E range) |

- **Typography:** bold, rounded display font for headings (echoing the
  logo's chunky lettering), paired with a clean, highly legible sans for
  body copy.
- **Tone:** warm and playful, still premium — the direction the user chose
  over "clean & minimal" and "bold & vibrant."
- **Animation approach:**
  - Scroll-reveal on sections (fade/slide up, staggered for card grids) via
    Framer Motion, triggered only when elements enter the viewport.
  - Micro-interactions: button hover/press states, gradient shimmer on
    primary CTAs, animated stat counters on Home.
  - Spring-based open/close transition for the event detail modal.
  - `prefers-reduced-motion` respected throughout.
  - Animations restricted to `transform`/`opacity` for GPU-friendly
    performance on low-end phones.

## 7. Image asset checklist

Placeholders will be used at build time (clearly marked, correctly sized) and
swapped for real photos later. Recommended shot list:

| Location | Count | Size | What it should show |
|---|---|---|---|
| Home hero | 1 (image or short loop) | 1920×1080 min | Exchange students + Peruvian buddies together, candid, bright |
| Team (About Us) | 1 per team member | ~800×800, square | Consistent headshot style/background |
| Event cover | 1 per event | 1200×675 (16:9) | Represents that specific event |
| Event gallery (per past event) | 3–6 | ~1200px long edge | Candid moments from that event |
| Gallery page | 12–20 to start | ~1200px long edge | Mix of portrait/landscape, group shots, cultural activities |
| Testimonials | 1 per quoted person (optional) | ~200×200, circular crop | Friendly headshot; quotes work without one too |

## 8. Confirmations, newsletter & security notes

- Every RSVP or ticket purchase triggers a Resend confirmation email with
  event details (and Mercado Pago receipt info for paid tickets — the PEN
  amount actually charged, plus the USD reference figure if the buyer is an
  exchange student).
- A simple newsletter signup (email only) stores rows in
  `newsletter_subscribers`. No campaign-sending tool is included in this
  build — the list is there for the org to use later (e.g. export and send
  manually via Resend broadcasts or another tool).
- **Security notes (attendee accounts):**
  - Authentication is standard email + password via Supabase Auth (passwords
    hashed, never stored in plaintext).
  - DNI/ID is stored purely as profile data — it is **never** used as a
    credential. A national ID is not secret (it appears on documents and in
    other systems), so using it as a password would let anyone who knows or
    guesses someone's DNI log into their account; this design avoids that.
  - Nationality-based pricing is self-declared at signup (honor system, no
    document verification) and resolved server-side per request — the
    non-applicable price is never transmitted to the browser.

## 9. Project location & repo

- Built inside `c:\Users\matid\BBUP\Lading`, which now has its own isolated
  git repository (separate from the pre-existing repo rooted at
  `C:\Users\matid`).
- Existing assets: `Lading/public/LOGO BBUP COLOR.png` (the official Best
  Buddy UP! logo — clean transparent version, supersedes the earlier rough
  screenshot) and `Lading/Paleta de colores/*.png` (9 committee color
  swatches) — used as the visual/color reference for the design system, see
  §6.

## 10. Payment gateway decision history

Culqi (the original §3 choice) turned out to require a RUC (business tax ID)
+ legal representative, which this informal student org doesn't have — not
known at the time it was chosen. Alternatives evaluated:

- **Mercado Pago (chosen):** individual "persona natural" signup with just
  DNI + a Peruvian bank account, no RUC. Public, documented, free Checkout
  Pro API. ~4% flat fee, same-day settlement. Its one real constraint —
  Peru's Checkout Pro only ever processes in PEN, even for international
  cards — is fully accounted for in §3/§4/§5 (USD is now a display-only
  reference price for exchange students, converted to PEN at charge time
  via the daily-updated `exchange_rates` table).
- **PayPal:** personal account also needs only an ID, no RUC, and does
  settle in real USD. Ruled out on cost/practicality: ~5.4% + $0.30 per
  transaction domestically, **+1.5% more** cross-border (so up to ~6.9%);
  withdrawal to a Peruvian bank takes up to 7 business days and PayPal's own
  USD→PEN conversion runs 3-5% below market rate on top of a withdrawal
  fee; Peruvian buyers would also need a USD-based PayPal balance, a
  rougher experience than paying directly in soles.

The codebase's existing Culqi integration (checkout button, charge route,
webhook) should be removed/replaced with Mercado Pago's Checkout Pro
equivalents.

## 11. Open items for later (not blocking this build)

- **Mercado Pago merchant account** — user needs to create one (persona
  natural, DNI + bank account, no RUC — see §10) and supply real API
  credentials; sandbox/test credentials are enough to build/test against.
- **BCRP exchange-rate API series code** — confirm the exact endpoint/series
  ID for the daily USD/PEN rate against BCRP's own documentation at
  implementation time (see §5); don't hardcode a guessed series code.
- Domain name — user will purchase once the site is finished; deploy to
  Vercel's default subdomain in the meantime.
- Real content (team bios, event copy, testimonial quotes, photos) — to be
  supplied by the user per the checklist in §7; placeholders used until then.
