-- =============================================================================
-- Migration 010: pg_cron escalation job
-- =============================================================================
-- What: Schedules a cron job that runs every 15 minutes (matching
--       ARCHITECTURE.md §9 diagram). Finds leave_requests that are still
--       'pending', not yet escalated, and past their sla_deadline. For each:
--         1. Resolves the skip-level manager (manager's manager via
--            reporting_edges; falls back to first admin if at top of tree)
--         2. Updates leave_request: status='escalated', escalated=true,
--            escalated_at=now(), escalated_to=<skip-level manager>
--         3. Fires the send-notification Edge Function via pg_net.http_post
--
-- IMPORTANT — Before running this migration, you MUST:
--   1. Enable pg_cron extension:
--      Supabase Dashboard → Project Settings → Database → Extensions tab
--      → search "pg_cron" → Enable
--      (Direct path: https://supabase.com/dashboard/project/<project-ref>/database/extensions)
--   2. Enable pg_net extension (needed for http_post to the Edge Function):
--      Same Extensions tab → search "pg_net" → Enable
--   3. Set two Postgres secrets (used in the cron function):
--      Supabase Dashboard → Project Settings → Database → Vault or
--      run in SQL editor:
--        alter database postgres set "app.settings.edge_function_url" = 'https://<project-ref>.supabase.co/functions/v1';
--        alter database postgres set "app.settings.service_role_key"  = '<your-service-role-key>';
--      WARNING: service_role_key is sensitive — use Supabase Vault secrets
--               in production instead of a plain alter database statement.
--
-- Depends on: migrations 001-005 (leave_requests, employees, reporting_edges)
-- =============================================================================

-- Enable pg_cron (idempotent — safe to run even if already enabled)
create extension if not exists pg_cron;

-- Enable pg_net for HTTP calls from SQL (required for Edge Function trigger)
create extension if not exists pg_net;

-- ── Escalation function ───────────────────────────────────────────────────────
create or replace function public.escalate_overdue_leave_requests()
returns void
language plpgsql
security definer
as $$
declare
  req                   record;
  skip_level_manager_id uuid;
begin
  -- Find all pending, non-escalated leave requests past their SLA deadline.
  -- The partial index on leave_requests (migration 005) makes this fast.
  for req in
    select lr.id, lr.employee_id, lr.approver_id
    from public.leave_requests lr
    where lr.status    = 'pending'
      and lr.escalated = false
      and lr.sla_deadline < now()
  loop
    -- Resolve skip-level manager: the manager of req.approver_id today.
    -- If approver_id is null (no manager assigned at creation) OR is at the
    -- top of the tree (no manager above them), fall back to the first admin.
    select re.manager_id into skip_level_manager_id
    from public.reporting_edges re
    where re.employee_id   = req.approver_id
      and re.superseded_at is null
      and re.valid_from   <= current_date
      and (re.valid_to is null or re.valid_to > current_date)
    limit 1;

    -- Fallback: if no skip-level manager found, notify first admin
    if skip_level_manager_id is null then
      select id into skip_level_manager_id
      from public.employees
      where role = 'admin'
      limit 1;
    end if;

    -- Update the leave_request to escalated state
    update public.leave_requests
    set
      status       = 'escalated',
      escalated    = true,
      escalated_at = now(),
      escalated_to = skip_level_manager_id,
      updated_at   = now()
    where id = req.id;

    -- Fire the send-notification Edge Function asynchronously via pg_net.
    -- The function URL and service_role_key are read from Postgres settings
    -- (set via 'alter database postgres set ...' or Supabase Vault).
    -- NOTE: If current_setting() throws because the setting isn't set,
    -- the whole cron job will fail. Set both settings before enabling cron.
    perform net.http_post(
      url     := current_setting('app.settings.edge_function_url') || '/send-notification',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := jsonb_build_object(
        'type',             'leave_escalated',
        'leaveRequestId',   req.id,
        'notifyEmployeeId', skip_level_manager_id
      )
    );

  end loop;
end;
$$;

-- ── Schedule the cron job ─────────────────────────────────────────────────────
-- Runs every 15 minutes (as per ARCHITECTURE.md §9 diagram).
-- The task prompt specified "every 6 hours" but ARCHITECTURE.md §9 says
-- "every 15 min" — ARCHITECTURE.md takes precedence per instructions.
-- To adjust: change '*/15 * * * *' to '0 */6 * * *' for every 6 hours.

select cron.schedule(
  'escalate-overdue-leave',     -- job name (unique, used to unschedule)
  '*/15 * * * *',               -- every 15 minutes
  $$select public.escalate_overdue_leave_requests();$$
);
