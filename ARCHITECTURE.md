# Dayflow — Architecture Documentation

*Every workday, perfectly aligned.*

This document describes the technical architecture of Dayflow, a Human Resource Management System (HRMS). It is written for a developer picking up the codebase for the first time — read top to bottom, then start building.

---

## 1. Project Overview

Dayflow is an HRMS covering authentication, employee profiles, attendance, leave/time-off, and payroll visibility, with role-based approval workflows for HR/Admin.

What makes Dayflow different from a standard CRUD HRMS built in a weekend:

| Standard HRMS | Dayflow |
|---|---|
| Overwrites records in place (`UPDATE employees SET salary = ...`) | Bitemporal storage — every salary/reporting-line/balance change is a new row, so you can ask "what was true on March 3rd?" |
| Flat RBAC (`role IN ('admin', 'employee')`) | Relationship-based access — a manager can act on *their reporting tree*, resolved dynamically from an org graph, not a hardcoded list |
| Leave approval is a single-record status flip | Leave approval runs a coverage-constraint check first — a request can be blocked even if the approver would otherwise say yes, because it would leave the team under-staffed |

These three properties (bitemporal history, graph-based access, coverage-aware approval) are the core technical bets of this project — see [Section 10](#10-key-differentiators-technical) for how each maps to a concrete architecture decision.

---

## 2. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                        │
│  Next.js 14 App Router — React Server + Client Components            │
│  Tailwind CSS · supabase-js (browser client, anon key, RLS-bound)    │
└───────────────────────────────┬────────────────────────────────────-─┘
                                 │
                                 │ HTTPS
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    VERCEL — Next.js Server Runtime                   │
│                                                                        │
│  ┌────────────────────────────┐   ┌────────────────────────────────┐ │
│  │  Server Components / RSC   │   │   /app/api/* Route Handlers     │ │
│  │  - reads via RLS-bound     │   │   - service-role supabase       │ │
│  │    supabase-js (server)    │   │     client (bypasses RLS)       │ │
│  │  - simple, per-row reads   │   │   - runs canAccess() first      │ │
│  │  - dashboard, profile,     │   │   - runs algorithmic logic:     │ │
│  │    attendance views        │   │     coverage checks, org        │ │
│  │                            │   │     rewind, payroll calc        │ │
│  └────────────────┬───────────┘   └───────────────┬──────────────--─┘ │
└───────────────────┼───────────────────────────────┼───────────────-──┘
                     │                               │
                     │ RLS-bound (anon/user JWT)      │ service-role key
                     ▼                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          SUPABASE CLOUD                               │
│                                                                        │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌────────────────┐ │
│  │  Postgres           │  │  Auth                │  │  Storage       │ │
│  │  - employees        │  │  - auth.users        │  │  - profile     │ │
│  │  - reporting_edges  │  │  - JWT issuance      │  │    pictures    │ │
│  │  - salary_records   │  │  - email verify      │  │  - documents   │ │
│  │  - attendance       │  └─────────────────────┘  └────────────────┘ │
│  │  - leave_requests   │                                              │
│  │  - leave_balances   │  ┌─────────────────────┐  ┌────────────────┐ │
│  │  - team_coverage_   │  │  Realtime            │  │  Edge Functions│ │
│  │    config           │  │  - leave status      │  │  - send-       │ │
│  │  - RLS policies     │  │    change broadcasts │  │    notification│ │
│  │  - get_reportees()  │  │  - dashboard alerts  │  │  - triggered by│ │
│  │    RPC              │  └─────────────────────┘  │    pg_cron/    │ │
│  └─────────────────────┘                            │    pg_net      │ │
│                                                       └────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  pg_cron                                                         │ │
│  │  - runs escalate_overdue_leave_requests() every 15 min           │ │
│  │  - flags SLA breaches, resolves skip-level manager,              │ │
│  │    calls Edge Function via pg_net.http_post                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**What lives where — the one rule that matters:**

- **Row-level reads/writes that RLS can express correctly** (an employee reading their own attendance, HR reading everyone) → go straight from the client or a Server Component to Supabase via the RLS-bound `supabase-js` client.
- **Anything that needs graph traversal, cross-record algorithms, or a decision that RLS's per-row model can't express** (manager approving a report's leave, coverage math, payroll computation, org-chart-as-of-a-date) → goes through a Next.js API route, which uses the **service-role** Supabase client (RLS bypassed) and enforces access itself via `canAccess()` ([Section 8](#8-permission-layer)).

---

## 3. Folder Structure

```
dayflow/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx
│   │   │   └── sign-up/
│   │   │       └── page.tsx
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts                  # email verification / OAuth callback
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    # role-aware nav shell
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx
│   │   │   ├── leave/
│   │   │   │   ├── page.tsx                  # apply + own requests
│   │   │   │   └── approvals/
│   │   │   │       └── page.tsx              # manager/HR approval queue
│   │   │   ├── payroll/
│   │   │   │   └── page.tsx
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx                  # HR directory
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── org/
│   │   │       └── page.tsx                  # org chart + rewind slider
│   │   ├── api/
│   │   │   ├── leave/
│   │   │   │   ├── check-coverage/
│   │   │   │   │   └── route.ts              # POST
│   │   │   │   └── action/
│   │   │   │       └── route.ts              # POST
│   │   │   ├── org/
│   │   │   │   └── rewind/
│   │   │   │       └── route.ts              # GET
│   │   │   └── payroll/
│   │   │       └── slip/
│   │   │           └── route.ts              # GET
│   │   ├── layout.tsx
│   │   └── page.tsx                          # redirects to /dashboard
│   ├── components/
│   │   ├── ui/                               # buttons, inputs, cards, tables
│   │   ├── layout/                           # sidebar, topbar
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── employees/
│   │   └── org/                              # org chart tree, rewind slider
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                     # browser client (anon key, RLS-bound)
│   │   │   ├── server.ts                     # RSC/server client (anon key + user cookies, RLS-bound)
│   │   │   ├── admin.ts                      # service-role client (RLS bypassed, API-route only)
│   │   │   └── middleware.ts                 # session refresh
│   │   ├── permissions.ts                    # canAccess()
│   │   ├── coverage.ts                       # coverage-constraint algorithm
│   │   ├── payroll.ts                        # statutory breakdown calculator
│   │   └── utils.ts
│   ├── types/
│   │   ├── database.types.ts                 # generated from Supabase schema
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-current-employee.ts
│   │   └── use-realtime-leave-status.ts
│   └── proxy.ts                              # route protection / session refresh
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_init_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_get_reportees_rpc.sql
│   │   ├── 0004_escalation_cron.sql
│   │   └── 0005_seed_coverage_config.sql
│   └── functions/
│       └── send-notification/
│           └── index.ts                      # Edge Function
├── .env.local.example
└── package.json
```

> **Note on Next.js server clients:** `lib/supabase/server.ts` (anon key, RLS-bound, used by Server Components and simple reads) and `lib/supabase/admin.ts` (service-role key, RLS bypassed, used **only** inside `app/api/*` route handlers after an explicit `canAccess()` check) are deliberately separate files. Never import `admin.ts` from a Server Component — it has no RLS safety net.

---

## 4. Database Schema

All tables live in the `public` schema. `employees.id` is a 1:1 extension of `auth.users.id`.

```sql
-- ── Enums ──────────────────────────────────────────────────────────────

create type public.user_role as enum ('employee', 'hr', 'admin');
create type public.attendance_status as enum ('present', 'absent', 'half_day', 'leave');
create type public.leave_type as enum ('paid', 'sick', 'unpaid');
create type public.leave_status as enum ('pending', 'approved', 'rejected', 'escalated');

-- ── employees ─────────────────────────────────────────────────────────
-- Extends auth.users. Role is flat (employee/hr/admin) — reporting-line
-- access is NOT a column here, it's derived from reporting_edges.

create table public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_code text unique not null,
  full_name text not null,
  email text unique not null,
  role public.user_role not null default 'employee',
  phone text,
  address text,
  job_title text,
  department text,
  date_of_joining date,
  profile_picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── reporting_edges (BITEMPORAL) ─────────────────────────────────────
-- Who reports to whom, over time. Append-only: to change a reporting
-- line, close out the old row (set valid_to / superseded_at) and insert
-- a new one. Never UPDATE the substantive columns of an existing row.
--
-- Two time axes:
--   valid_from / valid_to   -> business/real-world time ("effective X to Y")
--   recorded_at / superseded_at -> system/transaction time (when we knew it)

create table public.reporting_edges (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  manager_id uuid not null references public.employees (id) on delete cascade,
  valid_from date not null,
  valid_to date,                              -- null = currently in effect
  recorded_at timestamptz not null default now(),
  superseded_at timestamptz,                  -- null = current row of record
  check (employee_id <> manager_id)
);

create index reporting_edges_employee_idx
  on public.reporting_edges (employee_id, valid_from, valid_to)
  where superseded_at is null;
create index reporting_edges_manager_idx
  on public.reporting_edges (manager_id, valid_from, valid_to)
  where superseded_at is null;

-- ── salary_records (BITEMPORAL) ──────────────────────────────────────

create table public.salary_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  basic_salary numeric(12, 2) not null,
  hra numeric(12, 2) not null default 0,
  special_allowance numeric(12, 2) not null default 0,
  deductions numeric(12, 2) not null default 0,
  valid_from date not null,
  valid_to date,
  recorded_at timestamptz not null default now(),
  superseded_at timestamptz
);

create index salary_records_employee_idx
  on public.salary_records (employee_id, valid_from, valid_to)
  where superseded_at is null;

-- ── attendance ────────────────────────────────────────────────────────
-- Not bitemporal — a day's attendance is a fact, not a mutable
-- relationship, so a single current-state row per (employee, date) is
-- sufficient and corrections just UPDATE the row.

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status public.attendance_status not null default 'present',
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

create index attendance_employee_date_idx
  on public.attendance (employee_id, date desc);

-- ── leave_requests (with escalation fields) ─────────────────────────

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  remarks text,
  status public.leave_status not null default 'pending',

  -- resolved at request-creation time via get_reportees() walked upward;
  -- stored so the approval queue doesn't need a live graph walk per row
  approver_id uuid references public.employees (id),

  -- escalation
  sla_deadline timestamptz not null default (now() + interval '48 hours'),
  escalated boolean not null default false,
  escalated_at timestamptz,
  escalated_to uuid references public.employees (id),  -- skip-level manager

  reviewer_comments text,
  reviewed_by uuid references public.employees (id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date)
);

create index leave_requests_employee_idx on public.leave_requests (employee_id, status);
create index leave_requests_pending_sla_idx
  on public.leave_requests (sla_deadline)
  where status = 'pending' and escalated = false;

-- ── leave_balances (BITEMPORAL) ──────────────────────────────────────
-- Balance changes (accrual, consumption, manual adjustment) are new
-- rows, not updates, so "what was the balance on date X" is answerable.

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type public.leave_type not null,
  balance_days numeric(5, 2) not null,
  reason text,                                -- 'accrual' | 'consumption' | 'adjustment'
  valid_from date not null,
  valid_to date,
  recorded_at timestamptz not null default now(),
  superseded_at timestamptz
);

create index leave_balances_employee_idx
  on public.leave_balances (employee_id, leave_type, valid_from, valid_to)
  where superseded_at is null;

-- ── team_coverage_config ─────────────────────────────────────────────
-- Minimum staffing a department/team must retain on any given day.
-- Seeded from a fixture for the demo — see Section 12.

create table public.team_coverage_config (
  id uuid primary key default gen_random_uuid(),
  department text not null unique,
  min_headcount_required int not null,
  applies_to_leave_types public.leave_type[] not null default '{paid, sick, unpaid}',
  created_at timestamptz not null default now()
);
```

**Bitemporal write pattern** (applies to `reporting_edges`, `salary_records`, `leave_balances`): never `UPDATE` the business columns of an existing row. To change a value effective some date:

```sql
begin;
  update public.reporting_edges
    set valid_to = '2026-08-01', superseded_at = now()
    where employee_id = $1 and superseded_at is null and valid_to is null;

  insert into public.reporting_edges (employee_id, manager_id, valid_from)
    values ($1, $2, '2026-08-01');
commit;
```

---

## 5. Supabase RLS Policies

RLS is deliberately **flat and role-based only** — `self` and `admin`/`hr`. It has no concept of "my reportees." Manager access is a graph query the row-level model can't express efficiently or safely (see [Section 8](#8-permission-layer)); trying to encode it in a policy either means a correlated subquery per row (slow, and still can't handle bitemporal "as of" correctly) or a materialized view that goes stale. That access path is handled entirely in the API layer with the service-role client.

```sql
alter table public.employees enable row level security;
alter table public.reporting_edges enable row level security;
alter table public.salary_records enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_balances enable row level security;
alter table public.team_coverage_config enable row level security;

create function public.current_role()
returns public.user_role
language sql security definer stable
as $$
  select role from public.employees where id = auth.uid();
$$;

create function public.is_admin_or_hr(uid uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.employees
    where id = uid and role in ('admin', 'hr')
  );
$$;

-- employees: self read/update limited fields; admin/hr full access
create policy "employees_select_self_or_admin" on public.employees
  for select using (auth.uid() = id or public.is_admin_or_hr(auth.uid()));

create policy "employees_update_self_or_admin" on public.employees
  for update using (auth.uid() = id or public.is_admin_or_hr(auth.uid()));

-- reporting_edges: read-only for self (as employee OR manager side of a
-- row); full access for admin/hr. NOTE: this only covers the DIRECT edge
-- a user appears in — it says nothing about indirect/skip-level reports.
create policy "reporting_edges_select_self_or_admin" on public.reporting_edges
  for select using (
    auth.uid() = employee_id or auth.uid() = manager_id
    or public.is_admin_or_hr(auth.uid())
  );

create policy "reporting_edges_write_admin_only" on public.reporting_edges
  for all using (public.is_admin_or_hr(auth.uid()));

-- salary_records: strictly self read-only, or admin/hr
create policy "salary_records_select_self_or_admin" on public.salary_records
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "salary_records_write_admin_only" on public.salary_records
  for all using (public.is_admin_or_hr(auth.uid()));

-- attendance: self read/write own; admin/hr full access
create policy "attendance_select_self_or_admin" on public.attendance
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "attendance_write_self_or_admin" on public.attendance
  for insert with check (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "attendance_update_self_or_admin" on public.attendance
  for update using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

-- leave_requests: self create/read own; admin/hr read/update all.
-- Manager approve/reject is NOT a policy — it goes through
-- POST /api/leave/action using the service-role client.
create policy "leave_requests_select_self_or_admin" on public.leave_requests
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "leave_requests_insert_self" on public.leave_requests
  for insert with check (auth.uid() = employee_id);

create policy "leave_requests_update_admin_only" on public.leave_requests
  for update using (public.is_admin_or_hr(auth.uid()));

-- leave_balances: self read-only; admin/hr full access
create policy "leave_balances_select_self_or_admin" on public.leave_balances
  for select using (auth.uid() = employee_id or public.is_admin_or_hr(auth.uid()));

create policy "leave_balances_write_admin_only" on public.leave_balances
  for all using (public.is_admin_or_hr(auth.uid()));

-- team_coverage_config: readable by everyone authenticated, writable by admin/hr
create policy "team_coverage_config_select_all" on public.team_coverage_config
  for select using (auth.role() = 'authenticated');

create policy "team_coverage_config_write_admin_only" on public.team_coverage_config
  for all using (public.is_admin_or_hr(auth.uid()));
```

> ⚠️ **Explicit boundary:** RLS answers "is this row mine, or am I admin/hr?" It does **not** answer "is this row one of my reports' rows?" A manager's ability to view/approve a direct or indirect report's leave request, attendance, or salary goes through `app/api/*` route handlers using the **service-role** client, gated by `canAccess()` (Section 8), which resolves the reporting tree via `get_reportees()` (Section 6). Do not attempt to patch this gap with a "smarter" RLS policy — it will not handle the bitemporal "as of" semantics correctly and will silently diverge from the API layer's notion of the org chart.

---

## 6. Postgres Functions (RPCs)

```sql
-- Returns every employee (direct + indirect) reporting to manager_uuid,
-- as the org chart stood on `as_of`. Walks reporting_edges bitemporally:
-- an edge counts only if it was valid_from <= as_of <= valid_to (or
-- valid_to is null, i.e. still current) AND it hadn't been superseded
-- as of the time we're querying (we use the current row of record —
-- superseded_at is null — since "as_of" here is business time, not
-- system time; see Section 10 for the distinction and /api/org/rewind for the
-- system-time variant).

create or replace function public.get_reportees(
  manager_uuid uuid,
  as_of date default current_date
)
returns table (employee_id uuid, depth int)
language sql
stable
security definer
as $$
  with recursive reportee_tree as (
    -- base case: direct reports as of `as_of`
    select
      re.employee_id,
      1 as depth
    from public.reporting_edges re
    where re.manager_id = manager_uuid
      and re.superseded_at is null
      and re.valid_from <= as_of
      and (re.valid_to is null or re.valid_to > as_of)

    union all

    -- recursive step: reports of reports
    select
      re.employee_id,
      rt.depth + 1
    from public.reporting_edges re
    join reportee_tree rt on re.manager_id = rt.employee_id
    where re.superseded_at is null
      and re.valid_from <= as_of
      and (re.valid_to is null or re.valid_to > as_of)
      and rt.depth < 20 -- guard against cyclic data
  )
  select employee_id, depth from reportee_tree;
$$;

grant execute on function public.get_reportees(uuid, date) to authenticated;
```

Usage from the API layer (service-role client, after a `canAccess` gate has already run — this RPC itself does no permission checking, it's a pure graph query):

```ts
const { data: reportees } = await supabaseAdmin
  .rpc('get_reportees', { manager_uuid: managerId, as_of: '2026-08-22' });
// -> [{ employee_id: '...', depth: 1 }, { employee_id: '...', depth: 2 }, ...]
```

---

## 7. Key API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/leave/check-coverage` | `POST` | Runs the coverage-constraint algorithm for a proposed leave date range before/at approval time |
| `/api/leave/action` | `POST` | Approve or reject a leave request, after a `canAccess` permission check |
| `/api/org/rewind` | `GET` | Returns the full org chart as it stood on a given date |
| `/api/payroll/slip` | `GET` | Returns a computed salary breakdown for an employee |

### `POST /api/leave/check-coverage`

**Input**
```json
{
  "employeeId": "uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05"
}
```

**Logic**
1. Look up the employee's `department`.
2. Look up `team_coverage_config` for that department → `min_headcount_required`.
3. Count total headcount in the department (via `employees` where `department = X`).
4. For each day in `[startDate, endDate]`, count employees in that department who already have an **approved** leave request overlapping that day.
5. If `(total_headcount - already_on_leave_count - 1) < min_headcount_required` for any day in the range, the request is **blocked** — return which day(s) breach coverage.
6. Otherwise return `{ allowed: true }`.

**Output**
```json
{
  "allowed": false,
  "breaches": [
    { "date": "2026-09-03", "availableAfterApproval": 2, "minRequired": 3 }
  ]
}
```

This endpoint is called by the leave-approval UI *before* an approver acts, and again server-side inside `/api/leave/action` as a hard gate — the client-side call is advisory (UX), the server-side call is enforced.

### `POST /api/leave/action`

**Input**
```json
{ "leaveRequestId": "uuid", "action": "approve" | "reject", "comments": "optional string" }
```

**Logic**
1. Load the `leave_requests` row (service-role client — RLS bypassed).
2. `canAccess(requestingUser, leaveRequest.employee_id, 'leave', 'approve')` → must return `allow` (admin/hr, or requesting user is somewhere in the employee's manager chain per `get_reportees`). `deny` → `403`.
3. If `action === 'approve'`: re-run the coverage check from `/api/leave/check-coverage` server-side. If it fails, return `409 Conflict` with the breach details — approval is refused even though the permission check passed.
4. Update `leave_requests.status`, `reviewed_by`, `reviewed_at`, `reviewer_comments`.
5. If approved: write a new row to `leave_balances` (bitemporal deduction, `reason = 'consumption'`).
6. Fire a Realtime broadcast so the requester's dashboard updates live.

### `GET /api/org/rewind`

**Input** (query params): `?date=2026-01-15`

**Logic**
1. Query all `reporting_edges` rows where `valid_from <= date AND (valid_to IS NULL OR valid_to > date)` — this naturally includes edges later superseded in *system* time, because we're asking a business-time question ("who reported to whom on Jan 15") not a system-time one ("what did our database believe on Jan 15"). If a true system-time snapshot is needed (audit/compliance use case — "what did we believe *at the time*"), additionally filter `recorded_at <= <query-time>`, which this route does not do by default.
2. Join to `employees` for names/roles.
3. Assemble into a tree (or flat parent-pointer list) and return.

**Output**
```json
{
  "date": "2026-01-15",
  "edges": [
    { "employeeId": "uuid", "managerId": "uuid" }
  ],
  "employees": { "uuid": { "fullName": "...", "jobTitle": "..." } }
}
```

### `GET /api/payroll/slip`

**Input** (query params): `?employeeId=uuid&month=2026-08`

**Logic**
1. `canAccess(requestingUser, employeeId, 'payroll', 'read')` → self, or admin/hr, or `allow_partial` for a direct/indirect manager (manager sees the **total** but not the breakdown — see Section 8).
2. Load the `salary_records` row valid for the requested month (`valid_from <= <month-end> AND (valid_to IS NULL OR valid_to > <month-start>)`).
3. Run `computePayslip()` from `lib/payroll.ts` — the hardcoded statutory formula (Section 12) — over `basic_salary / hra / special_allowance / deductions`.
4. Return the breakdown. If the caller's access is `allow_partial`, strip line items down to `{ netSalary }` only.

---

## 8. Permission Layer

`src/lib/permissions.ts` is the single choke point every API route calls before touching another employee's data. It is what makes RLS's flat model safe to pair with manager-level access — every non-self, non-admin access is resolved here, in one place, instead of being re-derived ad hoc per route.

```ts
export type AccessResult = 'allow' | 'deny' | 'allow_partial';
export type Resource = 'leave' | 'attendance' | 'payroll' | 'profile';
export type Action = 'read' | 'approve' | 'write';

export async function canAccess(
  requestingUser: { id: string; role: 'employee' | 'hr' | 'admin' },
  targetEmployeeId: string,
  resource: Resource,
  action: Action,
): Promise<AccessResult> {
  // 1. Self access — always allowed for read; write is resource-specific
  //    (e.g. an employee can write their own attendance check-in, but
  //    never their own payroll or leave approval).
  if (requestingUser.id === targetEmployeeId) {
    if (resource === 'payroll' && action !== 'read') return 'deny';
    if (resource === 'leave' && action === 'approve') return 'deny'; // no self-approval
    return 'allow';
  }

  // 2. Admin/HR — full access to everything.
  if (requestingUser.role === 'admin' || requestingUser.role === 'hr') {
    return 'allow';
  }

  // 3. Manager path — resolve via the reporting graph, not a flat role.
  const { data: reportees } = await supabaseAdmin.rpc('get_reportees', {
    manager_uuid: requestingUser.id,
    as_of: new Date().toISOString().slice(0, 10),
  });

  const match = reportees?.find((r) => r.employee_id === targetEmployeeId);
  if (!match) return 'deny';

  // 4. In the tree, but access is narrowed by resource + depth.
  //    - attendance / leave: full allow at any depth (a manager needs
  //      full visibility into their whole tree to approve/escalate).
  //    - payroll: allow_partial — a manager sees a report's net salary
  //      exists and its total, never the line-item breakdown. Only
  //      admin/HR or the employee themself get the full breakdown.
  if (resource === 'payroll') return 'allow_partial';
  return 'allow';
}
```

Every API route follows the same shape:

```ts
const access = await canAccess(currentUser, targetEmployeeId, 'leave', 'approve');
if (access === 'deny') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
// access === 'allow' or 'allow_partial' -> proceed, and if 'allow_partial',
// the route itself is responsible for narrowing the response payload.
```

`allow_partial` is a route-level contract, not enforced by `canAccess` itself — each route that can return `allow_partial` must know how to strip its own response down. This is intentional: the permission layer decides *whether and how much*, the route decides *what the narrowed shape looks like*, because that shape is resource-specific.

---

## 9. Escalation System

Leave requests that sit `pending` past a 48-hour SLA auto-escalate to the requester's **skip-level manager** (their manager's manager). Two pieces: a `pg_cron` job that does the SQL-side detection and state change, and an Edge Function it triggers for the actual notification send.

### pg_cron job

```sql
create or replace function public.escalate_overdue_leave_requests()
returns void
language plpgsql
security definer
as $$
declare
  req record;
  skip_level_manager_id uuid;
begin
  for req in
    select lr.id, lr.employee_id, lr.approver_id
    from public.leave_requests lr
    where lr.status = 'pending'
      and lr.escalated = false
      and lr.sla_deadline < now()
  loop
    -- resolve skip-level manager: the manager of req.approver_id,
    -- valid today. If approver has no manager (top of tree), fall back
    -- to any 'admin' role employee.
    select re.manager_id into skip_level_manager_id
    from public.reporting_edges re
    where re.employee_id = req.approver_id
      and re.superseded_at is null
      and re.valid_from <= current_date
      and (re.valid_to is null or re.valid_to > current_date)
    limit 1;

    if skip_level_manager_id is null then
      select id into skip_level_manager_id
      from public.employees
      where role = 'admin'
      limit 1;
    end if;

    update public.leave_requests
    set status = 'escalated',
        escalated = true,
        escalated_at = now(),
        escalated_to = skip_level_manager_id,
        updated_at = now()
    where id = req.id;

    -- trigger the Edge Function asynchronously via pg_net
    perform net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'leave_escalated',
        'leaveRequestId', req.id,
        'notifyEmployeeId', skip_level_manager_id
      )
    );
  end loop;
end;
$$;

-- Runs every 15 minutes.
select cron.schedule(
  'escalate-overdue-leave',
  '*/15 * * * *',
  $$select public.escalate_overdue_leave_requests();$$
);
```

### Edge Function trigger flow

```
pg_cron (every 15 min)
  └─ escalate_overdue_leave_requests()
       ├─ finds leave_requests past sla_deadline, still pending
       ├─ resolves skip-level manager via reporting_edges (one hop up
       │    from the original approver, "as of" today)
       ├─ UPDATEs leave_requests: status='escalated', escalated=true,
       │    escalated_at=now(), escalated_to=<skip-level manager>
       └─ pg_net.http_post → Edge Function `send-notification`
                                    │
                                    ▼
                       supabase/functions/send-notification/index.ts
                       ├─ validates the service-role bearer token
                       ├─ looks up notification channel for the target
                       │    employee (email, if set up)
                       └─ sends via Resend (or console.log — see Section 12)
