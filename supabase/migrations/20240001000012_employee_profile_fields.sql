-- =============================================================================
-- Migration 012: employee profile fields (Resume / Private Info / login)
-- =============================================================================
-- What: Additive columns on `employees` for the wireframe's profile tabs that
--       have no home in the existing schema:
--         - login_id, must_change_password: HR/Admin-provisioned identity
--           (see migration 015 for the generator function + the auth rework).
--         - about/skills/certifications/interests: "Resume" tab.
--         - date_of_birth..pan_no: "Private Info" tab (personal + bank details).
--       Nothing is dropped or renamed — existing columns (phone, address,
--       job_title, department, date_of_joining) keep serving the profile
--       header / "Private Info" job fields as before.
--
-- Depends on: 20240001000001_employees.sql
-- Used by: ProfileView (Resume/Private Info tabs), Security tab (must_change_password)
-- =============================================================================

alter table public.employees
  -- ── Identity (HR/Admin-provisioned login) ──────────────────────────────────
  add column login_id               text unique,
  add column must_change_password   boolean not null default false,

  -- ── Resume tab ──────────────────────────────────────────────────────────────
  add column about                  text,
  add column skills                 text[] not null default '{}',
  add column certifications         text[] not null default '{}',
  add column interests              text,

  -- ── Private Info tab: personal ─────────────────────────────────────────────
  add column date_of_birth          date,
  add column gender                 text,
  add column marital_status         text,
  add column nationality            text,
  add column personal_email         text,
  add column residing_address       text,

  -- ── Private Info tab: bank details ─────────────────────────────────────────
  add column bank_name              text,
  add column bank_account_no        text,
  add column ifsc_code              text,
  add column uan_no                 text,
  add column pan_no                 text;

create index employees_login_id_idx on public.employees (login_id);
