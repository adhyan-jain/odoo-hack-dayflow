-- =============================================================================
-- Migration 001: employees table
-- =============================================================================
-- What: Drops the old partial schema from init.sql and creates the full
--       bitemporal-ready employees table exactly as in ARCHITECTURE.md §4.
--       Adds the `compensation_visibility` boolean required by permissions.ts.
--       Creates the handle_new_user trigger that hardcodes role='employee' on
--       every new auth.users insert (ARCHITECTURE.md §11 — the security section
--       explains why we NEVER let the client supply the role at signup).
--
-- Depends on: 00000000000001_init.sql (already ran, we clean up here)
-- Used by: all subsequent migrations, all API routes, permissions.ts
-- =============================================================================

-- ── Step 1: Tear down the old init schema safely ─────────────────────────────
-- The init migration created a partial schema with 'hr' only (no 'admin'),
-- a bare-bones payroll table, and no bitemporal tables. We replace everything.

-- Drop old policies first (they reference the old is_hr function)
drop policy if exists "Employees can view own profile" on public.employees;
drop policy if exists "Employees can update own profile" on public.employees;
drop policy if exists "HR can insert employees" on public.employees;
drop policy if exists "View own or all attendance (HR)" on public.attendance;
drop policy if exists "Employees manage own attendance" on public.attendance;
drop policy if exists "Employees update own attendance" on public.attendance;
drop policy if exists "View own or all leave requests (HR)" on public.leave_requests;
drop policy if exists "Employees create own leave requests" on public.leave_requests;
drop policy if exists "HR reviews leave requests" on public.leave_requests;
drop policy if exists "View own or all payroll (HR)" on public.payroll;
drop policy if exists "HR manages payroll" on public.payroll;
drop policy if exists "HR updates payroll" on public.payroll;

-- Drop old helper function
drop function if exists public.is_hr(uuid);

-- Drop the old payroll table (replaced by salary_records in migration 003)
drop table if exists public.payroll cascade;

-- Drop old leave_requests table (we recreate it in migration 005 with escalation)
drop table if exists public.leave_requests cascade;

-- Drop old attendance table (we recreate it in migration 004)
drop table if exists public.attendance cascade;

-- Drop old employees table (we recreate it below with the correct schema)
drop table if exists public.employees cascade;

-- Drop old enums so we can recreate with correct values
drop type if exists public.user_role cascade;
drop type if exists public.attendance_status cascade;
drop type if exists public.leave_type cascade;
drop type if exists public.leave_status cascade;

-- ── Step 2: Create enums exactly as in ARCHITECTURE.md §4 ────────────────────
-- Note: 'manager' is NOT a role enum value. Manager access is derived from
-- reporting_edges graph, not a role column (ARCHITECTURE.md §10).

create type public.user_role as enum ('employee', 'hr', 'admin');
create type public.attendance_status as enum ('present', 'absent', 'half_day', 'leave');
create type public.leave_type as enum ('paid', 'sick', 'unpaid');
create type public.leave_status as enum ('pending', 'approved', 'rejected', 'escalated');

-- ── Step 3: employees table ───────────────────────────────────────────────────
-- Primary profile table. id is a 1:1 extension of auth.users.id.
-- Role is flat (employee/hr/admin); who-manages-whom lives in reporting_edges.
-- compensation_visibility: if true, the employee's manager can see salary
-- breakdown (used by canAccess() in permissions.ts — see ARCHITECTURE.md §8).

create table public.employees (
  id                       uuid primary key references auth.users (id) on delete cascade,
  employee_code            text unique not null,
  full_name                text not null,
  email                    text unique not null,
  role                     public.user_role not null default 'employee',
  phone                    text,
  address                  text,
  job_title                text,
  department               text,
  date_of_joining          date,
  profile_picture_url      text,
  -- Added for Step 8 (permissions.ts): controls whether a manager can see
  -- the employee's full salary breakdown. Defaults false — manager sees
  -- only net total unless an admin explicitly grants this.
  compensation_visibility  boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ── Step 4: Trigger — enforce role='employee' on new signups ─────────────────
-- SECURITY: The signup form may include a role selector, but we NEVER read it
-- here. Any client-supplied role is silently overridden to 'employee'. This
-- closes the privilege-escalation bug described in ARCHITECTURE.md §11.
-- Promotion to hr/admin requires an authenticated admin action (RLS-gated).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.employees (id, employee_code, full_name, email, role)
  values (
    new.id,
    'EMP-' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'employee'  -- always. Never read a client-supplied role (see ARCHITECTURE.md §11).
  );
  return new;
end;
$$;

-- Create trigger on auth.users to fire handle_new_user on every new signup.
-- Uses 'create or replace' via drop+create because triggers can't be replaced.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
