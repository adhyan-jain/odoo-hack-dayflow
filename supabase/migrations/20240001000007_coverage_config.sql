-- =============================================================================
-- Migration 007: team_coverage_config + seed data
-- =============================================================================
-- What: Defines minimum staffing thresholds per department. The coverage
--       algorithm in lib/coverage.ts reads this table to determine whether a
--       proposed leave would leave the team understaffed.
--
--       department is UNIQUE — one config row per department. To change the
--       threshold, UPDATE the existing row (not bitemporal, config data).
--
--       applies_to_leave_types: an array of leave_type enums. Coverage check
--       only applies to the listed leave types. Defaults to all three.
--
-- Seed: 4 realistic demo departments. The coverage algorithm in
--       /api/leave/check-coverage reads these thresholds.
--
-- Depends on: 20240001000001_employees.sql (for the leave_type enum)
-- Used by: /api/leave/check-coverage, lib/coverage.ts
-- =============================================================================

create table public.team_coverage_config (
  id                        uuid primary key default gen_random_uuid(),
  department                text not null unique,
  min_headcount_required    int not null,
  -- Which leave types trigger the coverage check. Default: all.
  applies_to_leave_types    public.leave_type[] not null default '{paid,sick,unpaid}',
  created_at                timestamptz not null default now()
);

-- ── Seed data (realistic demo departments) ───────────────────────────────────
-- These reflect a mid-size product company. Adjust headcounts to match your
-- actual demo employee roster before presenting.
-- Engineering: large team, must keep at least 3 engineers present
-- HR: small team, at least 1 must be present at all times
-- Sales: at least 2 present (coverage check only for paid leave — sick leave
--        is urgent and shouldn't be blocked by coverage)
-- Operations: at least 2 present for all leave types

insert into public.team_coverage_config
  (department, min_headcount_required, applies_to_leave_types)
values
  ('Engineering',  3, '{paid,sick,unpaid}'),
  ('HR',           1, '{paid,sick,unpaid}'),
  ('Sales',        2, '{paid,unpaid}'),      -- sick excluded: can't block sick leave
  ('Operations',   2, '{paid,sick,unpaid}');
