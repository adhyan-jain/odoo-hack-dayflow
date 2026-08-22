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
--   3. Store two secrets in Supabase Vault (built in, no extra extension
--      needed, works under the standard postgres role — unlike
--      `alter database ... set "app.settings.*"`, which Supabase Cloud now
--      rejects with `42501: permission denied to set parameter`).
--      Run in SQL editor:
--        select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'edge_function_url');
--        select vault.create_secret('<your-service-role-key>', 'service_role_key');
--      (Re-running with the same name errors on the unique constraint — use
--       `select vault.update_secret(id, new_secret) ...` or delete the old
--       row from vault.secrets first if you need to change a value.)
--
-- Depends on: migrations 001-005 (leave_requests, employees, reporting_edges)
-- =============================================================================

-- Enable pg_cron (idempotent — safe to run even if already enabled)
create extension if not exists pg_cron;

-- Enable pg_net for HTTP calls from SQL (required for Edge Function trigger)
create extension if not exists pg_net;

create or replace function public.escalate_overdue_leave_requests()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req                   record;
  skip_level_manager_id uuid;
  edge_function_url     text;
  service_role_key      text;
begin
  select decrypted_secret into edge_function_url
  from vault.decrypted_secrets where name = 'edge_function_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets where name = 'service_role_key';

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

    -- Update the leave_request to escalated state (only if it remains pending/non-escalated)
    update public.leave_requests
    set
      status       = 'escalated',
      escalated    = true,
      escalated_at = now(),
      escalated_to = skip_level_manager_id,
      updated_at   = now()
    where id = req.id
      and status = 'pending'
      and escalated = false;

    -- Fire the send-notification Edge Function asynchronously via pg_net.
    -- The function URL and service_role_key are read from Supabase Vault
    -- (fetched once above, outside the loop).
    -- We wrap this in an exception block so that if notification fails
    -- (e.g. pg_net not configured, or offline), the database escalation
    -- update is NOT rolled back.
    begin
      perform net.http_post(
        url     := edge_function_url || '/send-notification',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body    := jsonb_build_object(
          'type',             'leave_escalated',
          'leaveRequestId',   req.id,
          'notifyEmployeeId', skip_level_manager_id
        )
      );
    exception when others then
      -- Swallow notification exceptions so database escalation transaction succeeds
      raise warning 'Failed to send escalation notification for leave request %: %', req.id, SQLERRM;
    end;

  end loop;
end;
$$;

revoke execute on function public.escalate_overdue_leave_requests() from public;

-- ── Schedule the cron job ─────────────────────────────────────────────────────
-- Runs every 15 minutes (as per ARCHITECTURE.md §9 diagram).
-- Unschedule first for idempotency — but only if the job already exists;
-- cron.unschedule() raises on a fresh database where the job was never
-- scheduled (e.g. the first `supabase db reset`/`start`), which would abort
-- this entire migration.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'escalate-overdue-leave') then
    perform cron.unschedule('escalate-overdue-leave');
  end if;
end;
$$;

select cron.schedule(
  'escalate-overdue-leave',     -- job name (unique, used to unschedule)
  '*/15 * * * *',               -- every 15 minutes
  $$select public.escalate_overdue_leave_requests();$$
);
