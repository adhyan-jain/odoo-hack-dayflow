-- Dayflow HRMS: schema extensions required to back the existing frontend
-- (profile fields, lunch punches, leave taxonomy) + auto-provisioning on sign-up.

-- Extra profile fields the UI already renders/edits.
alter table public.employees
  add column if not exists date_of_birth date,
  add column if not exists leave_balance_days numeric(6, 2) not null default 20,
  add column if not exists employment_type text not null default 'Full-Time (Salaried)',
  add column if not exists bonus_percent numeric(5, 2) not null default 0,
  add column if not exists equity_units numeric(10, 2) not null default 0,
  add column if not exists manager_id uuid references public.employees (id);

-- Lunch break punches (Check In / Lunch Start / Lunch End / Check Out flow in the UI).
alter table public.attendance
  add column if not exists lunch_start timestamptz,
  add column if not exists lunch_end timestamptz;

-- Widen the leave taxonomy to match the four leave types the UI exposes.
alter type public.leave_type add value if not exists 'annual';
alter type public.leave_type add value if not exists 'personal';
alter type public.leave_type add value if not exists 'maternity_paternity';

-- Auto-provision a public.employees row whenever a new Supabase Auth user is created,
-- so sign-up alone is enough to get a usable profile (no manual HR step required).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role := coalesce(nullif(meta->>'role', '')::public.user_role, 'employee');
  v_code text := coalesce(nullif(meta->>'employee_code', ''), 'EMP-' || upper(substr(new.id::text, 1, 8)));
begin
  insert into public.employees (id, employee_code, full_name, email, role, job_title, department)
  values (
    new.id,
    v_code,
    coalesce(nullif(meta->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    v_role,
    nullif(meta->>'job_title', ''),
    nullif(meta->>'department', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Company-wide directory: lets any authenticated employee browse colleagues
-- (name/dept/title/avatar) without exposing salary, phone, address, or DOB,
-- which stay restricted to the owner + HR via the employees table's RLS.
create or replace view public.employee_directory as
  select id, employee_code, full_name, email, department, job_title, profile_picture_url, role
  from public.employees;

grant select on public.employee_directory to authenticated;

-- Approved leave is visible company-wide (basic out-of-office awareness);
-- pending/rejected requests remain private to the requester and HR.
create policy "Approved leave is visible company-wide" on public.leave_requests
  for select using (status = 'approved');
