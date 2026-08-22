-- =============================================================================
-- Migration 013: salary_components + per-employee work schedule
-- =============================================================================
-- What: The wireframe's Salary Info tab needs a per-component breakdown
--       (Basic, HRA, Standard Allowance, Performance Bonus, Leave Travel
--       Allowance, Fixed Allowance, PF employee/employer, Professional Tax),
--       each independently configured as a fixed amount or a percentage of
--       basic wage. `salary_records.basic_salary/hra/special_allowance` (from
--       migration 003) is too coarse to represent that — this table replaces
--       it as the source of truth for the breakdown. `salary_records` keeps
--       existing as the bitemporal validity window (valid_from/valid_to);
--       each salary_records row now owns a set of salary_components rows.
--
--       lib/payroll.ts's computePayslip() is updated (application code, not
--       this migration) to sum components by category instead of reading the
--       old flat hra/special_allowance columns. Those columns are left in
--       place (not dropped) so historical salary_records rows written before
--       this migration still read back — new rows going forward populate
--       components instead and may leave hra/special_allowance at 0.
--
--       working_days_per_week / standard_daily_hours / break_minutes live on
--       salary_records because the wireframe places "No of working days in a
--       week" and "Break Time" right next to the wage figures, and they're
--       inputs to Attendance's Work Hours / Extra Hours computation.
--
-- Depends on: 20240001000003_salary_records.sql, 20240001000008_rls_policies.sql
-- Used by: ProfileView Salary Info tab, lib/payroll.ts, AttendanceView
-- =============================================================================

create type public.salary_component_category as enum ('earning', 'employer_contribution', 'deduction');
create type public.salary_computation_type as enum ('fixed', 'percent');

alter table public.salary_records
  add column working_days_per_week  smallint not null default 5 check (working_days_per_week between 1 and 7),
  add column standard_daily_hours   numeric(4, 2) not null default 8,
  add column break_minutes          int not null default 60;

create table public.salary_components (
  id                 uuid primary key default gen_random_uuid(),
  salary_record_id   uuid not null references public.salary_records (id) on delete cascade,
  employee_id        uuid not null references public.employees (id) on delete cascade,
  name               text not null,                                  -- e.g. "House Rent Allowance"
  category           public.salary_component_category not null,
  computation_type   public.salary_computation_type not null,
  -- Fixed: absolute ₹/month amount. Percent: 0-100, applied against
  -- percent_of_basic (basic_salary on the parent salary_records row).
  value              numeric(12, 4) not null,
  created_at         timestamptz not null default now()
);

create index salary_components_record_idx on public.salary_components (salary_record_id);
create index salary_components_employee_idx on public.salary_components (employee_id);

alter table public.salary_components enable row level security;

create policy "salary_components_select_self_or_admin" on public.salary_components
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "salary_components_write_admin_only" on public.salary_components
  for all using (public.is_admin_or_hr(auth.uid()));
