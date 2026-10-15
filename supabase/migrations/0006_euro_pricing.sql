-- Switch future event prices and purchases to EUR. Preserve historical USD receipts.
begin;
alter table pagina_web.events rename column price_usd to price_eur;
alter table pagina_web.registrations add column display_price_eur numeric(10, 2);
comment on column pagina_web.registrations.display_price_usd is 'Historical USD reference; new purchases use display_price_eur.';
-- Existing rates belong to USD; never reuse them for EUR checkout.
alter table pagina_web.exchange_rates
  add column base_currency text not null default 'USD'
  check (base_currency in ('USD', 'EUR'));
alter table pagina_web.exchange_rates alter column base_currency set default 'EUR';
create index exchange_rates_currency_updated_at_idx
  on pagina_web.exchange_rates (base_currency, updated_at desc);
-- Preserve configured numeric prices, changing their denomination to EUR.
update pagina_web.events
set offer_rules = jsonb_set(offer_rules, '{promotion,currency}', '"EUR"'::jsonb)
where offer_rules #>> '{promotion,currency}' = 'USD';
-- Append the new field so the historical view column and its grants survive.
create or replace view pagina_web.admin_registrants with (security_invoker = true) as
  select r.id, r.event_id, r.profile_id, r.name, r.email, r.phone, r.kind,
    r.amount_pen, r.display_price_usd, r.exchange_rate_applied,
    r.payment_status, r.mercadopago_payment_id, r.created_at, p.nationality,
    r.ticket_quantity, r.companion_first_name, r.companion_last_name,
    r.display_price_eur
  from pagina_web.registrations r
  left join pagina_web.profiles p on p.id = r.profile_id;
commit;