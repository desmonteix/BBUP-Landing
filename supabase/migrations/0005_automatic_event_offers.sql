-- Executable offer rules; existing descriptions are preserved, not interpreted.
begin;
alter table pagina_web.events add column offer_rules jsonb not null default '{}'::jsonb;
alter table pagina_web.events add constraint event_offer_rules_object check (jsonb_typeof(offer_rules) = 'object');
alter table pagina_web.registrations add column pricing_snapshot jsonb;
comment on column pagina_web.events.offer_rules is 'Optional scheduled 2x1 promotion and percentage or fixed-PEN discount. Non-stacking: use the cheapest offer.';
comment on column pagina_web.registrations.pricing_snapshot is 'Original PEN subtotal, savings and selected offer at checkout. Existing payments are never repriced.';
commit;
