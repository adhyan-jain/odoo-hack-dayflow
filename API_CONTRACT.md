# Dayflow — API Contract

*Hand this document to the frontend developer. If they have to ask a question about how to call something, this document failed.*

---

## Authentication

All API routes require a valid Supabase session. The session cookie is set automatically when the user signs in. For server-to-server or manual testing, pass the JWT as a Bearer token.

### How to get the session token (frontend, supabase-js)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types'; // import from the shared types file

const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Get the current session
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token; // pass this as Authorization header
```

### How to pass it to API routes

```typescript
const response = await fetch('/api/leave/apply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // The cookie is sent automatically in same-origin requests.
    // Only needed if calling from a different origin:
    // 'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ leave_type: 'paid', from_date: '2026-09-01', to_date: '2026-09-05' }),
});
```

> **Good to know:** In a Next.js app, same-origin `fetch` calls to `/api/*` automatically include the auth cookie. The `Authorization: Bearer` header is only required for cross-origin calls (e.g. from a mobile app or a separate frontend domain).

---

## Standard Response Envelope

Every route returns this shape:

```typescript
interface ApiResponse<T> {
  data: T | null;   // null on error
  error: string | null; // null on success
}
```

HTTP status codes:
- `200` — success
- `400` — bad request (validation error, see `error` for details)
- `401` — not authenticated (no valid session)
- `403` — authenticated but not authorized (wrong role or not in manager chain)
- `404` — resource not found
- `409` — conflict (coverage constraint violated — approval refused)
- `500` — internal error (check server logs)

---

## Direct Supabase Table Access (supabase-js, RLS-bound)

The frontend can query these tables **directly via supabase-js** — RLS ensures each user only sees their own data (or all data for admin/hr):

| Table | Who can read | Who can write |
|---|---|---|
| `employees` | Self, Admin, HR | Self (own profile fields), Admin, HR |
| `attendance` | Self, Admin, HR | Self, Admin, HR |
| `leave_requests` | Self, Admin, HR | Self (insert only), Admin, HR (update) |
| `leave_balances` | Self, Admin, HR | Admin, HR |
| `team_coverage_config` | Any authenticated user | Admin, HR |

These tables **must go through the API** (do not query directly):

| Table / Feature | Why | API route to use |
|---|---|---|
| `salary_records` | Requires canAccess() to determine full vs. partial breakdown | `GET /api/payroll/slip` |
| `reporting_edges` | Graph traversal is not expressible in RLS | `GET /api/org/rewind`, `GET /api/org/reportees` |
| Manager approval | Coverage check must be enforced server-side | `POST /api/leave/action` |

---

## API Routes

---

### `POST /api/leave/apply`

Submit a new leave request. The API resolves the approver (direct manager) automatically — do not pass `approver_id`.

**Auth:** Required (any authenticated employee)

**Request body:**
```typescript
{
  leave_type: 'paid' | 'sick' | 'unpaid';
  from_date: string;  // "YYYY-MM-DD" — must not be in the past
  to_date: string;    // "YYYY-MM-DD" — must be >= from_date
  remarks?: string;   // optional, max free text
}
```

**Success response (200):**
```typescript
{
  data: {
    id: string;           // UUID of the created leave request
    employee_id: string;
    leave_type: 'paid' | 'sick' | 'unpaid';
    start_date: string;
    end_date: string;
    remarks: string | null;
    status: 'pending';
    approver_id: string | null;  // null if employee has no manager yet
    sla_deadline: string;        // ISO timestamptz, 48h from now
    escalated: false;
    escalated_at: null;
    escalated_to: null;
    reviewer_comments: null;
    reviewed_by: null;
    reviewed_at: null;
    created_at: string;
    updated_at: string;
  };
  error: null;
}
```

**Example request:**
```bash
curl -X POST https://your-app.vercel.app/api/leave/apply \
  -H 'Content-Type: application/json' \
  -d '{"leave_type":"paid","from_date":"2026-09-10","to_date":"2026-09-12","remarks":"Family trip"}'
```

**Error responses:**
```json
// 400 — past date
{ "data": null, "error": "from_date cannot be in the past" }

// 400 — invalid leave type
{ "data": null, "error": "leave_type must be one of: paid, sick, unpaid" }

// 401 — not logged in
{ "data": null, "error": "Unauthorized" }
```

---

### `POST /api/leave/action`

Approve or reject a leave request. Only the leave's approver (manager), or admin/hr, can call this. On approval, the server re-runs the coverage check as a hard gate.

**Auth:** Required (manager, admin, or hr)

**Request body:**
```typescript
{
  leave_request_id: string;          // UUID of the leave_request row
  action: 'approve' | 'reject';
  comments?: string;                 // optional reviewer note
}
```

**Success response (200):**
```typescript
{
  data: LeaveRequest;  // updated row with new status, reviewed_by, reviewed_at
  error: null;
}
```

**Error responses:**
```json
// 403 — not the manager or admin/hr
{ "data": null, "error": "Forbidden: you are not the approver for this leave request" }

// 409 — coverage constraint violated (approval refused even though permission is valid)
{
  "data": null,
  "error": "Approval refused: coverage constraint violation",
  "conflicts": [
    { "date": "2026-09-03", "availableAfterApproval": 2, "minRequired": 3 }
  ],
  "suggestedDates": [
    { "from": "2026-09-15T00:00:00.000Z", "to": "2026-09-17T00:00:00.000Z" }
  ]
}
```

**Example request:**
```bash
curl -X POST https://your-app.vercel.app/api/leave/action \
  -H 'Content-Type: application/json' \
  -d '{"leave_request_id":"uuid-here","action":"approve","comments":"Approved, enjoy!"}'
```

---

### `POST /api/leave/check-coverage`

Advisory pre-check before approval. The frontend should call this when a manager opens the approval UI to show a coverage warning. The same check is enforced again inside `/api/leave/action`.

**Auth:** Required (any authenticated user)

**Request body:**
```typescript
{
  requesting_employee_id: string;  // the employee applying for leave
  from_date: string;               // "YYYY-MM-DD"
  to_date: string;                 // "YYYY-MM-DD"
  manager_id?: string;             // optional, not used in current implementation
}
```

**Success response (200):**
```typescript
{
  data: {
    safe: boolean;
    conflicts: Array<{
      date: string;                 // "YYYY-MM-DD"
      availableAfterApproval: number;
      minRequired: number;
    }>;
    suggestedDates: Array<{
      from: Date;
      to: Date;
    }>;
  };
  error: null;
}
```

**Example — safe (no conflicts):**
```json
{ "data": { "safe": true, "conflicts": [], "suggestedDates": [] }, "error": null }
```

**Example — conflict with suggestions:**
```json
{
  "data": {
    "safe": false,
    "conflicts": [
      { "date": "2026-09-03", "availableAfterApproval": 1, "minRequired": 3 }
    ],
    "suggestedDates": [
      { "from": "2026-09-16T00:00:00.000Z", "to": "2026-09-18T00:00:00.000Z" }
    ]
  },
  "error": null
}
```

---

### `GET /api/org/rewind`

Returns the full org chart as it existed on a given date. Powers the time-travel slider on the org chart page.

**Auth:** Required (any authenticated user)

**Query params:**
```
?as_of=YYYY-MM-DD   (optional, defaults to today)
```

**Success response (200):**
```typescript
{
  data: {
    date: string;      // "YYYY-MM-DD" — the queried date

    // Nested tree — top-level nodes are employees with no manager on that date
    tree: OrgNode[];

    // Flat edge list for alternative rendering (D3, etc.)
    edges: Array<{
      employeeId: string;
      managerId: string;
    }>;

    // Employee profiles keyed by UUID — for quick lookups when rendering edges
    employees: Record<string, {
      full_name: string;
      job_title: string | null;
      department: string | null;
      role: 'employee' | 'hr' | 'admin';
    }>;
  };
  error: null;
}

// OrgNode (recursive):
interface OrgNode {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  role: 'employee' | 'hr' | 'admin';
  reports: OrgNode[];   // direct reports, each with their own reports (recursive)
}
```

**Example response:**
```json
{
  "data": {
    "date": "2026-08-01",
    "tree": [
      {
        "id": "uuid-ceo",
        "full_name": "Aanya Sharma",
        "job_title": "CEO",
        "department": "Executive",
        "role": "admin",
        "reports": [
          {
            "id": "uuid-vp-eng",
            "full_name": "Rohan Mehta",
            "job_title": "VP Engineering",
            "department": "Engineering",
            "role": "hr",
            "reports": [
              {
                "id": "uuid-eng-1",
                "full_name": "Priya Nair",
                "job_title": "Software Engineer",
                "department": "Engineering",
                "role": "employee",
                "reports": []
              }
            ]
          }
        ]
      }
    ],
    "edges": [
      { "employeeId": "uuid-vp-eng", "managerId": "uuid-ceo" },
      { "employeeId": "uuid-eng-1", "managerId": "uuid-vp-eng" }
    ],
    "employees": {
      "uuid-ceo":    { "full_name": "Aanya Sharma", "job_title": "CEO", "department": "Executive", "role": "admin" },
      "uuid-vp-eng": { "full_name": "Rohan Mehta",  "job_title": "VP Engineering", "department": "Engineering", "role": "hr" },
      "uuid-eng-1":  { "full_name": "Priya Nair",   "job_title": "Software Engineer", "department": "Engineering", "role": "employee" }
    }
  },
  "error": null
}
```

**Example request:**
```bash
curl 'https://your-app.vercel.app/api/org/rewind?as_of=2026-01-15'
```

---

### `GET /api/org/reportees`

Returns all direct + indirect reports of the calling user, enriched with employee profiles and their depth in the tree (1 = direct, 2 = skip-level, etc.).

**Auth:** Required (any authenticated employee; returns empty list if no reports)

**Query params:**
```
?as_of=YYYY-MM-DD   (optional, defaults to today)
```

**Success response (200):**
```typescript
{
  data: {
    asOf: string;
    reportees: Array<Employee & { depth: number }>;
    // depth=1 → direct report
    // depth=2 → report of a direct report (skip-level)
    // etc.
  };
  error: null;
}

// Employee shape:
interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  role: 'employee' | 'hr' | 'admin';
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department: string | null;
  date_of_joining: string | null;
  profile_picture_url: string | null;
  compensation_visibility: boolean;
  created_at: string;
  updated_at: string;
  depth: number;  // added to the Employee type for this endpoint
}
```

---

### `GET /api/payroll/slip`

Returns a computed salary slip. What the caller receives depends on their access level:
- **Self / Admin / HR** → full breakdown (all line items)
- **Manager (without `compensation_visibility`)** → `{ employeeId, month, netSalary }` only

**Auth:** Required

**Query params:**
```
?employee_id=UUID    (optional — defaults to the calling user's own slip)
?month=YYYY-MM       (optional — defaults to current month)
```

**Full response (200) — self, admin, hr:**
```typescript
{
  data: {
    employeeId: string;
    month: string;           // "YYYY-MM"
    // Gross components
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    grossSalary: number;
    // Statutory deductions (hackathon formulas — see ARCHITECTURE.md §12)
    pf: number;              // 12% of basicSalary
    esi: number;             // 0.75% of gross if gross < 21000, else 0
    professionalTax: number; // 200 (Maharashtra flat slab)
    tds: number;             // 10% of basic if basic > 50000, else 0
    otherDeductions: number; // from salary_records.deductions
    totalDeductions: number;
    netSalary: number;
  };
  error: null;
}
```

**Partial response (200) — manager without compensation_visibility:**
```typescript
{
  data: {
    employeeId: string;
    month: string;
    netSalary: number;  // only this field
  };
  error: null;
}
```

**Error responses:**
```json
// 403 — not authorized (e.g. querying another employee's slip as a regular employee)
{ "data": null, "error": "Forbidden" }

// 404 — no salary record for that month
{ "data": null, "error": "No salary record found for employee <id> in 2026-08" }
```

**Example request:**
```bash
# Own slip
curl 'https://your-app.vercel.app/api/payroll/slip?month=2026-08'

# Someone else's slip (admin only)
curl 'https://your-app.vercel.app/api/payroll/slip?employee_id=uuid-here&month=2026-08'
```

---

## TypeScript Types (import from `@/lib/types`)

The full type file is at `src/lib/types.ts`. Key imports the frontend will use:

```typescript
import type {
  // Enum types
  UserRole,          // 'employee' | 'hr' | 'admin'
  LeaveType,         // 'paid' | 'sick' | 'unpaid'
  LeaveStatus,       // 'pending' | 'approved' | 'rejected' | 'escalated'
  AttendanceStatus,  // 'present' | 'absent' | 'half_day' | 'leave'

  // Table row types
  Employee,
  Attendance,
  LeaveRequest,
  SalaryRecord,
  LeaveBalance,
  TeamCoverageConfig,
  ReportingEdge,

  // API response types
  PayslipBreakdown,
  OrgNode,
  OrgRewindResponse,
  CoverageResult,
  CoverageBreach,
  DateRange,

  // Generic envelope
  ApiResponse,

  // For supabase-js generic
  Database,
} from '@/lib/types';
```

### Initializing the browser supabase client (frontend):

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types';

const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

---

## Common Integration Patterns

### Querying own leave requests (supabase-js direct, RLS handles filtering):
```typescript
const { data, error } = await supabase
  .from('leave_requests')
  .select('*')
  .order('created_at', { ascending: false });
// Returns only the calling user's leave requests (RLS enforced)
```

### Checking leave balance:
```typescript
const { data } = await supabase
  .from('leave_balances')
  .select('leave_type, balance_days')
  .is('valid_to', null)
  .is('superseded_at', null);
// Returns current balances (valid_to IS NULL = current record)
```

### Submitting attendance:
```typescript
const { data, error } = await supabase
  .from('attendance')
  .upsert({
    employee_id: userId,
    date: '2026-08-22',
    check_in: new Date().toISOString(),
    status: 'present',
  }, { onConflict: 'employee_id,date' });
```

### Reading coverage config (for UI hints):
```typescript
const { data } = await supabase
  .from('team_coverage_config')
  .select('department, min_headcount_required');
// Any authenticated user can read this (coverage config is not sensitive)
```

---

## Notes / Known Limitations

1. **Salary records are not directly readable** via supabase-js — the RLS policy technically allows self-reads, but go through `/api/payroll/slip` for the computed breakdown. Direct queries return raw numbers without the statutory deductions applied.

2. **Manager approval cannot be done via supabase-js** `update()` — the `leave_requests_update_admin_only` RLS policy will reject it. Always use `POST /api/leave/action`.

3. **Org chart traversal (get_reportees)** — the RPC is callable via `supabase.rpc('get_reportees', {...})`, but only returns UUIDs. Use `/api/org/reportees` to get enriched employee profiles.

4. **The `role` column in employees is NOT a manager flag** — a user being someone's manager is determined by the `reporting_edges` table, not their `role` value. `role` is only `employee | hr | admin`.
