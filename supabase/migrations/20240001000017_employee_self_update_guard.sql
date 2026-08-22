-- =============================================================================
-- Migration 017: guard privileged employees columns on self-update
-- =============================================================================
-- What: Migration 008's "employees_update_self_or_admin" RLS policy has a
--       USING clause (row visibility) but no WITH CHECK / column restriction
--       — an authenticated employee updating their own row via the RLS-bound
--       client can change ANY column, including `role`, `compensation_visibility`,
--       `login_id`, `must_change_password`, and `employee_code`. Migration 012
--       adds more self-editable profile columns (Resume/Private Info tabs),
--       widening the surface that relies on this being safe.
--
--       Fixes it with a BEFORE UPDATE trigger (not a WITH CHECK clause, so it
--       applies uniformly regardless of which client/role performs the
--       update): if the caller is not admin/hr, silently re-pin the
--       privileged columns to their OLD values rather than erroring — this
--       keeps a self-service "save profile" request that happens to include
--       unchanged privileged fields from failing outright.
--
-- Depends on: 20240001000008_rls_policies.sql (is_admin_or_hr),
--             20240001000012_employee_profile_fields.sql
-- Used by: ProfileView self-edit (Private Info / Resume tabs)
-- =============================================================================

create or replace function public.guard_employee_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (our API routes, after their own auth/canAccess checks) is
  -- trusted and always bypasses this guard. auth.uid() reads the JWT 'sub'
  -- claim, which is unset (NULL) for service-role calls — the only other
  -- way to reach this trigger with auth.uid() NULL would be an anonymous
  -- RLS-bound call, but the table's RLS policy already requires
  -- auth.uid() = id OR is_admin_or_hr(auth.uid()), so an anonymous caller
  -- never has a visible row to UPDATE in the first place. (current_user
  -- can't be used here: this function is SECURITY DEFINER, so current_user
  -- is always the function owner, not the actual calling role.)
  if auth.uid() is null or public.is_admin_or_hr(auth.uid()) then
    return new;
  end if;

  new.role                    := old.role;
  new.compensation_visibility := old.compensation_visibility;
  new.login_id                := old.login_id;
  new.employee_code           := old.employee_code;
  -- must_change_password is the one privileged-ish column a self-updater IS
  -- allowed to flip, but only false->... never back to true (that's an
  -- admin/HR reset action, not something an employee can toggle off on
  -- themselves without actually changing their password — enforced in the
  -- Security tab's app-layer flow, not here).
  if new.must_change_password and not old.must_change_password then
    new.must_change_password := old.must_change_password;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_employee_privileged_columns_trg on public.employees;
create trigger guard_employee_privileged_columns_trg
  before update on public.employees
  for each row execute function public.guard_employee_privileged_columns();
