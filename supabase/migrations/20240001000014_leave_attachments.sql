-- =============================================================================
-- Migration 014: leave_requests.attachment_url + Storage bucket
-- =============================================================================
-- What: The wireframe's Time Off request modal requires an attachment (sick
--       leave certificate) for sick-leave requests. attachment_url stores the
--       Supabase Storage object path; "required for sick" is enforced at the
--       API layer (POST /api/leave/apply), not a DB constraint, so future
--       leave types aren't hard-coded into a CHECK.
--
--       Storage objects are stored under `${employee_id}/${filename}` so the
--       RLS policies below can scope access by the first path segment.
--
-- Depends on: 20240001000005_leave_requests.sql, 20240001000008_rls_policies.sql
-- Used by: ApplyLeaveModal attachment upload, /api/leave/apply
-- =============================================================================

alter table public.leave_requests
  add column attachment_url text;

insert into storage.buckets (id, name, public)
values ('leave-attachments', 'leave-attachments', false)
on conflict (id) do nothing;

create policy "leave_attachments_read_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'leave-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin_or_hr(auth.uid())
    )
  );

create policy "leave_attachments_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'leave-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
