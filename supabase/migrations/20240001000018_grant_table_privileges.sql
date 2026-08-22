-- =============================================================================
-- Migration 018: grant base table privileges to anon/authenticated/service_role
-- =============================================================================
-- What: Fixes a gap present since migration 001 — every `public` table was
--       created by the `postgres` migration role, whose default privileges
--       for `anon`/`authenticated`/`service_role` in this local project only
--       include DELETE/REFERENCES/TRIGGER/MAINTAIN (`Dxtm`), never SELECT/
--       INSERT/UPDATE. RLS policies (migration 008) filter *rows*, but they
--       do nothing without the underlying table-level GRANT that allows the
--       operation in the first place — so every table was actually
--       unreadable/unwritable via PostgREST (anon, authenticated, AND
--       service_role) despite RLS being fully configured. Confirmed via
--       `\dp public.employees` on a fresh `supabase start`: service_role
--       update failed with `permission denied for table employees` even
--       though the caller bypasses RLS entirely.
--
--       This grants base CRUD to anon/authenticated (RLS still gates which
--       *rows* they see/touch) and full access to service_role (which
--       bypasses RLS by role attribute — this GRANT is what makes that
--       bypass actually usable), on every existing table plus every table
--       created in the future.
--
-- Depends on: all prior migrations (grants every table that exists so far)
-- Used by: every RLS-bound and service-role Supabase client call in the app
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- NOTE: deliberately NOT granting execute on all functions — several (e.g.
-- get_reportees, get_manager_chain, generate_login_id) are intentionally
-- service_role-only (migrations 009, 015) and already have their own
-- explicit per-function grants; a blanket grant here would silently
-- re-expose them to anon/authenticated.

-- Apply the same grants to tables/sequences created by future migrations
-- (which also run as `postgres`), so this gap can't recur.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;
