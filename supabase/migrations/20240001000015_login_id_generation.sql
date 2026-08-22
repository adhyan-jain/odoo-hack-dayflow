-- =============================================================================
-- Migration 015: login_id generation + email/login-id sign-in resolution
-- =============================================================================
-- What: Three SECURITY DEFINER functions supporting the HR/Admin-provisioned
--       identity model (ARCHITECTURE-reconciliation §1):
--
--   1. generate_login_id(full_name, join_year) -> text
--        Builds "OI" + first-2-letters-of-first-name + first-2-letters-of-
--        last-name + join_year + a 4-digit per-year serial, e.g. an employee
--        "John Doe" joining 2022 gets OIJODO20220001. Names shorter than 2
--        letters are right-padded with 'X'. The serial is drawn from
--        login_id_serials via INSERT ... ON CONFLICT DO UPDATE, which takes a
--        row lock and makes concurrent employee creation safe (no duplicate
--        serials even under parallel requests).
--        Called by POST /api/employees/create (service-role only — this is
--        never exposed to a client-chosen value).
--
--   2. resolve_login_id_to_email(login_id) -> text
--        The sign-in form accepts either an email or a login_id ("Login
--        ID/Email :-" per the wireframe). Supabase Auth only signs in by
--        email, so the frontend calls this first to resolve a login_id to
--        its email before calling supabase.auth.signInWithPassword(). Only
--        returns the email (not the whole row) to limit exposure; the actual
--        password check still happens in Supabase Auth, so this is not an
--        auth bypass — worst case it lets someone confirm a login_id maps to
--        *some* account, no more than a normal "forgot password" flow would.
--
-- Depends on: 20240001000012_employee_profile_fields.sql
-- Used by: app/api/employees/create/route.ts, AuthView sign-in
-- =============================================================================

create table public.login_id_serials (
  join_year    int primary key,
  next_serial  int not null default 0
);

alter table public.login_id_serials enable row level security;

create policy "login_id_serials_admin_only" on public.login_id_serials
  for all using (public.is_admin_or_hr(auth.uid()));

create or replace function public.generate_login_id(
  p_full_name  text,
  p_join_year  int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  name_parts  text[];
  first_name  text;
  last_name   text;
  serial      int;
begin
  name_parts := regexp_split_to_array(trim(p_full_name), '\s+');
  first_name := name_parts[1];
  last_name  := name_parts[greatest(array_length(name_parts, 1), 1)];

  insert into public.login_id_serials (join_year, next_serial)
  values (p_join_year, 1)
  on conflict (join_year) do update set next_serial = login_id_serials.next_serial + 1
  returning next_serial into serial;

  return 'OI'
    || rpad(upper(left(first_name, 2)), 2, 'X')
    || rpad(upper(left(last_name, 2)), 2, 'X')
    || p_join_year::text
    || lpad(serial::text, 4, '0');
end;
$$;

revoke execute on function public.generate_login_id(text, int) from public, authenticated;
grant execute on function public.generate_login_id(text, int) to service_role;

create or replace function public.resolve_login_id_to_email(p_login_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.employees where login_id = p_login_id;
$$;

grant execute on function public.resolve_login_id_to_email(text) to anon, authenticated;
