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
--   insert into public.admins (user_id)
--   values ('<uuid from auth.users for your account>');

-- Seed an initial exchange rate so non-Peruvian buyers can check out for
-- paid events immediately in local dev, before the daily BCRP cron has
-- ever run (see src/app/api/cron/exchange-rate/route.ts). Real deployments
-- get this from the cron job instead — this row is purely a local-dev
-- convenience, not a value to trust.
insert into public.exchange_rates (rate, source)
values (3.75, 'manual_override');

-- Past events changed since this seed was first written — clean up the old
-- slugs/rows so re-running this file against an already-seeded local DB
-- doesn't leave stale rows or stale cover_image paths sitting around:
--   cusco-day-trip, farewell-fiesta -> welcome-party, huacachina-trip,
--     pichangas, international-dinner
--   international-dinner -> barranco-city-tour (renamed)
--   welcome-party/huacachina-trip/pichangas -> re-inserted with real
--     uploaded photo paths instead of SVG placeholders
delete from public.events where slug in (
  'cusco-day-trip', 'farewell-fiesta', 'international-dinner',
  'welcome-party', 'huacachina-trip', 'pichangas'
);

insert into public.events
  (slug, title, description, cover_image, event_date, location, type, price_pen, price_usd, capacity, status, category)
values
  (
    'welcome-mixer',
    'Welcome Mixer',
    'The easiest way to meet your first Best Buddy UP! crowd. No agenda beyond good food, name tags, and an icebreaker game nobody takes too seriously. Come solo — everyone here did.',
    '/images/events/welcome-mixer.svg',
    now() + interval '7 days',
    'Parque Kennedy, Miraflores',
    'free',
    null,
    null,
    80,
    'open',
    'Events'
  ),
  (
    'peruvian-cooking-night',
    'Peruvian Cooking Night: Ceviche & Lomo Saltado',
    'A hands-on class with a local chef — you''ll cook (and eat) ceviche and lomo saltado from scratch, in mixed teams of exchange students and buddies. All ingredients and an apron included.',
    '/images/events/peruvian-cooking-night.svg',
    now() + interval '14 days',
    'Cocina Comunitaria, Barranco',
    'paid',
    45.00,
    15.00,
    30,
    'open',
    'S&C'
  ),
  (
    'salsa-social',
    'Salsa & Tandem Social',
    'Half language exchange, half dance lesson. A local instructor teaches the basics for the first hour, then it''s an open dance floor. Spanish/English/everything-in-between encouraged.',
    '/images/events/salsa-social.svg',
    now() + interval '21 days',
    'Casa Tandem, Barranco',
    'free',
    null,
    null,
    null,
    'open',
    'Tandem'
  ),
  (
    'beach-day-punta-hermosa',
    'Beach Day — Punta Hermosa',
    'A full day at the beach an hour south of Lima: transport, a beginner surf lesson, and lunch included. Bring sunscreen, we bring the rest.',
    '/images/events/beach-day-punta-hermosa.svg',
    now() + interval '35 days',
    'Punta Hermosa (bus from Miraflores)',
    'paid',
    60.00,
    20.00,
    40,
    'open',
    'Sports'
  ),
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
