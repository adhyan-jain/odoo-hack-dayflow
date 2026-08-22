# Dayflow — Human Resource Management System

Every workday, perfectly aligned.

Next.js (App Router, `src/` dir, TypeScript, Tailwind) frontend with Supabase as the backend (Postgres, Auth, RLS).

## Current Status: Full Stack (Supabase Auth + Postgres, RLS-scoped)

The frontend is wired to Supabase end to end: real email/password auth, and every
dashboard (profile, attendance, leave, payroll, directory) reads/writes Postgres
through `src/lib/supabase/hrms.ts`, scoped entirely by Row Level Security — the
client never branches on role to decide what data it's allowed to see.

A demo mode is also built in (`NEXT_PUBLIC_BYPASS_AUTH=true`, the default in
`.env.local`): it skips Supabase entirely and drives the UI off in-memory mock
data (`src/data/mockData.ts`) so the interface can be reviewed instantly, with
zero backend setup.

### 1. Run the UI demo (no backend required)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `NEXT_PUBLIC_BYPASS_AUTH=true`
(default), sign in with either mock persona (Alex — Employee, Sarah — Admin) to explore
both dashboards against static data — nothing is persisted.

### 2. Run against the real backend

1. Copy the env template and fill in your Supabase project credentials:

   ```bash
   cp .env.local.example .env.local
   ```

2. Apply the schema. The Supabase CLI has no Windows x64 binary, so apply it via
   the Dashboard instead — open your project's **SQL Editor** and run, **in order**:

   - `supabase/migrations/00000000000001_init.sql`
   - `supabase/migrations/00000000000002_hrms_extensions.sql`

   (If you do have the CLI and a linked project: `supabase db push` applies both.)

   The second migration adds an `on_auth_user_created` trigger, so signing up
   alone provisions a matching `employees` row — no manual HR step needed.

3. Set `NEXT_PUBLIC_BYPASS_AUTH=false` in `.env.local` and restart the dev server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:3000/sign-up](http://localhost:3000/sign-up), create an
   account (pick Employee or HR Admin), and you land on a dashboard backed entirely
   by your Supabase project.


## Project structure

```
src/
  app/
    (auth)/sign-in, (auth)/sign-up   # real Supabase auth + demo-mode UI (AuthView)
    auth/callback                    # Supabase email verification / OAuth callback
    (dashboard)/                     # authenticated area (employee + HR)
      dashboard/                     # role-aware landing dashboard
      profile/                       # view/edit personal, job, salary details
      attendance/                    # daily/weekly attendance, check-in/out
      leave/                         # apply for leave, HR approval workflow
      payroll/                       # read-only for employees, full control for HR
      employees/, employees/[id]/    # HR employee directory & detail view (stub)
  components/                        # views/, modals/, SideNavBar, TopNavBar, MobileNavBar
  context/
    AppContext.tsx                   # MockAppProvider (demo) / RealAppProvider (Supabase), picked by NEXT_PUBLIC_BYPASS_AUTH
  lib/
    supabase/
      client.ts, server.ts           # browser / RSC Supabase clients
      middleware.ts                  # session refresh + route protection (honors NEXT_PUBLIC_BYPASS_AUTH)
      hrms.ts                        # data layer: DB rows <-> frontend types, all CRUD + derived views
  proxy.ts                           # Next.js 16 proxy convention wrapping middleware.ts
  types/                             # database.types.ts (Supabase schema), index.ts (frontend domain types)

supabase/
  config.toml                        # local Supabase CLI config
  migrations/
    00000000000001_init.sql          # base schema: employees, attendance, leave_requests, payroll + RLS
    00000000000002_hrms_extensions.sql # profile fields, lunch punches, leave taxonomy, signup trigger, directory view
```

## Data model

- `employees` — extends `auth.users`; role (`employee` / `hr`), profile/job/compensation fields, `leave_balance_days`
- `attendance` — per-employee, per-date check-in/lunch/check-out timestamps + status
- `leave_requests` — leave applications (`annual`/`sick`/`personal`/`maternity_paternity`), status, HR review
- `payroll` — per pay-period salary breakdown, read-only for employees
- `employee_directory` — a view exposing only non-sensitive columns (name, dept, title, avatar), grant-visible to every
  authenticated user, so the company directory works without loosening the `employees` table's row-level security

Row Level Security policies restrict employees to their own records (HR has full read/write access); approved leave
requests are additionally visible company-wide for basic out-of-office awareness. A `handle_new_user` trigger
auto-provisions an `employees` row from `auth.users` metadata on sign-up.
