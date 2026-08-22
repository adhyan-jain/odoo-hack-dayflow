-- =============================================================================
-- Migration 002: reporting_edges (bitemporal)
-- =============================================================================
-- What: Bitemporal org chart. Each row represents "employee_id reported to
--       manager_id from valid_from to valid_to". Never UPDATE — append only.
--       Two time axes:
--         valid_from / valid_to       → business time (real-world effective dates)
--         recorded_at / superseded_at → transaction time (when DB knew this)
--       See ARCHITECTURE.md §4 and §10 for the full bitemporal write pattern.
--
-- Depends on: 20240001000001_employees.sql (employees table must exist)
-- Used by: get_reportees() RPC, get_manager_chain() RPC, canAccess(),
--          /api/org/rewind, /api/leave/action, /api/org/reportees
-- =============================================================================

create table public.reporting_edges (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees (id) on delete cascade,
  manager_id     uuid not null references public.employees (id) on delete cascade,
  valid_from     date not null,
  valid_to       date,                        -- null = edge is currently in effect
  recorded_at    timestamptz not null default now(),
  superseded_at  timestamptz,                 -- null = this is the current row of record
  -- Prevent self-referential edges (an employee cannot be their own manager)
  check (employee_id <> manager_id)
);

-- Index for the common query: "who reports to this manager as of date X?"
-- Partial index on superseded_at IS NULL keeps it lean (only current rows).
create index reporting_edges_employee_idx
  on public.reporting_edges (employee_id, valid_from, valid_to)
  where superseded_at is null;

create index reporting_edges_manager_idx
  on public.reporting_edges (manager_id, valid_from, valid_to)
  where superseded_at is null;
