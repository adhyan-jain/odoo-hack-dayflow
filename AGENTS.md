<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository Guidelines

## Project Overview

**Dayflow** is an HRMS (Human Resource Management System) built with Next.js 16 (App Router, `src/` layout, TypeScript) and Supabase (Postgres, Auth, RLS, pg_cron). Core features: employee profiles, attendance tracking, leave requests with SLA-based escalation, and payroll. Three technical bets differentiate it: **bitemporal storage** (org chart and salary history), **graph-based access control** (manager-over-reportee, not a flat role check), and **coverage-aware leave approval** (department minimum-headcount gating).

`dayflow-hrms-ui/` is a **separate, superseded prototype** — a Google AI Studio–generated Vite+React app used as the visual/UX design source of truth. It has no Supabase wiring (mock data + `@google/genai` only), its own `package.json`/`tsconfig.json`/toolchain, and is excluded from the root `tsconfig.json`. Its view/modal components (`AttendanceView`, `LeaveManagementView`, `PayrollView`, etc.) were ported almost line-for-line into the real app's `src/components/{views,modals}` (only the import style changed: relative → `@/` alias). **Treat it as read-only design reference; do not build features into it.**

## Architecture & Data Flow

Know which provider mode you're touching — see the dual-mode UI provider below.

1. **Dual-mode UI provider**: `src/context/AppContext.tsx` (`'use client'`) exports `AppProvider`, which picks between two full implementations based on `NEXT_PUBLIC_BYPASS_AUTH === 'true'`: `RealAppProvider` (default — **no `.env.local` ships in the repo, so this is what runs in a fresh checkout**) authenticates via real Supabase Auth and loads all data through `src/lib/supabase/hrms.ts`; `MockAppProvider` (opt-in demo mode, `NEXT_PUBLIC_BYPASS_AUTH=true`) is the original all-`useState` implementation seeded from `src/data/mockData.ts`, kept for backend-free UI demos. Pages under `src/app/(dashboard)/*` are thin `'use client'` wrappers that read `useAppContext()` and pass typed props into `src/components/views/*` — identical in both modes, since the mock/real switch is centralized entirely in `AppContext.tsx`.
2. **Data access layer**: `src/lib/supabase/hrms.ts` bridges `RealAppProvider` to the backend — direct RLS-scoped `supabase-js` reads (`employees`, `attendance`, `leave_requests`, `leave_balances`) for simple fetches/mappers (`fetchMyEmployeeRow`, `mapEmployeeToProfile`, `loadWeeklyAttendance`, `loadPayroll`, …), plus `apiCall<T>()` wrappers around `/api/leave/apply`, `/api/leave/action`, `/api/payroll/slip` for anything needing server-side rules. `handleRunPayroll` is intentionally alert-only — no bulk payroll-run endpoint exists by design, not a stub gap.
3. **API/backend layer**: `src/app/api/*/route.ts` handlers + `src/lib/supabase/{client,server,middleware,admin}.ts` + `src/lib/{types,permissions,coverage,payroll}.ts`, backed by 11 ordered SQL migrations in `supabase/migrations/`.

**Access rule (see `ARCHITECTURE.md` §2/§7 for full detail):**
- RLS-expressible, per-row, self-or-admin/hr reads (`employees`, `attendance`, `leave_requests`, `leave_balances`, `team_coverage_config`) → query directly from Server/Client Components via `src/lib/supabase/{client,server}.ts` (RLS-bound, anon key).
- Anything needing graph traversal (manager→reportee), bitemporal "as of" logic, cross-record algorithms (coverage math), or privileged computation (payroll breakdown) → **must** go through an `app/api/*` route using `src/lib/supabase/admin.ts` (service-role, RLS-bypassed) **after** an `src/lib/permissions.ts::canAccess()` check. RLS deliberately does **not** encode manager-of-reportee access — that gap is closed only by the API layer + `get_reportees()`/`get_manager_chain()` Postgres RPCs.
- `salary_records` and `reporting_edges` must never be queried directly from the client — always via API routes.

**Bitemporal tables** (`reporting_edges`, `salary_records`, `leave_balances`): two time axes — `valid_from`/`valid_to` (business time) and `recorded_at`/`superseded_at` (system time). Append-only; a "change" is always `UPDATE old row to close it out` + `INSERT new row` in one transaction, never an in-place update of business columns. "Current" row = `valid_to IS NULL AND superseded_at IS NULL`.

