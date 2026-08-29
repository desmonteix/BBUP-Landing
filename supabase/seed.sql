-- Bootstrap data — safe to run repeatedly (upserts / idempotent). Not part
-- of the schema migration on purpose.
--
-- Run after 0001_init.sql and 0002_mercadopago_and_exchange_rates.sql, by
-- pasting into the Supabase SQL editor.
--
-- To make yourself an organizer admin after signing up once through the
-- site (so you can log into /admin), run:
--   insert into pagina_web.admins (user_id)
--   values ('<uuid from auth.users for your account>');
--
-- Note: the past-events showcase on /events ("Welcome Party", "Huacachina
-- Trip", "Pichangas", "Barranco City Tour") is intentionally NOT seeded
-- here — explicit direction was to keep those as static reference content
-- (src/lib/content.ts#PAST_EVENTS_SHOWCASE), not real Supabase rows. Real
-- events (upcoming or, once their date passes, past) are created via
-- /admin and live in pagina_web.events normally.

-- Seed an initial exchange rate so non-Peruvian buyers can check out for
-- paid events immediately, before the daily BCRP cron has ever run (see
-- src/app/api/cron/exchange-rate/route.ts). This is a real functional
-- fallback, not demo content — remove/update once the cron has run once.
insert into pagina_web.exchange_rates (rate, source)
values (3.75, 'manual_override');
