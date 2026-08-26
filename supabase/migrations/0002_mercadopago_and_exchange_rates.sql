-- Payment gateway rework: Culqi -> Mercado Pago (see spec §3/§4/§10).
-- Mercado Pago's Peru Checkout Pro only ever charges in PEN, even for
-- international cards — price_usd on `events` becomes a DISPLAY-only
-- reference for exchange-student buyers, converted to PEN at checkout time
-- via the new `exchange_rates` table. This migration:
--   1. Adds `exchange_rates` (daily BCRP-sourced rate, with a manual
--      override fallback for organizers).
--   2. Replaces registrations' Culqi-shaped columns (currency, amount,
--      culqi_charge_id) with Mercado Pago-shaped ones (amount_pen,
--      display_price_usd, exchange_rate_applied, mercadopago_payment_id).
--
-- Run after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- exchange_rates
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  rate          numeric(10, 4) not null check (rate > 0),
  source        text not null check (source in ('bcrp_auto', 'manual_override')),
  updated_at    timestamptz not null default now()
);

-- Read pattern is always "latest row" — index supports that without a
-- table scan as the table grows (one row/day indefinitely).
create index if not exists exchange_rates_updated_at_idx
  on public.exchange_rates (updated_at desc);

alter table public.exchange_rates enable row level security;

-- No public policy: every reader in the app is server-side (pricing
-- resolution, the admin panel, the BCRP cron writer) and uses the
-- service-role client, which bypasses RLS. Keeping this admin-only avoids
-- exposing "how we price things" as an open table, even though the rate
-- itself is public information.
create policy "exchange_rates: admin read"
  on public.exchange_rates for select
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "exchange_rates: admin write"
  on public.exchange_rates for insert
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- registrations: Culqi columns -> Mercado Pago columns
-- ---------------------------------------------------------------------------
alter table public.registrations
  drop constraint if exists tickets_have_currency_amount;

alter table public.registrations
  add column if not exists amount_pen numeric(10, 2),
  add column if not exists display_price_usd numeric(10, 2),
  add column if not exists exchange_rate_applied numeric(10, 4),
  add column if not exists mercadopago_payment_id text;

alter table public.registrations
  drop column if exists currency,
  drop column if exists amount,
  drop column if exists culqi_charge_id;

alter table public.registrations
  add constraint tickets_have_amount_pen check (
    kind = 'rsvp' or amount_pen is not null
  );

drop index if exists registrations_culqi_charge_id_uidx;

-- Idempotency guard for the Mercado Pago webhook, same role the old
-- culqi_charge_id unique index played: a given MP payment id is only ever
-- attached to one registration.
create unique index if not exists registrations_mercadopago_payment_id_uidx
  on public.registrations (mercadopago_payment_id)
  where mercadopago_payment_id is not null;

-- admin_registrants view references registrations.* by name via `select *`
-- through the underlying columns, so it picks up the new columns
-- automatically — but views in Postgres freeze their column list at
-- creation time, so it still needs an explicit recreate.
drop view if exists public.admin_registrants;

create view public.admin_registrants as
  select
    r.id,
    r.event_id,
    r.profile_id,
    r.name,
    r.email,
    r.phone,
    r.kind,
    r.amount_pen,
    r.display_price_usd,
    r.exchange_rate_applied,
    r.payment_status,
    r.mercadopago_payment_id,
    r.created_at,
    p.nationality
  from public.registrations r
  left join public.profiles p on p.id = r.profile_id;

alter view public.admin_registrants set (security_invoker = true);
