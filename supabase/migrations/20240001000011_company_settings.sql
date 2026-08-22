-- =============================================================================
-- Migration 011: company_settings (singleton)
-- =============================================================================
-- What: Single-row table holding org-wide branding (name, logo) shown in the
--       top nav after login. Populated once, by POST /api/auth/bootstrap-company
--       when the very first admin account is created (see migration 015 /
--       the sign-up rework). The `id boolean primary key default true` trick
--       + a check(id) constraint enforces "at most one row" at the DB level.
--
--       Reads are authenticated-only (the top nav that shows the logo only
--       renders after login). Pre-auth pages (sign-in) use static app
--       branding, not this table — see company_exists() below for the one
--       thing the public sign-up page needs to know pre-auth (whether a
--       company has already been created), without leaking name/logo.
--
-- Depends on: 20240001000008_rls_policies.sql (is_admin_or_hr)
-- Used by: top nav (company logo), sign-up page (company_exists gate)
-- =============================================================================

create table public.company_settings (
  id          boolean primary key default true,
  name        text not null,
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint company_settings_singleton check (id)
);

alter table public.company_settings enable row level security;

create policy "company_settings_select_authenticated" on public.company_settings
  for select using (auth.role() = 'authenticated');

create policy "company_settings_write_admin_only" on public.company_settings
  for all using (public.is_admin_or_hr(auth.uid()));

-- ── company_exists() ──────────────────────────────────────────────────────────
-- SECURITY DEFINER so the public (anonymous) sign-up page can check "has a
-- company already been bootstrapped?" without RLS blocking it and without
-- exposing the row's actual name/logo to anonymous callers.

create or replace function public.company_exists()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.company_settings);
$$;

grant execute on function public.company_exists() to anon, authenticated;
