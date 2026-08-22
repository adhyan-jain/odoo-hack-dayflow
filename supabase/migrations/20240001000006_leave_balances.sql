-- =============================================================================
-- Migration 006: leave_balances (bitemporal)
-- =============================================================================
-- What: Tracks leave balance over time, per employee per leave_type.
--       Each accrual, consumption (leave approved), or manual adjustment is a
--       NEW row — never UPDATE in place. This makes "what was the balance on
--       date X?" a simple query: filter where valid_from <= X <= valid_to.
--
--       The reason column is informational ('accrual' | 'consumption' |
--       'adjustment') — it's a text field, not an enum, to stay flexible.
--
--       When leave is approved in /api/leave/action, a new row is inserted
--       here with reason='consumption', valid_from=leave_start, balance_days
--       = (previous balance - leave_days).
--
-- Depends on: 20240001000001_employees.sql
-- Used by: /api/leave/action (consumption insert), employee balance views
-- =============================================================================

create table public.leave_balances (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees (id) on delete cascade,
  leave_type    public.leave_type not null,
  balance_days  numeric(5, 2) not null,
  reason        text,               -- 'accrual' | 'consumption' | 'adjustment'
  valid_from    date not null,
  valid_to      date,               -- null = this is the current balance record
  recorded_at   timestamptz not null default now(),
  superseded_at timestamptz         -- null = current row of record
);

-- Partial index on current (non-superseded) rows, keyed by employee+type+dates
-- for the common "current balance for employee X, leave type Y" pattern.
create index leave_balances_employee_idx
  on public.leave_balances (employee_id, leave_type, valid_from, valid_to)
  where superseded_at is null;
