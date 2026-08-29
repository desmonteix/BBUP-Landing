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
create table if not exists pagina_web.exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  rate          numeric(10, 4) not null check (rate > 0),
  source        text not null check (source in ('bcrp_auto', 'manual_override')),
  updated_at    timestamptz not null default now()
);

-- Read pattern is always "latest row" — index supports that without a
-- table scan as the table grows (one row/day indefinitely).
create index if not exists exchange_rates_updated_at_idx
  on pagina_web.exchange_rates (updated_at desc);

alter table pagina_web.exchange_rates enable row level security;

-- No public policy: every reader in the app is server-side (pricing
-- resolution, the admin panel, the BCRP cron writer) and uses the
-- service-role client, which bypasses RLS. Keeping this admin-only avoids
-- exposing "how we price things" as an open table, even though the rate
-- itself is public information.
create policy "exchange_rates: admin read"
  on pagina_web.exchange_rates for select
  using (exists (select 1 from pagina_web.admins a where a.user_id = auth.uid()));

create policy "exchange_rates: admin write"
  on pagina_web.exchange_rates for insert
  with check (exists (select 1 from pagina_web.admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- registrations: Culqi columns -> Mercado Pago columns
-- ---------------------------------------------------------------------------
-- Must drop first: it depends on the currency/amount/culqi_charge_id
-- columns being replaced below, and Postgres won't drop a column a view
-- still depends on. Recreated with the new columns further down.
drop view if exists pagina_web.admin_registrants;

alter table pagina_web.registrations
  drop constraint if exists tickets_have_currency_amount;

alter table pagina_web.registrations
  add column if not exists amount_pen numeric(10, 2),
  add column if not exists display_price_usd numeric(10, 2),
  add column if not exists exchange_rate_applied numeric(10, 4),
  add column if not exists mercadopago_payment_id text;

alter table pagina_web.registrations
  drop column if exists currency,
  drop column if exists amount,
  drop column if exists culqi_charge_id;

alter table pagina_web.registrations
  add constraint tickets_have_amount_pen check (
    kind = 'rsvp' or amount_pen is not null
  );

drop index if exists registrations_culqi_charge_id_uidx;

-- Idempotency guard for the Mercado Pago webhook, same role the old
-- culqi_charge_id unique index played: a given MP payment id is only ever
-- attached to one registration.
create unique index if not exists registrations_mercadopago_payment_id_uidx
  on pagina_web.registrations (mercadopago_payment_id)
  where mercadopago_payment_id is not null;

-- Recreate against the new column set (already dropped above, before the
-- column changes, since Postgres won't drop a column a view depends on).
create view pagina_web.admin_registrants as
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
  from pagina_web.registrations r
  left join pagina_web.profiles p on p.id = r.profile_id;

alter view pagina_web.admin_registrants set (security_invoker = true);

-- Re-grant to cover the new exchange_rates table and rebuilt view (see the
-- longer explanation in 0001_init.sql) — idempotent, safe to repeat.
grant usage on schema pagina_web to anon, authenticated, service_role;
grant all on all tables in schema pagina_web to anon, authenticated, service_role;