**Automation**: `pg_cron` runs `escalate_overdue_leave_requests()` every 15 min (migration `20240001000010`) — finds SLA-breached pending leave requests, resolves the skip-level manager via `reporting_edges`, sets `status = 'escalated'`, and fires the `send-notification` Edge Function via `pg_net.http_post` (never rolls back the DB update on notification failure).

**Security-critical convention**: `role` is never client-settable. The `handle_new_user()` DB trigger always hardcodes `role = 'employee'` on signup; promotion to `hr`/`admin` only happens via an authenticated, RLS-gated `UPDATE` by an existing admin/hr user.

**Response envelope**: every API route returns `{ data: T | null; error: string | null }` (type `ApiResponse<T>` in `src/lib/types.ts`), with `NextResponse.json(..., { status })`.

## Key Directories

| Path | Purpose |
|---|---|
| `src/app/` | App Router routes. `(auth)/sign-in`, `(auth)/sign-up`; `auth/callback/route.ts` (OAuth/magic-link exchange); `(dashboard)/{dashboard,directory,attendance,leave,payroll,profile,settings,employees/[id]}`; `api/{leave/apply,leave/action,leave/check-coverage,org/reportees,org/rewind,payroll/slip}/route.ts` |
| `src/components/views/` | 9 page-level view components (one per dashboard tab/role variant), e.g. `EmployeeDashboardView.tsx`, `AdminDashboardView.tsx`, `LeaveManagementView.tsx` |
| `src/components/modals/` | 5 modal components (`ApplyLeaveModal`, `EditProfileModal`, `HelpModal`, `NotificationsModal`, `RunPayrollModal`) |
| `src/components/` (root) | `SideNavBar.tsx` (also exports the shared `NavTabId` union), `TopNavBar.tsx`, `MobileNavBar.tsx` |
| `src/context/AppContext.tsx` | `AppProvider` — dual-mode: `RealAppProvider` (default) wired to Supabase via `useAppContext()`; `MockAppProvider` (opt-in, `NEXT_PUBLIC_BYPASS_AUTH=true`) is pure `useState` seeded from `mockData.ts` |
| `src/data/mockData.ts` | Hardcoded demo seed data (`INITIAL_*` constants, `ALEX_PROFILE`/`SARAH_PROFILE`) |
| `src/lib/supabase/` | `client.ts` (browser, anon key), `server.ts` (RSC/API, session-bound), `middleware.ts` (`updateSession`, called from `proxy.ts`), `admin.ts` (service-role, RLS-bypassed, `import 'server-only'`) |
| `src/lib/supabase/hrms.ts` | Data-access layer used by `RealAppProvider` — RLS-scoped `supabase-js` reads/mappers (`fetchMyEmployeeRow`, `mapEmployeeToProfile`, `loadPayroll`, …) plus `apiCall<T>()` wrappers around `/api/leave/apply`, `/api/leave/action`, `/api/payroll/slip` |
| `src/lib/types.ts` | **Canonical DB-shaped types** — snake_case Postgres row interfaces, the hand-written `Database` generic, permission types, `ApiResponse<T>` |
| `src/lib/permissions.ts` | `canAccess(requestingUser, targetEmployeeId, resource, action)` — the single choke point for cross-employee access decisions |
| `src/lib/{coverage,payroll}.ts` | Coverage-constraint algorithm; payslip computation (hardcoded India statutory formulas — PF 12%, ESI 0.75% if gross < 21000, professional tax flat 200, TDS 10% if basic > 50000/mo) |
| `src/types/index.ts` | **UI-facing types** (camelCase, human-readable unions e.g. `LeaveType = 'Annual Leave' \| ...`) — deliberately different shapes from `src/lib/types.ts`; re-exports the DB types at the bottom for convenience, but API routes should import DB types from `@/lib/types` directly |
| `src/proxy.ts` | Next.js 16's `proxy` convention (replaces `middleware.ts`) — delegates to `updateSession()` for session refresh + route protection |
| `supabase/migrations/` | 11 ordered SQL files (`00000000000001_init.sql` legacy/superseded, then `20240001000001`…`20240001000010`) — schema, RLS policies, RPC functions, cron job |
| `dayflow-hrms-ui/` | Superseded Vite/AI-Studio prototype — reference only, not part of the Next.js build |