```

`send-notification` is a thin Edge Function — it does no business logic itself, it's purely "given a `type` and a target employee, deliver a message." All the decision-making (who, when, why) already happened in the SQL function.

---

## 10. Key Differentiators (Technical)

### Bitemporal storage

**What:** `reporting_edges`, `salary_records`, and `leave_balances` never `UPDATE` their substantive columns — they track two independent time axes:

- **Valid time** (`valid_from` / `valid_to`): when the fact was true in the real world ("Priya reported to Raj from Jan 1 to Aug 1").
- **Transaction time** (`recorded_at` / `superseded_at`): when our database came to know/believe that fact.

**Why it matters:** without the second axis, a backdated correction ("we entered the wrong manager, fix it retroactively") destroys the ability to answer "what did the system believe on the day the original approval happened" — which matters for audit trails and for explaining *why* an old approval routed to a particular manager. With both axes, `/api/org/rewind` can answer "who reported to whom on date X" (valid time) and, if extended with a `recorded_at` filter, "what did we believe about date X, as of date Y" (transaction time) — two genuinely different questions a single-timestamp `updated_at` column cannot distinguish.

**Where it lives:** the append-only write pattern in Section 4, and the bitemporal `WHERE` clause inside `get_reportees()` (Section 6).

### Relationship-based access control (vs flat RBAC)

**What:** access for the "manager" case is not a role column — it's a live graph query (`get_reportees`) over `reporting_edges`, walked recursively and bitemporally.

**Why it matters:** a flat `role = 'manager'` column can't express "manager of *this specific person*," and reorgs happen constantly — a hardcoded manager list goes stale the moment someone changes teams. By resolving the tree at request time (as of the current date, or a historical date for `/api/org/rewind`), permission checks always reflect the current org chart without a migration or manual re-grant.

**Where it lives:** `canAccess()` (Section 8) calling `get_reportees()` (Section 6) — this is the entire mechanism; there is no separate "manager" table or role to keep in sync.

### Coverage-aware leave approval

**What:** `/api/leave/check-coverage` (Section 7) runs a constraint algorithm — count already-approved overlapping leave in the department, compare against `team_coverage_config.min_headcount_required` — and can block an approval a manager would otherwise grant.

**Why it matters:** leave approval in most HRMS tools is a single boolean the approver controls unilaterally. Dayflow treats "is the team still staffed" as a hard constraint independent of the approver's judgment — the approver can *want* to approve and still be told no, because five other people on the same team already got approved for overlapping dates.

**Where it lives:** `lib/coverage.ts` (the algorithm) called from both `/api/leave/check-coverage` (advisory, pre-approval UX) and `/api/leave/action` (enforced, server-side gate at the moment of approval).

---

## 11. Auth Flow

```
1. User signs up (email + password) via Supabase Auth
        │
        ▼
