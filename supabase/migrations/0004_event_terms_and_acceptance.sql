-- Terms are configured per event. Historic purchases remain unchanged.
begin;
alter table pagina_web.events
  add column terms_text text not null default '',
  add column terms_url text not null default '';
alter table pagina_web.registrations
  add column terms_accepted_at timestamptz,
  add column terms_text_snapshot text,
  add column terms_url_snapshot text;
-- Enforce new purchases only: historic pending payments may still settle.
-- Lock the event so editing terms and reserving tickets cannot race.
create function pagina_web.check_ticket_terms() returns trigger
language plpgsql set search_path = '' as $$
declare event_row pagina_web.events%rowtype;
begin
  if new.kind <> 'ticket' then return new; end if;
  select * into event_row from pagina_web.events where id = new.event_id for update;
  if event_row.terms_text = '' and event_row.terms_url = '' then
    raise exception 'Event terms have not been configured';
  end if;
  if new.terms_accepted_at is null then
    raise exception 'Accept the event terms before buying';
  end if;
  if new.terms_text_snapshot is distinct from event_row.terms_text
     or new.terms_url_snapshot is distinct from event_row.terms_url then
    raise exception 'Event terms changed; accept the current terms';
  end if;
  return new;
end;
$$;
create trigger registrations_check_terms before insert on pagina_web.registrations
for each row execute function pagina_web.check_ticket_terms();
commit;
