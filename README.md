# Best Buddy UP!

Website for Best Buddy UP!, a Peruvian student organization that integrates
exchange students into Peruvian culture — informational site, event
RSVP/ticketing with nationality-gated pricing, and an organizer admin panel.
Single Next.js (App Router) project: frontend, backend (Route Handlers /
Server Actions), and admin panel all live in one codebase, backed by
Supabase (Postgres + Auth) and Culqi for payments.

Full requirements: `docs/superpowers/specs/2026-08-25-best-buddy-up-website-design.md`.
Design system: `design-system/best-buddy-up/MASTER.md`.

## Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database + Auth:** Supabase (Postgres, Row Level Security, Supabase Auth)
- **Payments:** Culqi hosted Checkout widget (sandbox/test mode)
- **Email:** Resend (transactional confirmations)
- **Animation:** Framer Motion (scroll-reveal, modal spring transitions)
- **Hosting:** Vercel

## Getting started locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql` (schema, RLS
   policies, the `admin_registrants` view).
3. Optionally run `supabase/seed.sql` for sample events so the site isn't
   empty while developing.
4. Copy `.env.example` to `.env.local` and fill in the three Supabase
   values from **Project Settings → API**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Create your first admin (organizer) account

The `/admin` panel is restricted to a manually-curated allow-list — there's
no self-service admin signup by design (spec §5).

1. Sign up for a normal attendee account at `/signup` with the email you
   want to use as an organizer.
2. In the Supabase SQL editor, find that user's id in `auth.users`, then run:
   ```sql
   insert into public.admins (user_id) values ('<that-uuid>');
   ```
3. Log in at `/admin/login` with the same email/password.

### 4. Culqi (payments)

The user hasn't created a Culqi merchant account yet — the integration is
built against Culqi's documented sandbox flow so real keys drop in later
with zero code changes:

1. Sign up at [Culqi](https://culqi.com) (free, no monthly fee) and grab
   your **test** public/secret keys from the dashboard.
2. Set `NEXT_PUBLIC_CULQI_PUBLIC_KEY` and `CULQI_SECRET_KEY` in `.env.local`.
3. Optionally register a webhook URL (`/api/culqi/webhook?secret=...`) as a
   backstop to the synchronous charge confirmation — see the `VERIFICAR`
   comment in `src/app/api/culqi/webhook/route.ts` before relying on it in
   production; Culqi's exact webhook payload/signing scheme should be
   re-checked against current docs at that point.
4. Swap in live keys later by changing the env vars only — no code changes.

### 5. Resend (email)

1. Sign up at [resend.com](https://resend.com) (free tier).
2. Set `RESEND_API_KEY`. Until you verify a sending domain, `RESEND_FROM_EMAIL`
   can stay as the Resend sandbox sender (`onboarding@resend.dev`).
3. Until a real key is set, email sending fails soft (logs a warning,
   doesn't break RSVP/ticket flows) — see `src/lib/resend.ts`.

### 6. Run it

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
   Environment Variables settings (same values as `.env.local`).
3. Deploy. No domain yet (spec §3, §10) — ship on the Vercel-provided
   subdomain until the user buys one.

## Architecture notes

- **Nationality-gated pricing (spec §5, §8) is the one hard security
  requirement in this build.** `src/lib/pricing.ts` is the single choke
  point that turns `(nationality, event)` into exactly one
  `{ amount, currency }` pair. Every path that can reach the browser —
  `src/lib/db/events.ts#toPublicEvent`, the `createTicketIntent` Server
  Action, `/api/culqi/charge` — passes through it and only ever forwards
  the one resolved price. Verify this by inspecting the actual Server
  Component payload / Network tab response for a given user, not just
  what renders on screen.
- **DNI/ID is profile data, never a credential** (spec §8). Attendee auth
  is Supabase Auth email+password; `dni_id` is a plain column on
  `profiles`, written once at signup and never read by anything
  auth-related.
- **Card data never touches this server.** Culqi's hosted Checkout widget
  collects card details in its own iframe; the browser only ever hands our
  server a short-lived `token.id`, exchanged server-side for a charge using
  the secret key.
- **Authorization is checked at the action, not just the route.** Admin
  Server Actions (`src/lib/actions/admin.ts`) each re-check
  `isCurrentUserAdmin()` themselves — `middleware.ts` blocks navigation to
  `/admin/*`, but a forged direct call to a Server Action wouldn't go
  through the middleware, so the check has to live at that boundary too.
  Similarly, `/api/culqi/charge` verifies the registration's `profile_id`
  matches the caller before charging (IDOR guard).
- **Every write path is Zod-validated server-side** (`src/lib/validation/schemas.ts`)
  regardless of what the form already validates client-side.

## Known limitations / next steps

- Capacity checks (`registrations` count vs `events.capacity`) are
  best-effort, not transactional — a burst of simultaneous signups right at
  the last spot could theoretically slightly overbook. Low-risk for this
  org's scale; revisit with a Postgres advisory lock or a `capacity`
  check constraint + retry if it ever matters.
- The Culqi webhook auth scheme (shared-secret query param) is a pragmatic
  placeholder — see the `VERIFICAR` note in
  `src/app/api/culqi/webhook/route.ts`. Re-verify against Culqi's current
  docs before depending on it as more than a backstop to the synchronous
  charge confirmation.
- All imagery is a clearly-labeled, correctly-sized SVG placeholder
  (`npm run placeholders` regenerates them) — swap for real photos per the
  shot list in the spec (§7) whenever they're available; component code
  doesn't need to change, just the files under `public/images/`.
- Team members and testimonials are static content in `src/lib/content.ts`
  (the spec's data model has no DB table for them) — edit that file
  directly until/unless that needs to move into Supabase.