2. Trigger on auth.users insert creates a matching public.employees row
   with role = 'employee' (hardcoded default — NOT read from the signup form)
        │
        ▼
3. Email verification required before first sign-in
        │
        ▼
4. User signs in → lands on /dashboard as an 'employee'
   (own profile, own attendance, apply for leave — nothing else)
        │
        ▼
5. An existing admin/hr user promotes the account:
   UPDATE employees SET role = 'hr' WHERE id = $1
   (via an admin-only UI action, itself gated by canAccess / RLS admin policy)
        │
        ▼
6. On next session refresh, the promoted user's role-gated UI/API access
   reflects 'hr' (or 'admin')
```

```sql
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
    'employee'  -- always. Never read a client-supplied role.
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Why self-assigned role at signup is a security hole:** if the signup form includes a "role" field (as the original product spec's "Role (Employee / HR)" selector implies) and that value is trusted and written to `employees.role` at insert time, any anonymous person can `POST` to the signup endpoint with `role: 'hr'` and grant themselves HR-level access to every other employee's salary, leave approvals, and personal data — no verification, no gate, just a client-controlled field landing directly in an authorization-relevant column. This is a classic mass-assignment / privilege-escalation bug, and it's easy to miss because the signup form *looks* like it's just collecting a preference.

**How this design avoids it:** the database trigger (`handle_new_user`) is the only path that can insert a row into `employees`, and it hardcodes `role = 'employee'` — it never reads `raw_user_meta_data` (or anything else client-supplied) for the role field. The signup form can still show a "Role" dropdown for UX/informational purposes, but that value must never be forwarded to a column the trigger uses. Promotion to `hr`/`admin` is only reachable through an authenticated admin action, itself gated by the `employees_update_self_or_admin` RLS policy (Section 5) — so escalating privilege requires an *existing* admin to do it, not a new signup.

---

## 12. What Is Faked / Seeded

Being upfront about what's hardcoded for the hackathon demo, so nobody mistakes it for production-ready:

| Piece | What's actually happening | What real production would need |
|---|---|---|
| **Statutory payroll breakdown** | `lib/payroll.ts` computes HRA/deductions with a fixed formula (e.g. flat 12% PF, flat 10% TDS slab) — not driven by actual tax tables, regional statutory rules, or an employee's tax declarations | Integration with a real payroll/statutory-compliance engine, per-jurisdiction tax tables, employee-submitted tax declarations |
| **Coverage config** (`team_coverage_config`) | Seeded once from a fixture in `supabase/migrations/0005_seed_coverage_config.sql` — a fixed `min_headcount_required` per department, entered by hand | An admin UI to manage coverage rules per team, historized (itself arguably bitemporal) |
| **Notifications** | `lib/email/mailer.ts` sends real transactional emails over Gmail's SMTP relay (via nodemailer) for employee welcome, leave submitted, and leave approved/rejected (Next.js API routes); the `send-notification` Edge Function sends the pg_cron leave-escalation email the same way (via denomailer, Deno's SMTP client). Both fall back to `console.log` if `GMAIL_USER`/`GMAIL_APP_PASSWORD` are unset (zero-config demo path) | Delivery tracking/retries, richer HTML templates, and a deployed (not just written) Edge Function in every environment |

None of these are architectural shortcuts in the access-control or data-model sense — the bitemporal schema, RLS boundary, `get_reportees` graph, and `canAccess` permission layer are all real. The fakes above are strictly "we didn't have time to integrate a third-party statutory/notification system for a hackathon," and swapping them out later doesn't require touching the schema or the permission layer.
