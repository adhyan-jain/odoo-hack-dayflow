# Dayflow — Supabase Project Setup Guide

*For someone who has never used Supabase before. Read every step before clicking anything.*

---

## What Is Supabase?

Supabase is a hosted Postgres database with a REST/realtime layer on top, plus a built-in Auth service. For Dayflow, it plays three roles:
1. **Auth** — handles sign-up, login, JWTs
2. **Database** — hosts all your tables with Row Level Security
3. **RPCs / Edge Functions** — custom SQL functions and serverless functions

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up (or sign in).
2. Click **"New project"** (green button, top right of the dashboard).
3. Fill in:
   - **Organization** — create one with your name if this is your first project
   - **Project name** — `dayflow` (or anything you like)
   - **Database password** — generate a strong one and **save it** somewhere safe. You need it to connect to the database directly (e.g. with `psql`). You cannot retrieve it later.
   - **Region** — pick the one closest to your users (e.g. `ap-south-1` for India)
4. Click **"Create new project"**. Wait ~2 minutes for provisioning.

---

## Step 2 — Find Your Project Keys

Once your project is ready:

1. Click **"Project Settings"** in the left sidebar (gear icon, bottom).
2. Click **"API"** in the Settings submenu.
3. You will see:

   | What you see on screen | What it maps to in .env.local |
   |---|---|
   | **Project URL** (looks like `https://abcdefghijkl.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
   | **anon public** key (under "Project API keys") | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | **service_role secret** key (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **Never commit `SUPABASE_SERVICE_ROLE_KEY` to git.** It bypasses all Row Level Security. It must only ever live in `.env.local` (which is gitignored) and in your deployment environment's secret store (Vercel → Project Settings → Environment Variables).

---

## Step 3 — Create `.env.local`

In the root of the Dayflow project (same folder as `package.json`), create a file named `.env.local` with:

```env
# Found at: Supabase Dashboard → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Found at: Supabase Dashboard → Project Settings → API → anon public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Found at: Supabase Dashboard → Project Settings → API → service_role key (click Reveal)
# NEVER expose this in the browser or commit it to git.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The `.env.local` file is already listed in `.gitignore`. Do not rename it.

---

## Step 4 — Install the Supabase CLI

The CLI lets you push migrations from your local `supabase/migrations/` folder to your cloud project.

### On macOS / Linux (using Homebrew):
```bash
brew install supabase/tap/supabase
```

### On Linux (without Homebrew):
```bash
# Option A — via npm (works everywhere Node is installed)
npm install -g supabase

# Option B — direct binary download (https://github.com/supabase/cli/releases)
# Download the .deb or .tar.gz for your architecture and install manually.
```

Verify:
```bash
supabase --version
# should print something like: 1.x.x
```

---

## Step 5 — Log In to the CLI

```bash
supabase login
```

This opens a browser window asking you to authorize the CLI with your Supabase account. Click "Authorize". You only need to do this once per machine.

---

## Step 6 — Link the CLI to Your Project

You need your **Project Reference ID** (the `abcdefghijkl` part of `https://abcdefghijkl.supabase.co`).

Find it at: **Supabase Dashboard → Project Settings → General → Reference ID**

Then run from the root of the Dayflow project:

```bash
supabase link --project-ref your-project-ref-here
```

It will ask for your database password (from Step 1). Type it in.

---

## Step 7 — Enable Required Extensions

Before running migrations, enable two extensions in the Supabase Dashboard:

### pg_cron (required for the leave escalation job)
1. Go to: **Supabase Dashboard → Database → Extensions**  
   (Direct URL: `https://supabase.com/dashboard/project/<your-ref>/database/extensions`)
2. Search for `pg_cron`
3. Click the toggle to **Enable** it

### pg_net (required for calling Edge Functions from SQL)
1. Same Extensions page
2. Search for `pg_net`
3. Click the toggle to **Enable** it

> **Why?** Migration `010_escalation_cron.sql` uses `pg_cron` to schedule the SLA escalation job and `pg_net` to fire the Edge Function notification. If these extensions aren't enabled before migration, the migration will fail.

---

## Step 8 — Configure Postgres Settings for the Cron Job

The escalation cron job needs two runtime settings to know where to call the Edge Function. Run these in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query):

```sql
-- Replace <your-project-ref> with your actual ref (e.g. abcdefghijkl)
alter database postgres
  set "app.settings.edge_function_url" = 'https://<your-project-ref>.supabase.co/functions/v1';

-- Replace with your actual service_role key (same one from Step 2)
-- NOTE: This embeds the key in a database setting. For production, use
-- Supabase Vault (Dashboard → Vault) instead of this plaintext approach.
alter database postgres
  set "app.settings.service_role_key" = 'your-service-role-key-here';
```

> ⚠️ If you skip this step, the cron migration will still run, but the scheduled function will throw an error when it tries to call the Edge Function. For a demo where notifications aren't critical, this is acceptable — the leave escalation status update still happens, only the notification fails.

---

## Step 9 — Run Migrations

From the root of the Dayflow project:

```bash
supabase db push
```

This runs all migration files in `supabase/migrations/` in order (sorted by filename). You should see each migration applied:

```
Applying migration 00000000000001_init.sql...
Applying migration 20240001000001_employees.sql...
...
Applying migration 20240001000010_escalation_cron.sql...
Migration complete.
```

> **If a migration fails:** The error message will name the specific SQL statement. Common causes:
> - Extension not enabled (pg_cron/pg_net) — go back to Step 7
> - Enum already exists — the first migration drops and recreates enums; if you ran partial migrations before, you may need to reset: `supabase db reset` (drops everything and re-applies all migrations from scratch)

---

## Step 10 — Verify the Schema

In the Supabase Dashboard → **Table Editor**, you should see:

- `employees`
- `reporting_edges`
- `salary_records`
- `attendance`
- `leave_requests`
- `leave_balances`
- `team_coverage_config` (with 4 seed rows already present)

In **Database → Functions**, you should see:
- `get_reportees`
- `get_manager_chain`
- `get_current_salary`
- `get_salary_at`
- `escalate_overdue_leave_requests`
- `handle_new_user`

In **Database → Cron Jobs** (or Extensions → pg_cron), you should see:
- `escalate-overdue-leave` running every 15 minutes

---

## Step 11 — Test Authentication

1. Go to **Authentication → Users** in the dashboard
2. Click **"Invite user"** or use the sign-up flow in your running app (`npm run dev` → `/sign-up`)
3. After sign-up, the `handle_new_user` trigger automatically creates a row in `employees` with `role='employee'`
4. Check the **Table Editor → employees** to confirm the row appeared

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `supabase db push` fails with "enum already exists" | Old migration left partial state | Run `supabase db reset` (drops everything, re-applies all) |
| `supabase link` fails | Wrong project ref or password | Double-check Project Settings → General → Reference ID |
| API routes return 500 with "service_role key missing" | `.env.local` not created | Create it from `.env.local.example` |
| `handle_new_user` trigger not firing | Trigger wasn't applied | Re-run `supabase db push` or check Database → Triggers |
| Cron job errors in pg_cron logs | `app.settings.*` not set | Run the `ALTER DATABASE` statements from Step 8 |
