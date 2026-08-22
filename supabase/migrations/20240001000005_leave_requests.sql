-- =============================================================================
-- Migration 005: leave_requests
-- =============================================================================
-- What: Leave request table with full escalation fields (ARCHITECTURE.md §9).
--       The escalation system (pg_cron job in migration 010) updates the
--       escalated/escalated_at/escalated_to columns when SLA breaches.
--
--       approver_id is resolved at request-creation time (API layer walks
--       reporting_edges upward to find the direct manager) and stored so the
--       approval queue never needs a live graph walk per row.
--
--       Two indexes: one for the employee's own view, one for the cron job
--       that scans pending, non-escalated rows nearing SLA deadline.
--
-- Depends on: 20240001000001_employees.sql
-- Used by: /api/leave/apply, /api/leave/action, escalation cron (migration 010)
-- =============================================================================

create table public.leave_requests (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references public.employees (id) on delete cascade,
  leave_type          public.leave_type not null,
  start_date          date not null,
  end_date            date not null,
  remarks             text,
  status              public.leave_status not null default 'pending',

  -- Stored at creation time (manager resolved via reporting_edges walk in API)
  -- Prevents stale approver if org chart changes after request submission.
  approver_id         uuid references public.employees (id),

  -- SLA / escalation fields (ARCHITECTURE.md §9)
  -- sla_deadline defaults to 48 hours from creation.
  sla_deadline        timestamptz not null default (now() + interval '48 hours'),
  escalated           boolean not null default false,
  escalated_at        timestamptz,
  escalated_to        uuid references public.employees (id),

  -- Review fields (set when approver acts)
  reviewer_comments   text,
  reviewed_by         uuid references public.employees (id),
  reviewed_at         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- end_date cannot be before start_date
  check (end_date >= start_date)
);

-- Index for employee's own leave history + status filtering
create index leave_requests_employee_idx
  on public.leave_requests (employee_id, status);

-- Partial index for the pg_cron escalation job (migration 010):
-- Only covers rows that are still pending and not yet escalated, so the job
-- scans a small set rather than the entire table.
create index leave_requests_pending_sla_idx
  on public.leave_requests (sla_deadline)
  where status = 'pending' and escalated = false;
