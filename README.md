# Best Buddy UP!

Website for Best Buddy UP!, a Peruvian student organization that integrates
exchange students into Peruvian culture — informational site, event
RSVP/ticketing with nationality-gated pricing, and an organizer admin panel.
Single Next.js (App Router) project: frontend, backend (Route Handlers /
Server Actions), and admin panel all live in one codebase, backed by
Supabase (Postgres + Auth) and Mercado Pago for payments.

Full requirements: `docs/superpowers/specs/2026-08-25-best-buddy-up-website-design.md`
(§10 documents why Mercado Pago was chosen over Culqi — Culqi needs a RUC
business tax ID this informal student org doesn't have).
Design system: `design-system/best-buddy-up/MASTER.md`.

## Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database + Auth:** Supabase (Postgres, Row Level Security, Supabase Auth)
- **Payments:** Mercado Pago Checkout Pro (hosted payment page, sandbox/test mode)
- **Email:** Resend (transactional confirmations)
- **Animation:** Framer Motion (scroll-reveal, modal spring transitions)
- **Hosting:** Vercel (including a daily Cron Job for exchange rates)

## Getting started locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql` then
   `supabase/migrations/0002_mercadopago_and_exchange_rates.sql`, then
   `supabase/migrations/0003_event_companions_and_offers.sql` in order
   (schema, RLS policies, the `admin_registrants` view, the `exchange_rates`
   table).
3. **Expose the `pagina_web` schema.** All app tables live in a custom
   `pagina_web` schema, not the default `public` one — Supabase only
   exposes `public`/`graphql_public` to the API by default. Go to
   **Project Settings → API → Data API settings → Exposed schemas** and add
   `pagina_web`. Skipping this step means every query from the app fails
   with a PostgREST error, even though the tables exist and the migration
   ran cleanly — the two migrations already handle the *other* non-public-schema
   gotcha (PostgREST grants) for you, but this one is dashboard-only and
   can't be scripted.
4. Optionally run `supabase/seed.sql` for sample events *and* a starter
   exchange rate, so the site isn't empty — and non-Peruvian ticket
   checkout actually works — while developing.
5. Copy `.env.example` to `.env.local` and fill in the three Supabase
   values from **Project Settings → API**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Create your first admin (organizer) account

The `/admin` panel is restricted to a manually-curated allow-list — there's
no self-service admin signup by design (spec §5).

1. Sign up for a normal attendee account at `/signup` with the email you
   want to use as an organizer.
2. In the Supabase SQL editor, find that user's id in `auth.users`, then run:
   ```sql
   insert into pagina_web.admins (user_id) values ('<that-uuid>');
   ```
3. Log in at `/admin/login` with the same email/password.

### 4. Mercado Pago (payments)

The user hasn't created a Mercado Pago merchant account yet (spec §10/§11) —
the integration is built against Mercado Pago's documented Checkout Pro flow
(verified against the installed `mercadopago` npm SDK's own type
definitions, not guessed) so real keys drop in later with zero code changes:

1. Sign up at [mercadopago.com.pe](https://www.mercadopago.com.pe) as an
   individual ("persona natural") — needs only a DNI and a Peruvian bank
   account, no RUC.
2. In **Tus integraciones**, create an application and grab the **test**
   credentials: public key and access token.
3. Set `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` and `MERCADOPAGO_ACCESS_TOKEN`
   in `.env.local`.
4. Under the same application's **Webhooks** section, register
   `https://<your-domain>/api/mercadopago/webhook` (a real, publicly
   reachable HTTPS URL — see the note on `NEXT_PUBLIC_SITE_URL` below) and
   copy the **secret signature** into `MERCADOPAGO_WEBHOOK_SECRET`.
5. Swap in production credentials later by changing the env vars only — no
   code changes.

**Important — Checkout Pro is a hosted redirect, not an embedded widget.**
Unlike the earlier Culqi integration (an in-page modal), Mercado Pago sends
the buyer to a page it hosts, then redirects back to `/checkout/return`.
That means `NEXT_PUBLIC_SITE_URL` (and the webhook URL above) must be a
real, publicly reachable HTTPS URL to test an actual end-to-end payment —
`localhost` won't work for that specific flow. Use a tunnel (e.g. `ngrok
http 3000` and set `NEXT_PUBLIC_SITE_URL` to the ngrok URL for the
session) or test against a Vercel preview deployment.

**Currency constraint (spec §3/§4/§5):** Peru's Checkout Pro only ever
charges in PEN, even for international cards — the card network/issuing
bank converts on the buyer's side, same mechanism as Airbnb/Netflix, but
the amount Mercado Pago itself processes is always soles. So
`events.price_usd` is a **display-only** reference price for exchange
students; the actual charge is always `events.price_pen` (Peruvian buyers)
or `events.price_usd × current exchange rate` rounded to 2 decimals
(everyone else). See "Exchange rates" below for where that rate comes from.

### 5. Exchange rates (BCRP daily cron)

A Vercel Cron Job (`vercel.json`, `0 8 * * *` — 08:00 UTC / ~03:00 Lima
time) hits `GET /api/cron/exchange-rate` once a day, which pulls Peru's
official USD/PEN rate from BCRP's (Banco Central de Reserva del Perú)
public statistics API — series `PD04640PD` ("TC Sistema bancario SBS,
venta"), confirmed directly against
[estadisticas.bcrp.gob.pe](https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04640PD/html)
rather than guessed — and writes a new `exchange_rates` row.

- Set `CRON_SECRET` in both `.env.local` and your Vercel project's env
  vars — Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
  when it invokes a scheduled Cron Job, and the route checks it.
- Cron Jobs only run on deployed Vercel environments, not `next dev` — for
  local testing, hit `http://localhost:3000/api/cron/exchange-rate`
  directly with that same header, or just run `supabase/seed.sql`'s
  starter rate.
- If the BCRP fetch ever fails, the previous rate stays in effect
  (checkout never breaks because the cron job had a bad day) — the admin
  dashboard flags the rate as stale after 48 hours and an organizer can set
  one by hand there as a fallback (spec §5, §11).

### 6. Resend (email)

1. Sign up at [resend.com](https://resend.com) (free tier).
2. Set `RESEND_API_KEY`. Until you verify a sending domain, `RESEND_FROM_EMAIL`
   can stay as the Resend sandbox sender (`onboarding@resend.dev`).
3. Until a real key is set, email sending fails soft (logs a warning,
   doesn't break RSVP/ticket flows) — see `src/lib/resend.ts`.

### 7. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Other scripts

```bash
npm run build        # production build
npm run start         # run the production build
npm run lint           # ESLint
npm run typecheck    # tsc --noEmit
npm run placeholders  # regenerate the SVG placeholder images in public/images
```

## Deploying to Vercel

1. Push this repo to GitHub/GitLab and import it in Vercel.
2. Add all of the env vars from `.env.example` in the Vercel project's
   Environment Variables settings (same values as `.env.local`, but with
   real Mercado Pago production credentials once the merchant account
   exists, and `NEXT_PUBLIC_SITE_URL` set to the real deployed domain).
3. `vercel.json`'s `crons` entry is picked up automatically on deploy — no
   extra setup beyond setting `CRON_SECRET`.
4. Deploy. No domain yet (spec §3, §10) — ship on the Vercel-provided
   subdomain until the user buys one.

## Architecture notes

- **Nationality-gated pricing (spec §5, §8) is the one hard security
  requirement in this build.** `src/lib/pricing.ts#resolvePriceForNationality`
  is the single choke point that turns `(nationality, event, exchangeRate)`
  into exactly one `ResolvedPrice` — always a real PEN charge amount, plus
  a USD reference figure *only* for non-Peruvian buyers. Every path that
  can reach the browser — `src/lib/db/events.ts#toPublicEvent`, the
  `createTicketIntent` Server Action, the Mercado Pago preference it
  creates — passes through it and only ever forwards the one resolved
  price for the current viewer. Verify this by inspecting the actual
  Server Component payload / Network tab response for a given user, not
  just what renders on screen.
- **DNI/ID is profile data, never a credential** (spec §8). Attendee auth
  is Supabase Auth email+password; `dni_id` is a plain column on
  `profiles`, written once at signup and never read by anything
  auth-related.
- **Card data never touches this server.** Mercado Pago's Checkout Pro is a
  page *it* hosts — the buyer is redirected there, enters card details on
  Mercado Pago's own domain, and is redirected back. Our server never
  handles card numbers, only a `preference` (what's being sold, for how
  much) beforehand and a `payment` status lookup afterward.
- **Payment confirmation is webhook-driven, not redirect-driven.**
  `/checkout/return` (where Mercado Pago redirects the buyer) reads its own
  query params for display purposes only — the actual `payment_status`
  update happens in `/api/mercadopago/webhook`, which verifies the
  `x-signature` HMAC before trusting anything (see the SDK's
  `WebhookSignatureValidator`). A buyer closing the tab before the redirect
  completes still gets a correctly-marked ticket once the webhook lands.
- **Authorization is checked at the action, not just the route.** Admin
  Server Actions (`src/lib/actions/admin.ts`) each re-check
  `isCurrentUserAdmin()` themselves — `middleware.ts` blocks navigation to
  `/admin/*`, but a forged direct call to a Server Action wouldn't go
  through the middleware, so the check has to live at that boundary too.
  Similarly, the webhook route only trusts a payment's `external_reference`
  after signature verification, and `/checkout/return` only shows
  registration details to the profile that owns them (IDOR guard against a
  guessed `registration_id`).
- **Every write path is Zod-validated server-side** (`src/lib/validation/schemas.ts`)
  regardless of what the form already validates client-side.

## Known limitations / next steps

- Capacity checks (`registrations` count vs `events.capacity`) are
  best-effort, not transactional — a burst of simultaneous signups right at
  the last spot could theoretically slightly overbook. Low-risk for this
  org's scale; revisit with a Postgres advisory lock or a `capacity`
  check constraint + retry if it ever matters.
- The BCRP series choice (`PD04640PD`, the banking-system *selling* rate)
  is a reasonable, verified default for "the official reference rate," but
  worth a deliberate look if the org ever wants to fine-tune margin on
  exchange-student tickets (e.g. buy vs. sell vs. mid-market rate).
- All imagery is a clearly-labeled, correctly-sized SVG placeholder
  (`npm run placeholders` regenerates them) — swap for real photos per the
  shot list in the spec (§7) whenever they're available; component code
  doesn't need to change, just the files under `public/images/`.
- Team members and testimonials are static content in `src/lib/content.ts`
  (the spec's data model has no DB table for them) — edit that file
  directly until/unless that needs to move into Supabase.

## Event configuration and +1 purchases

Apply migration `0003_event_companions_and_offers.sql` before running this version.
In `/admin`, choose **Editar configuracion** to edit an existing event. Creation
and editing share the same form, including the +1 switch and the **Promociones**
and **Descuentos** text fields. These texts are displayed in the public event
modal; they do not automatically change checkout prices or expire on a schedule.

Paid events can optionally allow a named companion. Both first and last name are
required. The buyer pays two entries at their own profile's unit price (including
the same USD-to-PEN conversion when applicable). One registration stores the two
attendees and the total charge, so Mercado Pago settles both together. Capacity,
admin counts, account details and receipts include the companion. Existing
registrations remain one entry; existing events disable +1 by default.

The migration serializes new reservations per event to prevent concurrent
purchases exceeding capacity. Pending bookings reserve seats, as before. Free
RSVPs continue to register one person.
