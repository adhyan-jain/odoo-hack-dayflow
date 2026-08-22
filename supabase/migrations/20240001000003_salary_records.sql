-- =============================================================================
-- Migration 003: salary_records (bitemporal)
-- =============================================================================
-- What: Bitemporal salary history. A new row is inserted for every pay change;
--       the old row is "closed" by setting valid_to + superseded_at. The
--       current salary is the row where valid_to IS NULL and
--       superseded_at IS NULL.
--
--       Gross = basic_salary + hra + special_allowance
--       Net   = Gross - deductions (before statutory: PF/ESI/PT/TDS are
--               computed at API layer in lib/payroll.ts — not stored here)
--
-- Depends on: 20240001000001_employees.sql
-- Used by: get_current_salary() RPC, get_salary_at() RPC, /api/payroll/slip
-- =============================================================================

create table public.salary_records (
  id                   uuid primary key default gen_random_uuid(),
  employee_id          uuid not null references public.employees (id) on delete cascade,
  basic_salary         numeric(12, 2) not null,
  hra                  numeric(12, 2) not null default 0,
  special_allowance    numeric(12, 2) not null default 0,
  deductions           numeric(12, 2) not null default 0,
  valid_from           date not null,
  valid_to             date,               -- null = currently effective
  recorded_at          timestamptz not null default now(),
  superseded_at        timestamptz         -- null = current row of record
);

-- Partial index: only index current (non-superseded) rows. The main query
-- pattern is "current salary for employee X" → valid_to IS NULL.
create index salary_records_employee_idx
  on public.salary_records (employee_id, valid_from, valid_to)
  where superseded_at is null;
