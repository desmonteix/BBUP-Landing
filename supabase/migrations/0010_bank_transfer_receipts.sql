begin;
alter table pagina_web.registrations add column payment_method text not null default 'mercadopago'
  check (payment_method in ('mercadopago', 'transfer'));

create table pagina_web.payment_receipts (
  id uuid primary key,
  registration_id uuid not null references pagina_web.registrations(id),
  cloudinary_public_id text not null unique,
  image_format text not null check (image_format in ('jpg', 'png')),
  currency text not null check (currency in ('PEN', 'EUR')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);
create unique index payment_receipts_one_active on pagina_web.payment_receipts(registration_id) where status in ('pending', 'approved');
alter table pagina_web.payment_receipts enable row level security;
revoke all on pagina_web.payment_receipts from public, anon, authenticated;
grant select on pagina_web.payment_receipts to authenticated;
grant all on pagina_web.payment_receipts to service_role;
create policy receipts_read on pagina_web.payment_receipts for select to authenticated using (
  exists(select 1 from pagina_web.registrations r where r.id = registration_id and r.profile_id = auth.uid())
  or exists(select 1 from pagina_web.admins where user_id = auth.uid())
);

-- Server-only submission. Lock the reservation before inserting the receipt.
create function pagina_web.submit_transfer_receipt(p_id uuid, p_registration uuid, p_profile uuid, p_asset text, p_format text, p_currency text)
returns void language plpgsql security definer set search_path = '' as $$
declare r pagina_web.registrations%rowtype;
begin
  select * into r from pagina_web.registrations where id = p_registration for update;
  if not found or r.profile_id is distinct from p_profile or r.kind <> 'ticket' or r.payment_status <> 'pending' then
    raise exception 'This reservation cannot receive a receipt';
  end if;
  if p_currency = 'EUR' and (r.display_price_eur is null or r.display_price_eur <= 0) then
    raise exception 'No euro amount available';
  end if;
  insert into pagina_web.payment_receipts(id, registration_id, cloudinary_public_id, image_format, currency)
    values(p_id, r.id, p_asset, p_format, p_currency);
  update pagina_web.registrations set payment_method = 'transfer' where id = r.id;
end;
$$;
revoke all on function pagina_web.submit_transfer_receipt(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function pagina_web.submit_transfer_receipt(uuid, uuid, uuid, text, text, text) to service_role;

create function pagina_web.review_transfer_receipt(p_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare receipt pagina_web.payment_receipts%rowtype; r pagina_web.registrations%rowtype; registration uuid;
begin
  if not exists(select 1 from pagina_web.admins where user_id = auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then raise exception 'Invalid decision'; end if;
  select registration_id into registration from pagina_web.payment_receipts where id = p_id;
  select * into r from pagina_web.registrations where id = registration for update;
  select * into receipt from pagina_web.payment_receipts where id = p_id for update;
  if not found or receipt.status <> 'pending' then raise exception 'Receipt already reviewed or not found'; end if;
  if r.payment_status = 'paid' then raise exception 'Already paid: check for a duplicate payment before reviewing'; end if;
  if r.payment_method <> 'transfer' or r.payment_status <> 'pending' then raise exception 'Reservation changed'; end if;
  update pagina_web.payment_receipts set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  -- Rejection leaves the reservation pending so the buyer can correct the proof.
  if p_decision = 'approved' then
    update pagina_web.registrations set payment_status = 'paid' where id = r.id;
  end if;
end;
$$;
revoke all on function pagina_web.review_transfer_receipt(uuid, text) from public, anon, service_role;
grant execute on function pagina_web.review_transfer_receipt(uuid, text) to authenticated;

create or replace view pagina_web.admin_registrants with (security_invoker = true) as
  select r.id, r.event_id, r.profile_id, r.name, r.email, r.phone, r.kind,
    r.amount_pen, r.display_price_usd, r.exchange_rate_applied,
    r.payment_status, r.mercadopago_payment_id, r.created_at, p.nationality,
    r.ticket_quantity, r.companion_first_name, r.companion_last_name,
    r.display_price_eur, r.payment_method
  from pagina_web.registrations r
  left join pagina_web.profiles p on p.id = r.profile_id;
notify pgrst, 'reload schema';
commit;
