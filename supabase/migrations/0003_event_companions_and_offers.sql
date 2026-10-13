-- Event configuration and named +1 purchases. Existing bookings remain single tickets.
begin;
alter table pagina_web.events
  add column allow_companion boolean not null default false,
  add column promotions text not null default '',
  add column discounts text not null default '';
alter table pagina_web.registrations
  add column ticket_quantity integer not null default 1,
  add column companion_first_name text,
  add column companion_last_name text,
  add constraint registrations_companion_details check (
    (ticket_quantity = 1 and companion_first_name is null and companion_last_name is null)
    or (kind = 'ticket' and ticket_quantity = 2
      and companion_first_name is not null and length(btrim(companion_first_name)) between 1 and 100
      and companion_last_name is not null and length(btrim(companion_last_name)) between 1 and 100)
  );
-- Serializes reservations on the event, so two buyers cannot reserve the last
-- seat at the same time. Includes pending bookings, as the current flow does.
create function pagina_web.check_registration_capacity() returns trigger
language plpgsql set search_path = '' as $$
declare
  event_row pagina_web.events%rowtype;
  occupied bigint;
begin
  select * into event_row from pagina_web.events where id = new.event_id for update;
  if not found then raise exception 'Event not found'; end if;
  if event_row.status <> 'open' then raise exception 'Registration is closed'; end if;
  if new.ticket_quantity = 2 and not event_row.allow_companion then
    raise exception 'Companions are not allowed';
  end if;
  if event_row.capacity is not null and new.payment_status in ('n/a', 'pending', 'paid') then
    select coalesce(sum(ticket_quantity), 0) into occupied
      from pagina_web.registrations
      where event_id = new.event_id and payment_status in ('n/a', 'pending', 'paid');
    if occupied + new.ticket_quantity > event_row.capacity then
      raise exception 'Not enough spots remaining';
    end if;
  end if;
  return new;
end;
$$;
create trigger registrations_check_capacity before insert on pagina_web.registrations
for each row execute function pagina_web.check_registration_capacity();
-- Append columns to preserve the existing view and its permissions.
create or replace view pagina_web.admin_registrants with (security_invoker = true) as
  select r.id, r.event_id, r.profile_id, r.name, r.email, r.phone, r.kind,
    r.amount_pen, r.display_price_usd, r.exchange_rate_applied,
    r.payment_status, r.mercadopago_payment_id, r.created_at, p.nationality,
    r.ticket_quantity, r.companion_first_name, r.companion_last_name
  from pagina_web.registrations r
  left join pagina_web.profiles p on p.id = r.profile_id;
commit;
