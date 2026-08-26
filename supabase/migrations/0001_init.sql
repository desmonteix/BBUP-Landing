-- Best Buddy UP! — initial schema
-- Run via `supabase db push` or paste into the Supabase SQL editor.
-- Idempotent-ish: uses IF NOT EXISTS / OR REPLACE where practical, but this
-- is a first migration and expected to run once against a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per attendee account (Supabase Auth user). DNI/ID is
-- plain profile data — NEVER used as a credential (see spec §8).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  dni_id        text not null,
  nationality   text not null,
  email         text not null,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: self select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: self insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: self update"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text not null,
  cover_image   text,
  event_date    timestamptz not null,
  location      text not null,
  type          text not null check (type in ('free', 'paid')),
  price_pen     numeric(10, 2),
  price_usd     numeric(10, 2),
  capacity      integer,
  status        text not null default 'open' check (status in ('open', 'closed')),
  category      text not null check (category in (
                  'Events', 'Finance', 'Legal', 'Merch', 'S&C',
                  'Social Media', 'Sports', 'Tandem', 'Trips'
                )),
  created_at    timestamptz not null default now(),
  constraint paid_events_have_prices check (
    type = 'free' or (price_pen is not null and price_usd is not null)
  )
);

alter table public.events enable row level security;

-- Public can read events (needed for the public /events grid). Price columns
-- are still selectable at the DB layer — the application layer (Server
-- Components / route handlers) is responsible for never forwarding both
-- price_pen and price_usd to a client response. RLS protects rows, not
-- columns; column-level exposure is enforced in the app, see
-- src/lib/pricing.ts and src/lib/db/events.ts.
create policy "events: public read"
  on public.events for select
  using (true);

create policy "events: admin write"
  on public.events for all
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  profile_id        uuid references public.profiles (id) on delete set null,
  name              text not null,
  email             text not null,
  phone             text,
  kind              text not null check (kind in ('rsvp', 'ticket')),
  currency          text check (currency in ('PEN', 'USD')),
  amount            numeric(10, 2),
  payment_status    text not null default 'n/a' check (payment_status in ('n/a', 'pending', 'paid', 'failed')),
  culqi_charge_id   text,
  created_at        timestamptz not null default now(),
  constraint tickets_have_currency_amount check (
    kind = 'rsvp' or (currency is not null and amount is not null)
  )
);

create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists registrations_profile_id_idx on public.registrations (profile_id);
-- Idempotency guard for Culqi webhook/charge handling: a charge id is only
-- ever attached to one registration.
create unique index if not exists registrations_culqi_charge_id_uidx
  on public.registrations (culqi_charge_id)
  where culqi_charge_id is not null;

alter table public.registrations enable row level security;

-- Anonymous free RSVPs are inserted via a server route using the service
-- role (bypasses RLS) so no public insert policy is required for the
-- anon/authenticated roles; this keeps write paths funneled through
-- server-validated Server Actions instead of open client inserts.
create policy "registrations: self select"
  on public.registrations for select
  using (profile_id is not null and profile_id = auth.uid());

create policy "registrations: admin all"
  on public.registrations for all
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- admins: organizer allow-list, separate from attendee `profiles`.
-- Seed manually after creating an organizer's Supabase Auth user, e.g.:
--   insert into public.admins (user_id) values ('<uuid-of-organizer-auth-user>');
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins: self select"
  on public.admins for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  created_at    timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy "newsletter: admin read"
  on public.newsletter_subscribers for select
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Inserts go through a server route using the service role, so no public
-- insert policy is needed (keeps the table effectively write-only via a
-- validated server path, readable only by admins).

-- ---------------------------------------------------------------------------
-- helper view for admin registrant tables: joins profile nationality
-- ---------------------------------------------------------------------------
create or replace view public.admin_registrants as
  select
    r.id,
    r.event_id,
    r.profile_id,
    r.name,
    r.email,
    r.phone,
    r.kind,
    r.currency,
    r.amount,
    r.payment_status,
    r.culqi_charge_id,
    r.created_at,
    p.nationality
  from public.registrations r
  left join public.profiles p on p.id = r.profile_id;

alter view public.admin_registrants set (security_invoker = true);
