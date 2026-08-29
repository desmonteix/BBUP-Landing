-- Sample events for local development / demoing the site before real
-- content exists. Safe to run repeatedly (upserts on slug). Not part of
-- the schema migration on purpose — this is demo data, not structure.
--
-- Run after 0001_init.sql and 0002_mercadopago_and_exchange_rates.sql,
-- e.g.:
--   supabase db execute -f supabase/seed.sql
-- or paste into the Supabase SQL editor.
--
-- To make yourself an organizer admin after signing up once through the
-- site (so you can log into /admin), run:
--   insert into pagina_web.admins (user_id)
--   values ('<uuid from auth.users for your account>');

-- Seed an initial exchange rate so non-Peruvian buyers can check out for
-- paid events immediately in local dev, before the daily BCRP cron has
-- ever run (see src/app/api/cron/exchange-rate/route.ts). Real deployments
-- get this from the cron job instead — this row is purely a local-dev
-- convenience, not a value to trust.
insert into pagina_web.exchange_rates (rate, source)
values (3.75, 'manual_override');

-- Past events changed since this seed was first written — clean up the old
-- slugs/rows so re-running this file against an already-seeded local DB
-- doesn't leave stale rows or stale cover_image paths sitting around:
--   cusco-day-trip, farewell-fiesta -> welcome-party, huacachina-trip,
--     pichangas, international-dinner
--   international-dinner -> barranco-city-tour (renamed)
--   welcome-party/huacachina-trip/pichangas -> re-inserted with real
--     uploaded photo paths instead of SVG placeholders
--
-- The 4 upcoming demo events (welcome-mixer, peruvian-cooking-night,
-- salsa-social, beach-day-punta-hermosa) were placeholder/demo content and
-- are intentionally no longer seeded — the site should honestly show
-- "nothing on the calendar right now" until an organizer creates a real
-- event via /admin, rather than displaying fake upcoming events.
delete from pagina_web.events where slug in (
  'cusco-day-trip', 'farewell-fiesta', 'international-dinner',
  'welcome-party', 'huacachina-trip', 'pichangas',
  'welcome-mixer', 'peruvian-cooking-night', 'salsa-social',
  'beach-day-punta-hermosa'
);

insert into pagina_web.events
  (slug, title, description, cover_image, event_date, location, type, price_pen, price_usd, capacity, status, category)
values
  (
    'welcome-party',
    'Welcome Party',
    'The one that kicks off every semester — the whole crowd, old buddies and brand-new exchange students, in one room on night one. This is where most friendships here actually start.',
    '/images/events/welcome-party.jpg',
    now() - interval '55 days',
    'Parque Kennedy, Miraflores',
    'free',
    null,
    null,
    120,
    'closed',
    'Events'
  ),
  (
    'huacachina-trip',
    'Huacachina Trip',
    'Our flagship trip: a weekend at the desert oasis outside Ica — dune buggy rides, sandboarding until your legs give out, and a sunset that everyone ends up photographing from the same dune.',
    '/images/events/huacachina-trip.jpg',
    now() - interval '42 days',
    'Huacachina, Ica',
    'paid',
    180.00,
    55.00,
    35,
    'closed',
    'Trips'
  ),
  (
    'pichangas',
    'Pichangas',
    'Casual pickup fútbol, Peruvian-style — mixed teams, no skill requirement, plenty of subs. Show up in whatever sneakers you have; nobody here is taking it that seriously.',
    '/images/events/pichangas.jpg',
    now() - interval '28 days',
    'Complejo Deportivo, San Borja',
    'free',
    null,
    null,
    null,
    'closed',
    'Sports'
  ),
  (
    'barranco-city-tour',
    'Barranco City Tour',
    'A walking tour through Lima''s most bohemian district — street art, the Bridge of Sighs, and a stop at the local craft shops — led by a buddy who actually grew up wandering these streets.',
    '/images/events/barranco-city-tour.jpg',
    now() - interval '14 days',
    'Barranco, Lima',
    'free',
    null,
    null,
    50,
    'closed',
    'S&C'
  )
on conflict (slug) do nothing;
