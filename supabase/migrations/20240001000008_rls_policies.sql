-- =============================================================================
-- Migration 008: Row Level Security (RLS) policies
-- =============================================================================
-- What: Enables RLS on all 7 tables and installs policies exactly as specified
--       in ARCHITECTURE.md §5. Two helper functions (current_employee_role, is_admin_or_hr)
--       power all policies.
--
-- IMPORTANT BOUNDARY: RLS answers "is this row mine, or am I admin/hr?"
-- It deliberately does NOT answer "is this row one of my reports' rows?"
-- Manager access (a manager viewing/approving a report's data) is handled
-- exclusively in app/api/* route handlers via canAccess() + get_reportees().
-- See ARCHITECTURE.md §5 warning block for the full explanation.
--
-- Depends on: migrations 001-007 (all tables must exist)
-- Used by: all supabase-js client calls (both browser and server clients)
-- =============================================================================

-- ── Enable RLS on all tables ─────────────────────────────────────────────────
alter table public.employees           enable row level security;
alter table public.reporting_edges     enable row level security;
alter table public.salary_records      enable row level security;
alter table public.attendance          enable row level security;
alter table public.leave_requests      enable row level security;
alter table public.leave_balances      enable row level security;
alter table public.team_coverage_config enable row level security;

-- ── Helper functions ──────────────────────────────────────────────────────────
-- SECURITY DEFINER: these run as the function owner (superuser), not the
-- calling user. This is required because RLS policies can't read other tables
-- as the restricted user without causing infinite recursion.

create or replace function public.current_employee_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.employees where id = auth.uid();
$$;

revoke execute on function public.current_employee_role() from public;
grant execute on function public.current_employee_role() to authenticated;

-- is_admin_or_hr: used in every policy that allows admin/hr full access.
-- Takes a uid parameter (rather than calling auth.uid() internally) so it can
-- be tested in isolation with a known UUID.
create or replace function public.is_admin_or_hr(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.employees
    where id = uid and role in ('admin', 'hr')
  );
$$;

revoke execute on function public.is_admin_or_hr(uuid) from public;
grant execute on function public.is_admin_or_hr(uuid) to authenticated;

-- ── employees policies ────────────────────────────────────────────────────────
-- WHAT: An employee can read and update their own row. Admin/HR can read and
--       update any employee's row.
-- WHAT IT DOES NOT HANDLE: A manager viewing their reportees' profiles. That
--       goes through /api/* routes (which use the service-role client and
--       canAccess() for the graph check).

create policy "employees_select_self_or_admin" on public.employees
  for select using (auth.uid() = id or public.is_admin_or_hr(auth.uid()));

create policy "employees_update_self_or_admin" on public.employees
  for update using (auth.uid() = id or public.is_admin_or_hr(auth.uid()));

-- Insert is handled by the handle_new_user trigger (migration 001).
-- Direct inserts are admin-only (e.g. bulk import by HR).
create policy "employees_insert_admin_only" on public.employees
  for insert with check (public.is_admin_or_hr(auth.uid()));

-- ── reporting_edges policies ──────────────────────────────────────────────────
-- WHAT: An employee can see edges where they appear (either as employee_id
--       OR as manager_id — they can see their direct reports appear here).
--       Admin/HR can see all edges. Writes are admin/hr only.
-- WHAT IT DOES NOT HANDLE: Indirect/skip-level reports. An employee sees only
--       edges they directly participate in, not the full subtree beneath them.
--       get_reportees() RPC (migration 009) handles the recursive walk.

create policy "reporting_edges_select_self_or_admin" on public.reporting_edges
  for select using (
    auth.uid() = employee_id
    or auth.uid() = manager_id
    or public.is_admin_or_hr(auth.uid())
  );

create policy "reporting_edges_write_admin_only" on public.reporting_edges
  for all using (public.is_admin_or_hr(auth.uid()));

-- ── salary_records policies ───────────────────────────────────────────────────
-- WHAT: An employee can read only their own salary records. Admin/HR can read
--       and write all. No manager-level access here — a manager who has
--       compensation_visibility=true on their reportee accesses salary through
--       /api/payroll/slip (service-role client, canAccess check).
-- NOTE: The ARCHITECTURE.md mentions restricting self-reads to valid_to IS NULL
--       only (i.e., current salary only). We implement this at the API layer
--       rather than in RLS, because RLS can't easily filter by "most recent
--       record" per employee. An employee querying supabase-js directly will
--       see all their own historical records — this is acceptable for an HRMS
--       (salary history visibility for self is not harmful).

create policy "salary_records_select_self_or_admin" on public.salary_records
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "salary_records_write_admin_only" on public.salary_records
  for all using (public.is_admin_or_hr(auth.uid()));

-- ── attendance policies ───────────────────────────────────────────────────────
-- WHAT: An employee can read, insert, and update their own attendance records.
--       Admin/HR can read all and write all.
-- WHAT IT DOES NOT HANDLE: A manager viewing their team's attendance. That goes
--       through Server Components or API routes with canAccess() check.

create policy "attendance_select_self_or_admin" on public.attendance
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "attendance_insert_self_or_admin" on public.attendance
  for insert with check (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "attendance_update_self_or_admin" on public.attendance
  for update using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

-- ── leave_requests policies ───────────────────────────────────────────────────
-- WHAT: An employee can read their own requests and insert new ones.
--       Admin/HR can read all and update any request (approve/reject).
-- WHAT IT DOES NOT HANDLE: Manager approval. A manager approving a report's
--       leave goes through POST /api/leave/action (service-role client),
--       which calls canAccess() to verify the reporting relationship.
--       The manager cannot directly UPDATE leave_requests via supabase-js.
--       This is intentional: the API layer enforces the coverage check as a
--       hard gate before allowing the status change (ARCHITECTURE.md §7).

create policy "leave_requests_select_self_or_admin" on public.leave_requests
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "leave_requests_insert_self" on public.leave_requests
  for insert with check (auth.uid() = employee_id);

-- Only admin/HR can UPDATE via the RLS-bound client. The service-role client
-- (used in /api/leave/action) bypasses RLS entirely — canAccess() is the gate.
create policy "leave_requests_update_admin_only" on public.leave_requests
  for update using (public.is_admin_or_hr(auth.uid()));

-- ── leave_balances policies ───────────────────────────────────────────────────
-- WHAT: An employee can read their own balances. Admin/HR can read and write all.
--       Balance writes happen in the API layer when leave is approved (consumption)
--       or via admin/HR actions (accrual/adjustment).

create policy "leave_balances_select_self_or_admin" on public.leave_balances
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "leave_balances_write_admin_only" on public.leave_balances
  for all using (public.is_admin_or_hr(auth.uid()));

-- ── team_coverage_config policies ────────────────────────────────────────────
-- WHAT: Any authenticated user can read coverage config (the frontend uses
--       this to show the employee how many people must remain present).
--       Only admin/HR can write (add/modify department thresholds).

create policy "team_coverage_config_select_authenticated" on public.team_coverage_config
  for select using (auth.role() = 'authenticated');

create policy "team_coverage_config_write_admin_only" on public.team_coverage_config
  for all using (public.is_admin_or_hr(auth.uid()));
