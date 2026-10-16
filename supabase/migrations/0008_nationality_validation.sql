-- Business rule requested for Peruvian claims: eight ASCII digits starting with 7.
-- This validates document format; it does not verify identity or citizenship.
begin;
create table pagina_web.nationality_failures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references pagina_web.profiles(id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 201),
  message text not null default 'Nacionalidad fallida' check (message = 'Nacionalidad fallida'),
  context text not null check (context in ('signup', 'profile', 'checkout')),
  created_at timestamptz not null default now()
);
alter table pagina_web.nationality_failures enable row level security;
revoke all on pagina_web.nationality_failures from anon, authenticated;
grant select on pagina_web.nationality_failures to authenticated;
grant select, insert on pagina_web.nationality_failures to service_role;
create policy "nationality_failures: admin read"
  on pagina_web.nationality_failures for select
  using (exists (select 1 from pagina_web.admins a where a.user_id = auth.uid()));

-- Enforce new writes even through the Data API. Preserve existing profiles;
-- invalid legacy profiles must correct their DNI before paid checkout.
alter table pagina_web.profiles add constraint profiles_peruvian_dni_format
  check (nationality <> 'Peruvian' or dni_id ~ '^7[0-9]{7}$') not valid;
comment on table pagina_web.nationality_failures is 'Rejected nationality claims from application validation. Stores name and context, never the rejected DNI or credentials.';
commit;
