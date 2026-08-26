-- Sample events for local development / demoing the site before real
-- content exists. Safe to run repeatedly (upserts on slug). Not part of
-- the schema migration on purpose — this is demo data, not structure.
--
-- Run after 0001_init.sql, e.g.:
--   supabase db execute -f supabase/seed.sql
-- or paste into the Supabase SQL editor.
--
-- To make yourself an organizer admin after signing up once through the
-- site (so you can log into /admin), run:
--   insert into public.admins (user_id)
--   values ('<uuid from auth.users for your account>');

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
    'cusco-day-trip',
    'Cusco Weekend Trip',
    'Three days, two nights in Cusco: flights, hotel, a guided Sacsayhuamán tour, and a group dinner included. Machu Picchu entry available as an add-on at check-in.',
    '/images/events/cusco-day-trip.svg',
    now() - interval '20 days',
    'Cusco',
    'paid',
    350.00,
    110.00,
    25,
    'closed',
    'Trips'
  ),
  (
    'farewell-fiesta',
    'End of Semester Farewell Fiesta',
    'The bittersweet one — a rooftop party to send off the semester''s exchange students with the whole Best Buddy UP! crowd. Playlist submissions open the week before.',
    '/images/events/farewell-fiesta.svg',
    now() - interval '10 days',
    'Rooftop, San Isidro',
    'free',
    null,
    null,
    null,
    'closed',
    'Events'
  )
on conflict (slug) do nothing;