## Development Commands

Main app (repo root):
```bash
npm install
npm run dev      # next dev — http://localhost:3000, real Supabase mode by default (no .env.local ships); set NEXT_PUBLIC_BYPASS_AUTH=true for backend-free mock mode
npm run build     # next build
npm run start     # next start (production server)
npm run lint      # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

Local Supabase stack (Docker required, for wiring the real backend):
```bash
cp .env.local.example .env.local   # fill in Supabase project keys
npx supabase start                  # local Postgres/Auth/Studio on ports 54321-54324
npx supabase db reset               # reapply all migrations/ — NOTE: config.toml references ./seed.sql for db.seed.sql_paths but that file does not exist in the repo; `db reset` will fail on the seed step until one is added
```

Cloud Supabase project setup (see `SUPABASE_SETUP.md` for full walkthrough, including enabling `pg_cron`/`pg_net` extensions and the two `ALTER DATABASE` settings the escalation cron needs):
```bash
supabase login
supabase link --project-ref <ref>
supabase db push
```

There is no test script — see **Testing & QA** below.

`dayflow-hrms-ui/` (prototype, separate toolchain — only touch if explicitly asked to update the design reference):
```bash
cd dayflow-hrms-ui && npm install && npm run dev   # vite, port 3000
```

## Code Conventions & Common Patterns

- **Imports**: all internal imports in the main app use the `@/*` → `./src/*` path alias (`tsconfig.json`); no `../../` relative imports observed. `dayflow-hrms-ui` uses a *different* alias (`@/*` → repo root) — don't mix conventions between the two apps.
- **Components**: `React.FC<Props>` with a same-file `interface <Name>Props { ... }` declared immediately above the component; PascalCase filenames matching the exported component name. Modals share the `isOpen`/`onClose` + early-return guard pattern: `if (!isOpen) return null;`.
- **Client vs Server**: `'use client'` on interactive pages, layouts, context, and any component reading `useAppContext()`. Server Components are used only for the root `layout.tsx`, `app/page.tsx` (redirect-only), and route handlers (`app/api/*`, `app/auth/callback`).
- **Handlers**: `handle<Action>` functions defined at the state-owning component/context, passed down as `on<Event>` props (`onApprove`, `onSwitchUser`) — standard React convention, applied consistently in both apps.
- **API routes** (`src/app/api/*/route.ts`) follow one shape: (1) `const supabase = await createClient()` + `supabase.auth.getUser()` → 401 if unauthenticated; (2) manual JSON body parse in try/catch → 400 on malformed input; (3) manual field/enum/date validation → 400 with a specific message; (4) business logic via `supabaseAdmin` (service-role) + `canAccess()`; (5) `NextResponse.json({ data, error }, { status })` matching the `ApiResponse<T>` envelope; errors logged with `console.error('[METHOD /api/path] ...', error.message)`. **Known gap**: `GET /api/org/rewind` follows steps 1/2/5 but skips the `canAccess()` check — any authenticated user can fetch any employee's org-chart-as-of, not just managers/HR/admin. Verify this is intentional before copying the pattern for a new route.
- **Two type vocabularies, deliberately**: `src/lib/types.ts` is snake_case/DB-shaped (source of truth for API routes and Supabase generics); `src/types/index.ts` is camelCase/UI-shaped (source of truth for `mockData.ts` and view components). They model overlapping concepts with different string unions (e.g. UI `LeaveStatus = 'Pending Review'` vs DB `status = 'pending'`) — don't assume they're interchangeable; convert explicitly at the boundary when wiring real data into the UI layer.
- **`src/types/database.types.ts`** is marked `@deprecated` — a pass-through re-export from `src/lib/types.ts` kept only for old imports. Import from `@/lib/types` directly in new code.
- **Admin client usage**: `src/lib/supabase/admin.ts` is deliberately untyped (no `Database` generic) due to a known `supabase-js` issue with `Omit<>` Insert types; query results are cast with `as` at call sites (commonly paired with an inline `eslint-disable-next-line @typescript-eslint/no-explicit-any`). Never import `admin.ts` into anything browser-bundled or into a Server Component that runs before an auth/`canAccess()` check.
- **Styling**: Tailwind v4, CSS-first config (`@import "tailwindcss";` in `src/app/globals.css`, no `tailwind.config.js`). Design tokens as CSS custom properties (`--primary`, `--surface`, etc., Material-Design-3-inspired) plus bespoke arbitrary-value classes (`bg-[#5b7a6b]`) for the "warm neutral + sage" palette. Icons via Material Symbols font classes (`.material-symbols-outlined`), not an icon library.
- **State management**: no Redux/Zustand — a single React Context (`AppContext`) plus lifted `useState`, props-drilled into views/modals. `dayflow-hrms-ui` uses the same pattern but lifted into `App.tsx` directly (no Context at all there).

## Important Files

- `src/proxy.ts` — session refresh + auth route-guarding for every request (Next.js 16 proxy convention; excludes `_next/*` and static assets via `matcher`).
- `src/lib/supabase/middleware.ts` — `updateSession()`: the actual auth-gate logic (public paths, 401 for unauthenticated `/api/*`, redirect otherwise); honors `NEXT_PUBLIC_BYPASS_AUTH=true` to skip auth in local dev.
- `src/lib/permissions.ts` — `canAccess()`, the sole cross-employee authorization decision point.
- `src/lib/types.ts` — canonical `Database` type generic and all DB row shapes.
- `supabase/migrations/20240001000008_rls_policies.sql` — full RLS policy set + `is_admin_or_hr()`/`current_employee_role()` helpers.
- `supabase/migrations/20240001000009_functions.sql` — `get_reportees`, `get_manager_chain`, `get_current_salary`, `get_salary_at` RPCs (service_role only).
- `ARCHITECTURE.md` — most authoritative design doc (schema, RLS rationale, escalation flow, "what's faked" hackathon disclosures). Note: its system diagram says "Next.js 14" — stale; the actual app is Next.js 16 (confirmed by `proxy.ts` and `package.json`).
- `API_CONTRACT.md` — frontend-facing API reference with request/response shapes and curl examples for every `app/api/*` route.
- `SUPABASE_SETUP.md` — step-by-step cloud Supabase onboarding (keys, CLI link, extensions, cron settings).
- `CLAUDE.md` — single line, `@AGENTS.md` — delegates to this file as the canonical instructions doc.

## Runtime/Tooling Preferences

- **Package manager**: npm (`package-lock.json` present; no yarn/pnpm lockfile). Use `npm install`/`npm run <script>`.
- **Node/Next**: Next.js 16.3.2, React 19.2.8, TypeScript 5 (`strict: true`), Tailwind v4. `next.config.ts` has no custom options set.
- **ESLint**: flat config (`eslint.config.mjs`), extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`, no custom rules. Run `npm run lint`; no `--fix` script defined.
- **Supabase CLI**: `npx supabase ...` for local dev (Docker-backed), `supabase ...` (global install) for cloud project linking — see Development Commands above.
- `dayflow-hrms-ui/` runs on Vite 6 + its own toolchain; do not add its dependencies to the root `package.json` or vice versa — the two are intentionally isolated (root `tsconfig.json` excludes it).

## Testing & QA

**No automated test framework is configured in either app** — `package.json` (root) has no `test` script, and there are no `*.test.*`/`*.spec.*` files or Jest/Vitest config anywhere in the repo. `dayflow-hrms-ui`'s `lint` script is `tsc --noEmit` (type-check only).

Practical verification approach until a test suite exists:
- **Frontend/UI changes**: `npm run dev`, exercise the changed route/component manually. Real Supabase mode (default) needs a working local/cloud backend; set `NEXT_PUBLIC_BYPASS_AUTH=true` in `.env.local` to exercise pure UI/mock mode with no backend.
- **API routes / DB logic**: run against the local Supabase stack (`npx supabase start && npx supabase db reset`), then hit the route with `curl`/the browser and check the `{ data, error }` envelope against `API_CONTRACT.md`'s documented shape for that route.
- **Migrations**: `npx supabase db reset` re-applies all `supabase/migrations/*.sql` in filename order and re-seeds — the fastest way to confirm a new/edited migration doesn't break the chain.
- Always run `npm run lint` before finishing a change to the main app.
