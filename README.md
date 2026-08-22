# Dayflow — Human Resource Management System

Every workday, perfectly aligned.

Next.js (App Router, `src/` dir, TypeScript, Tailwind) frontend with Supabase as the backend (Postgres, Auth, RLS).

## Current Status: UI Integration

The frontend UI blueprint has been integrated into the Next.js App Router structure. Currently, the application is using mock data via a React Context (`AppContext`) to demonstrate the UI and interactions. 

### How to run the UI Demo

To run the application and view the UI, you do not need to start the Supabase backend yet.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser. You can log in using the mock profiles to see the Employee and Admin dashboards.

---

## Full Stack Setup (Supabase)

If you want to run the full stack with the backend:

1. Copy the env template and fill in your Supabase project credentials:

   ```bash
   cp .env.local.example .env.local
   ```

2. Run the local Supabase stack (requires Docker) and apply migrations:

   ```bash
   npx supabase start
   npx supabase db reset
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Project structure

```
src/
  app/
    (auth)/sign-in, (auth)/sign-up   # authentication pages
    auth/callback                    # Supabase email verification / OAuth callback
    (dashboard)/                     # authenticated area (employee + HR)
      dashboard/                     # role-aware landing dashboard
      profile/                       # view/edit personal, job, salary details
      attendance/                    # daily/weekly attendance, check-in/out
      leave/                         # apply for leave, HR approval workflow
      payroll/                       # read-only for employees, full control for HR
      employees/, employees/[id]/    # HR employee directory & detail view
  components/                        # ui, layout, dashboard, attendance, leave, payroll, employees
  lib/
    supabase/                        # client.ts (browser), server.ts (RSC), middleware.ts (session refresh)
  proxy.ts                           # session refresh + route protection (Next.js 16 proxy convention)
  types/                             # database.types.ts (Supabase schema), index.ts
  hooks/                             # client-side hooks

supabase/
  config.toml                        # local Supabase CLI config
  migrations/                        # SQL schema: employees, attendance, leave_requests, payroll + RLS
```

## Data model

- `employees` — extends `auth.users`, holds role (`employee` / `hr`), profile & job details
- `attendance` — per-employee, per-date check-in/out and status
- `leave_requests` — leave applications with type, date range, status, HR review
- `payroll` — per pay-period salary breakdown, read-only for employees

Row Level Security policies restrict employees to their own records; HR role has full read/write access.
