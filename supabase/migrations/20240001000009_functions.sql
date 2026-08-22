-- =============================================================================
-- Migration 009: Postgres RPC functions
-- =============================================================================
-- What: Four RPC functions callable via supabaseAdmin.rpc() in API routes:
--   1. get_reportees()     — recursive reporting subtree, bitemporally filtered
--   2. get_manager_chain() — walks UP the tree (for escalation skip-level)
--   3. get_current_salary()— current salary record (valid_to IS NULL)
--   4. get_salary_at()     — salary record valid at a specific date
--
-- All four use SECURITY DEFINER (see comment below for why).
-- GRANT EXECUTE to 'authenticated' so the API layer (which uses the
-- service-role client) can call them — the service-role client bypasses RLS
-- but still needs function execute grants.
--
-- Depends on: migrations 001-007 (all referenced tables must exist)
-- Used by: canAccess() (permissions.ts), /api/leave/action, /api/org/rewind,
--          /api/org/reportees, /api/payroll/slip
-- =============================================================================

-- ── Why SECURITY DEFINER? ────────────────────────────────────────────────────
-- These functions query reporting_edges and salary_records, which have RLS
-- enabled. If called as SECURITY INVOKER (the default), the function runs as
-- the calling user — and a regular employee's RLS policy would only let them
-- see edges where they themselves appear, not the full graph.
--
-- We want the API layer (after its own canAccess() check) to get the full
-- result without the RLS filter interfering a second time. SECURITY DEFINER
-- makes the function run as its owner (the migration user, who has superuser
-- privileges in Supabase), bypassing RLS for the duration of the function.
--
-- Is it safe? Yes, because:
--   a) These functions are pure READ queries — they can't mutate data.
--   b) The API routes calling them already ran canAccess() before invoking
--      the RPC. The RPC is a utility, not an authorization gate.
--   c) GRANT EXECUTE only to 'authenticated' — anonymous calls are blocked.
-- ─────────────────────────────────────────────────────────────────────────────

-- =============================================================================
-- 1. get_reportees(manager_uuid, as_of)
-- =============================================================================
-- Returns every employee (direct + indirect) in the reporting subtree of
-- manager_uuid, as the org chart stood on `as_of` date.
--
-- Bitemporal filter: an edge counts only if:
--   - valid_from <= as_of <= valid_to  (OR valid_to IS NULL, i.e. still active)
--   - superseded_at IS NULL            (current row of record)
-- The depth guard (< 20) prevents infinite loops from accidental cyclic data.
--
-- Used by: canAccess() (to check if target is in manager's tree),
--          /api/org/reportees (to list team members), /api/leave/check-coverage

create or replace function public.get_reportees(
  manager_uuid uuid,
  as_of        date default current_date
)
returns table (employee_id uuid, depth int)
language sql
stable
security definer
as $$
  with recursive reportee_tree as (
    -- Base case: direct reports as of `as_of`
    select
      re.employee_id,
      1 as depth
    from public.reporting_edges re
    where re.manager_id   = manager_uuid
      and re.superseded_at is null
      and re.valid_from   <= as_of
      and (re.valid_to is null or re.valid_to > as_of)

    union all

    -- Recursive step: reports-of-reports
    select
      re.employee_id,
      rt.depth + 1
    from public.reporting_edges re
    join reportee_tree rt on re.manager_id = rt.employee_id
    where re.superseded_at is null
      and re.valid_from    <= as_of
      and (re.valid_to is null or re.valid_to > as_of)
      and rt.depth          < 20   -- cycle guard
  )
  select employee_id, depth from reportee_tree;
$$;

grant execute on function public.get_reportees(uuid, date) to authenticated;

-- =============================================================================
-- 2. get_manager_chain(employee_uuid, as_of)
-- =============================================================================
-- Walks UP the reporting tree from employee_uuid, returning every manager
-- in the chain with their depth (1 = direct manager, 2 = skip-level, etc.).
--
-- Used by: escalation system in escalate_overdue_leave_requests() (migration
--          010) to find the skip-level manager for SLA-breached requests.
--          Also usable by the frontend to show "your management chain."

create or replace function public.get_manager_chain(
  employee_uuid uuid,
  as_of         date default current_date
)
returns table (manager_id uuid, depth int)
language sql
stable
security definer
as $$
  with recursive manager_chain as (
    -- Base case: direct manager of employee_uuid
    select
      re.manager_id,
      1 as depth
    from public.reporting_edges re
    where re.employee_id  = employee_uuid
      and re.superseded_at is null
      and re.valid_from   <= as_of
      and (re.valid_to is null or re.valid_to > as_of)

    union all

    -- Recursive step: manager's manager
    select
      re.manager_id,
      mc.depth + 1
    from public.reporting_edges re
    join manager_chain mc on re.employee_id = mc.manager_id
    where re.superseded_at is null
      and re.valid_from    <= as_of
      and (re.valid_to is null or re.valid_to > as_of)
      and mc.depth          < 20   -- cycle guard
  )
  select manager_id, depth from manager_chain;
$$;

grant execute on function public.get_manager_chain(uuid, date) to authenticated;

-- =============================================================================
-- 3. get_current_salary(employee_uuid)
-- =============================================================================
-- Returns the single salary_records row where valid_to IS NULL AND
-- superseded_at IS NULL. This is the currently active salary.
--
-- Returns at most one row (a well-formed bitemporal dataset has exactly one
-- row with valid_to IS NULL per employee — enforced by application convention,
-- not a DB constraint, because the bitemporal write pattern closes the old row
-- before inserting the new one in a transaction).
--
-- Used by: /api/payroll/slip (current month salary slip)

create or replace function public.get_current_salary(
  employee_uuid uuid
)
returns setof public.salary_records
language sql
stable
security definer
as $$
  select *
  from public.salary_records
  where employee_id   = employee_uuid
    and valid_to      is null
    and superseded_at is null
  limit 1;
$$;

grant execute on function public.get_current_salary(uuid) to authenticated;

-- =============================================================================
-- 4. get_salary_at(employee_uuid, as_of)
-- =============================================================================
-- Returns the salary_records row that was valid on `as_of` date:
--   valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of)
-- and was not superseded at that time (superseded_at IS NULL — we use the
-- current row of record, since as_of here is business/valid time, not system
-- time; for a full audit time-travel query, additionally filter by recorded_at).
--
-- Used by: /api/payroll/slip with a month param (historical payslip),
--          time-travel demo

create or replace function public.get_salary_at(
  employee_uuid uuid,
  as_of         date
)
returns setof public.salary_records
language sql
stable
security definer
as $$
  select *
  from public.salary_records
  where employee_id   = employee_uuid
    and superseded_at is null
    and valid_from   <= as_of
    and (valid_to is null or valid_to > as_of)
  limit 1;
$$;

grant execute on function public.get_salary_at(uuid, date) to authenticated;
