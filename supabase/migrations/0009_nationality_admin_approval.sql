-- Apply before deploying the account-approval UI and server actions.
begin;
alter table pagina_web.profiles
  add column nationality_approval text not null default 'approved'
    check (nationality_approval in ('pending', 'approved', 'rejected')),
  add column nationality_reviewed_by uuid references auth.users(id) on delete set null,
  add column nationality_reviewed_at timestamptz;
alter table pagina_web.profiles drop constraint profiles_peruvian_dni_format;
update pagina_web.profiles set nationality_approval = 'pending'
where nationality = 'Peruvian' and dni_id !~ '^7[0-9]{7}$';
-- Historic malformed documents remain preserved; all new writes require eight digits.
alter table pagina_web.profiles add constraint profiles_peruvian_dni_format
  check (nationality <> 'Peruvian' or dni_id ~ '^[0-9]{8}$') not valid;
create index profiles_pending_nationality_idx on pagina_web.profiles(created_at, id)
  where nationality_approval = 'pending';

create function pagina_web.guard_nationality_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
declare identity_changed boolean;
begin
  if tg_op = 'INSERT' then identity_changed := true;
  else identity_changed := new.nationality is distinct from old.nationality or new.dni_id is distinct from old.dni_id;
  end if;
  if identity_changed then
    new.nationality_approval := case when new.nationality = 'Peruvian' and new.dni_id !~ '^7[0-9]{7}$' then 'pending' else 'approved' end;
    new.nationality_reviewed_by := null;
    new.nationality_reviewed_at := null;
  elsif new.nationality_approval is distinct from old.nationality_approval
      or new.nationality_reviewed_by is distinct from old.nationality_reviewed_by
      or new.nationality_reviewed_at is distinct from old.nationality_reviewed_at then
    if not exists(select 1 from pagina_web.admins where user_id = auth.uid()) then
      raise exception 'Only an administrator can approve an account' using errcode = '42501';
    end if;
    if new.nationality_approval not in ('approved', 'rejected') then
      raise exception 'Invalid approval decision';
    end if;
    new.nationality_reviewed_by := auth.uid();
    new.nationality_reviewed_at := now();
  end if;
  return new;
end;
$$;
create trigger profiles_guard_nationality_approval before insert or update on pagina_web.profiles
for each row execute function pagina_web.guard_nationality_approval();
revoke all on function pagina_web.guard_nationality_approval() from public, anon, authenticated;

-- The authenticated admin identity is checked inside the database, not accepted from the browser.
create function pagina_web.review_nationality(p_profile_id uuid, p_dni text, p_nationality text, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare candidate pagina_web.profiles%rowtype;
begin
  if not exists(select 1 from pagina_web.admins where user_id = auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') or p_decision is null then raise exception 'Invalid decision'; end if;
  select * into candidate from pagina_web.profiles where id = p_profile_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if candidate.dni_id is distinct from p_dni or candidate.nationality is distinct from p_nationality
      or candidate.nationality_approval <> 'pending' then
    raise exception 'The document or approval status changed. Reload the review queue';
  end if;
  if candidate.nationality <> 'Peruvian' or candidate.dni_id !~ '^[0-9]{8}$' or candidate.dni_id like '7%' then
    raise exception 'This document is not eligible for manual approval';
  end if;
  update pagina_web.profiles set nationality_approval = p_decision where id = p_profile_id;
end;
$$;
revoke all on function pagina_web.review_nationality(uuid, text, text, text) from public, anon, service_role;
grant execute on function pagina_web.review_nationality(uuid, text, text, text) to authenticated;

-- Close the race between the application eligibility check and ticket reservation.
create function pagina_web.check_ticket_account_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
declare buyer pagina_web.profiles%rowtype;
begin
  if new.kind <> 'ticket' then return new; end if;
  select * into buyer from pagina_web.profiles where id = new.profile_id for share;
  if not found then raise exception 'An approved account is required'; end if;
  if buyer.nationality = 'Peruvian' and
      (buyer.dni_id !~ '^[0-9]{8}$' or buyer.nationality_approval <> 'approved') then
    raise exception 'Account pending administrator approval';
  end if;
  return new;
end;
$$;
create trigger registrations_check_account_approval before insert on pagina_web.registrations
for each row execute function pagina_web.check_ticket_account_approval();
revoke all on function pagina_web.check_ticket_account_approval() from public, anon, authenticated;
commit;
