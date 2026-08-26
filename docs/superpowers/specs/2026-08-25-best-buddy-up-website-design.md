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
- Let organizers manage events and see who registered, without touching code.
- Feel warm, premium, and elegant — with animations that stay smooth on any
  device.
- Be entirely in Spanish.

Inspiration reference: [ebnwu.com](https://www.ebnwu.com/) (Erasmus Buddy
Network, WU Vienna) — informal warm hero greeting, a short "who we are" blurb
on the home page leading into a full About page, and a newsletter capture
block. Structure and tone borrowed loosely; visuals are our own (built from
the Best Buddy UP! logo).

## 2. Explicit non-goals

Out of scope for this build (can be revisited later):

- Applications or matching for "become a buddy" / "apply as exchange student"
  — this site is informational + event ticketing only.
- User accounts / login for attendees (only organizers log in, via `/admin`).
- Multi-language toggle (Spanish only, by explicit instruction).
- Blog/CMS.
- Newsletter *sending* (campaigns) — only capturing emails, see §7.

## 3. Architecture

Single Next.js (App Router) project — no separate Vite app, no Python
service. One codebase serves the public site, the admin panel, and the
backend (API routes / Server Actions).

- **Frontend + backend:** Next.js (App Router), TypeScript.
- **Database + auth:** Supabase (Postgres + Supabase Auth for the small
  number of organizer admin accounts).
- **Hosting:** Vercel.
- **Payments:** Culqi (Peru-native gateway).
  - No monthly/maintenance fee, free signup.
  - Public REST API with docs + sandbox: https://apidocs.culqi.com/
  - Domestic cards / Yape / Plin: ~3.44% + IGV. International cards:
    ~3.99% + IGV.
  - Culqi settles in PEN or USD only (no direct EUR/GBP). Tickets are priced
    in **USD**; international cards (any currency) work automatically
    because the *card network / issuing bank* — not Culqi — converts the
    student's home currency to USD at charge time. Same mechanism Airbnb/
    Netflix rely on. Culqi's own conversion claims apply to PEN↔USD only.
  - Integration uses Culqi's hosted Checkout widget so card data never
    touches our server (minimizes PCI scope).
- **Transactional email:** Resend (free tier) for RSVP/ticket confirmations.
- **Domain:** none yet — user will purchase a domain once the site is
  finished; ship on the Vercel-provided subdomain until then.

## 4. Data model (Supabase / Postgres)

```
events
  id            uuid pk
  slug          text unique
  title         text
  description   text (rich enough for formatting, markdown or simple HTML)
  cover_image   text (Supabase Storage path/URL)
  event_date    timestamptz
  location      text
  type          enum('free', 'paid')
  price_usd     numeric, nullable (required if type = 'paid')
  capacity      integer, nullable (null = unlimited)
  status        enum('open', 'closed')
  created_at    timestamptz

registrations
  id                uuid pk
  event_id          uuid fk -> events
  name              text
  email             text
  phone             text, nullable
  kind              enum('rsvp', 'ticket')   -- rsvp = free, ticket = paid
  payment_status    enum('n/a', 'pending', 'paid', 'failed')
  culqi_charge_id   text, nullable
  created_at        timestamptz

admins
  -- backed by Supabase Auth users; a table (or just Auth metadata) marking
  -- which auth users are allowed into /admin

newsletter_subscribers
  id            uuid pk
  email         text unique
  created_at    timestamptz
```

## 5. Pages & user flows

- **Home (`/`)** — hero (animated logo/gradient treatment, warm Spanish
  greeting in the spirit of EBN WU's "Servus 👋", mission statement), quick
  "Quiénes somos" blurb linking to the full About page, teaser of the next
  upcoming event, featured testimonial quotes, newsletter signup block.
- **Nosotros (`/nosotros`)** — full mission/story, values, team grid (photo +
  name + role), fuller set of testimonial quote cards.
- **Eventos (`/eventos`)** — grid of upcoming events (free badge or USD price
  shown on each card) and a separate/collapsed section for past events.
  Clicking a card opens the **event detail in-page** (modal / expandable
  panel) — **not** a separate route per event. The detail view shows the full
  description, date, location, and:
  - **Free event:** short RSVP form (name, email, phone optional) → on
    submit, writes a `registrations` row (`kind='rsvp'`), shows an in-page
    confirmation, and triggers a confirmation email via Resend.
  - **Paid event:** same form collects name/email/phone, then redirects into
    Culqi's hosted Checkout for the event's USD price → on success, a
    webhook marks the `registrations` row `payment_status='paid'` and stores
    `culqi_charge_id` → confirmation/receipt email via Resend. On failure,
    the row stays `failed`/`pending` and the user sees a retry option.
- **Galería** — responsive photo grid/lightbox, section reachable from nav,
  images from past events (see §7 asset checklist).
- **Testimonios** — no dedicated page/route; lives as sections within Home
  (short, featured) and Nosotros (fuller set).
- **Footer** (site-wide) — contact info, Instagram/TikTok/WhatsApp links,
  newsletter signup (if not already on Home).
- **Admin (`/admin`)** — Supabase-Auth-gated login. Event list with
  create/edit (title, description, date, location, cover image, free/paid +
  price, capacity, open/closed toggle) and, per event, a registrant table
  (name, email, phone, payment status).

## 6. Visual design & animation

- **Palette:** drawn from the Best Buddy UP! logo — magenta/pink → sky-blue
  gradient, white, and a neutral dark (near-black or deep plum) for text.
  Gradient used as an accent (buttons, dividers, background blobs), not as a
  full-bleed background everywhere — keeps it feeling premium rather than
  purely playful.
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
| Team (Nosotros) | 1 per team member | ~800×800, square | Consistent headshot style/background |
| Event cover | 1 per event | 1200×675 (16:9) | Represents that specific event |
| Event gallery (per past event) | 3–6 | ~1200px long edge | Candid moments from that event |
| Galería page | 12–20 to start | ~1200px long edge | Mix of portrait/landscape, group shots, cultural activities |
| Testimonials | 1 per quoted person (optional) | ~200×200, circular crop | Friendly headshot; quotes work without one too |

## 8. Confirmations & newsletter

- Every RSVP or ticket purchase triggers a Resend confirmation email with
  event details (and Culqi receipt info for paid tickets).
- A simple newsletter signup (email only) stores rows in
  `newsletter_subscribers`. No campaign-sending tool is included in this
  build — the list is there for the org to use later (e.g. export and send
  manually via Resend broadcasts or another tool).

## 9. Project location & repo

- Built inside `c:\Users\matid\BBUP\Lading`, which now has its own isolated
  git repository (separate from the pre-existing repo rooted at
  `C:\Users\matid`).
- Existing asset: `Lading/Captura de pantalla 2026-08-20 100901.png` (the
  Best Buddy UP! logo) — used as the visual/color reference for the design
  system.

## 10. Open items for later (not blocking this build)

- Domain name — user will purchase once the site is finished; deploy to
  Vercel's default subdomain in the meantime.
- Culqi merchant account — user needs to create one and provide API keys
  (sandbox keys are enough to build/test against).
- Real content (team bios, event copy, testimonial quotes, photos) — to be
  supplied by the user per the checklist in §7; placeholders used until then.
