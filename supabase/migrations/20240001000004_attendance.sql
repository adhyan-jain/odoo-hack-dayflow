-- =============================================================================
-- Migration 004: attendance
-- =============================================================================
-- What: Daily attendance record per employee. NOT bitemporal — attendance is a
--       fact (was the person present on date X?), not a mutable relationship.
--       Corrections are done with a plain UPDATE on the single row. The UNIQUE
--       constraint on (employee_id, date) enforces exactly one row per day.
--       See ARCHITECTURE.md §4 for why attendance is NOT bitemporal.
--
-- Depends on: 20240001000001_employees.sql
-- Used by: /app/(dashboard)/attendance, RLS in migration 008
-- =============================================================================

create table public.attendance (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees (id) on delete cascade,
  date         date not null,
  check_in     timestamptz,
  check_out    timestamptz,
  status       public.attendance_status not null default 'present',
  created_at   timestamptz not null default now(),
  -- Exactly one attendance row per employee per day — use upsert on conflict
  unique (employee_id, date)
);

create index attendance_employee_date_idx
  on public.attendance (employee_id, date desc);
