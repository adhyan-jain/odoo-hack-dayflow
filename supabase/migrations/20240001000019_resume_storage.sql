-- =============================================================================
-- Migration 019: employees.resume_path + Storage bucket for resume uploads
-- =============================================================================
-- What: The Resume tab currently only holds free-text (about/skills/
--       certifications/interests) — this adds an actual resume FILE upload,
--       stored in Supabase Storage (S3-backed object storage), same pattern
--       as migration 014's leave-attachments bucket.
--
--       resume_path stores the Storage object path (not a public URL); the
--       bucket is private, so callers must request a short-lived signed URL
--       (see getResumeSignedUrl in hrms.ts) to view/download the file.
--
--       Objects are stored under `${employee_id}/${filename}` so the RLS
--       policies below can scope access by the first path segment, exactly
--       like leave-attachments. Unlike leave-attachments (write-once, never
--       replaced), a resume can be replaced or removed, so this bucket also
--       grants UPDATE/DELETE on one's own folder.
--
-- Depends on: 20240001000001_employees.sql, 20240001000008_rls_policies.sql
-- Used by: ProfileView ResumeTab (upload/replace/remove/view own resume)
-- =============================================================================

alter table public.employees
  add column resume_path text;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "resumes_read_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'resumes'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin_or_hr(auth.uid())
    )
  );

create policy "resumes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "resumes_update_own" on storage.objects
  for update using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "resumes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
