-- One personal staff tariff per event, including separately purchased companions.
begin;
alter table pagina_web.registrations
  add column uses_staff_price boolean not null default false,
  add column is_companion_ticket boolean not null default false;

-- Record the first active historic staff purchase without changing any amounts.
with first_staff_ticket as (
  select r.id, row_number() over (
    partition by r.profile_id, r.event_id order by r.created_at, r.id
  ) as position
  from pagina_web.registrations r
  join pagina_web.profiles p on p.id = r.profile_id
  where p.nationality = 'Peruvian' and r.kind = 'ticket'
    and r.payment_status in ('pending', 'paid')
)
update pagina_web.registrations r set uses_staff_price = true
from first_staff_ticket f where f.id = r.id and f.position = 1;

-- Two concurrent checkouts cannot both reserve the personal staff tariff.
create unique index registrations_one_staff_price_per_event_idx
  on pagina_web.registrations (profile_id, event_id)
  where uses_staff_price and payment_status in ('pending', 'paid');

alter table pagina_web.registrations drop constraint registrations_companion_details;
alter table pagina_web.registrations add constraint registrations_companion_details check (
  (ticket_quantity = 1 and not is_companion_ticket
    and companion_first_name is null and companion_last_name is null)
  or (kind = 'ticket' and ((ticket_quantity = 2 and not is_companion_ticket)
      or (ticket_quantity = 1 and is_companion_ticket and not uses_staff_price))
    and companion_first_name is not null and length(btrim(companion_first_name)) between 1 and 100
    and companion_last_name is not null and length(btrim(companion_last_name)) between 1 and 100)
);
comment on column pagina_web.registrations.uses_staff_price is 'Reserves the one personal staff tariff while pending or paid. Additional tickets use international PEN pricing.';
comment on column pagina_web.registrations.is_companion_ticket is 'Single named companion purchased after an existing personal ticket.';
commit;
