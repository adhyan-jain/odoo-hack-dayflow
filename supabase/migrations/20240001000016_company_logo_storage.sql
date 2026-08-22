-- =============================================================================
-- Migration 016: company-assets storage bucket (logo upload)
-- =============================================================================
-- What: Public bucket for the company logo uploaded on the Sign Up
--       (company-bootstrap) screen and rendered in the authenticated top nav.
--       Public read (logo is shown pre-optimization on a rendered page, no
--       sensitive data), write restricted to admin/hr.
--
-- Depends on: 20240001000008_rls_policies.sql (is_admin_or_hr)
-- Used by: POST /api/auth/bootstrap-company, top nav company logo
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

create policy "company_assets_public_read" on storage.objects
  for select using (bucket_id = 'company-assets');

create policy "company_assets_write_admin_only" on storage.objects
  for insert with check (bucket_id = 'company-assets' and public.is_admin_or_hr(auth.uid()));

create policy "company_assets_update_admin_only" on storage.objects
  for update using (bucket_id = 'company-assets' and public.is_admin_or_hr(auth.uid()));
