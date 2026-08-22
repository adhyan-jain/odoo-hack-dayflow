/**
 * Data access layer bridging the real Dayflow backend (see API_CONTRACT.md) and
 * the frontend's domain types (src/types/index.ts).
 *
 * Two access patterns, per API_CONTRACT.md's "Direct Supabase Table Access" table:
 *  - employees / attendance / leave_requests / leave_balances / team_coverage_config
 *    are queried directly via supabase-js; Postgres RLS scopes what comes back
 *    (self, or everything for admin/hr) — this file never branches on role to
 *    decide *what* a query returns.
 *  - salary_records (computed payslip), leave approval, and org-graph reads go
 *    through the /api/* routes, because they need server-side business logic
 *    (statutory deductions, coverage checks, graph traversal) that RLS can't
 *    express.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Employee,
  Attendance as DbAttendance,
  LeaveRequest as DbLeaveRequest,
  LeaveBalance,
  LeaveType as DbLeaveType,
  LeaveStatus as DbLeaveStatus,
  PayslipBreakdown,
} from "@/lib/types";
import type {
  UserProfile,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  AttendancePunch,
  DayAttendance,
  ActivityItem,
  PendingApproval,
  EmployeeRosterItem,
  PayrollRecord,
} from "@/types";

// No `<Database>` generic — see lib/supabase/client.ts for why. Query results
// are cast to the domain types below (matching lib/supabase/admin.ts's pattern).
export type Client = SupabaseClient;

// ---------------------------------------------------------------------------
// Enum mapping — DB has 3 leave types / 4 statuses; the UI mirrors them 1:1.
// ---------------------------------------------------------------------------
const LEAVE_TYPE_TO_DB: Record<LeaveType, DbLeaveType> = {
  "Paid Leave": "paid",
  "Sick Leave": "sick",
  "Unpaid Leave": "unpaid",
};
const LEAVE_TYPE_FROM_DB: Record<DbLeaveType, LeaveType> = {
  paid: "Paid Leave",
  sick: "Sick Leave",
  unpaid: "Unpaid Leave",
};
const LEAVE_STATUS_FROM_DB: Record<DbLeaveStatus, LeaveStatus> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const fmtDate = (iso: string | null): string =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";

const fmtTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

const todayStr = (): string => new Date().toISOString().slice(0, 10);

function tenureOf(joinDateIso: string | null): string {
  if (!joinDateIso) return "—";
  const start = new Date(joinDateIso);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

function avatarFor(name: string, url: string | null): string {
  return url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`;
}

// ---------------------------------------------------------------------------
// /api/* helper — every route returns { data, error } (API_CONTRACT.md).
// ---------------------------------------------------------------------------
async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const json = (await res.json()) as { data: T | null; error: string | null };
  if (!res.ok || json.error) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Raw fetchers — RLS scopes the rows returned.
// ---------------------------------------------------------------------------
export async function fetchMyEmployeeRow(supabase: Client, userId: string): Promise<Employee> {
  const { data, error } = await supabase.from("employees").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

/** RLS: admin/hr get every employee; a regular employee gets only their own row. */
export async function fetchEmployeesFull(supabase: Client): Promise<Employee[]> {
  const { data, error } = await supabase.from("employees").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeaveRequests(supabase: Client): Promise<DbLeaveRequest[]> {
  const { data, error } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAttendanceRange(supabase: Client, employeeId: string, from: string, to: string): Promise<DbAttendance[]> {
  const { data, error } = await supabase.from("attendance").select("*").eq("employee_id", employeeId).gte("date", from).lte("date", to);
  if (error) throw error;
  return data ?? [];
}

/** Today's attendance for every employee visible to the caller (RLS-scoped) — HR "present today" stat. */
export async function fetchAttendanceToday(supabase: Client): Promise<DbAttendance[]> {
  const { data, error } = await supabase.from("attendance").select("*").eq("date", todayStr());
  if (error) throw error;
  return data ?? [];
}

/** Current (non-superseded) balance rows for one employee, across all leave types. */
export async function fetchLeaveBalances(supabase: Client, employeeId: string): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employeeId)
    .is("valid_to", null)
    .is("superseded_at", null);
  if (error) throw error;
  return data ?? [];
}

/** The employee's current direct manager, if the caller is allowed to read that manager's row (self/admin/hr — RLS). */
export async function fetchMyManager(supabase: Client, employeeId: string): Promise<Employee | null> {
  const today = todayStr();
  const { data: edge } = await supabase
    .from("reporting_edges")
    .select("manager_id")
    .eq("employee_id", employeeId)
    .is("superseded_at", null)
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gt.${today}`)
    .maybeSingle();
  if (!edge?.manager_id) return null;

  const { data: manager } = await supabase.from("employees").select("*").eq("id", edge.manager_id).maybeSingle();
  return manager ?? null; // null both when unset and when RLS hides the manager's row (not self/admin/hr)
}

// ---------------------------------------------------------------------------
// Employee -> UserProfile
// ---------------------------------------------------------------------------
export async function computeAttendanceRate(supabase: Client, employeeId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await supabase
    .from("attendance")
    .select("status")
    .eq("employee_id", employeeId)
    .gte("date", since.toISOString().slice(0, 10));
  if (error || !data || data.length === 0) return 100;
  const present = data.filter((r) => r.status === "present" || r.status === "half_day").length;
  return Math.round((present / data.length) * 100);
}

export async function mapEmployeeToProfile(supabase: Client, emp: Employee): Promise<UserProfile> {
  const [manager, balances, rate, salaryRes] = await Promise.all([
    fetchMyManager(supabase, emp.id),
    fetchLeaveBalances(supabase, emp.id),
    computeAttendanceRate(supabase, emp.id),
    // Raw salary_records read (RLS-permitted for self/admin/hr). Only the current
    // basic/hra/special_allowance figures — the statutory payslip breakdown goes
    // through /api/payroll/slip (see fetchPayslip below), never computed here.
    supabase
      .from("salary_records")
      .select("basic_salary, hra, special_allowance")
      .eq("employee_id", emp.id)
      .is("valid_to", null)
      .is("superseded_at", null)
      .maybeSingle(),
  ]);
  const salary = salaryRes.data;

  return {
    id: emp.id,
    name: emp.full_name,
    role: emp.role,
    title: emp.job_title ?? "—",
    department: emp.department ?? "—",
    employeeId: emp.employee_code,
    email: emp.email,
    phone: emp.phone ?? "",
    address: emp.address ?? "",
    joinDate: fmtDate(emp.date_of_joining),
    tenure: tenureOf(emp.date_of_joining),
    manager: manager
      ? { name: manager.full_name, title: manager.job_title ?? "—", avatar: avatarFor(manager.full_name, manager.profile_picture_url) }
      : { name: "—", title: "—", avatar: "" },
    salary: { base: salary?.basic_salary ?? 0, hra: salary?.hra ?? 0, specialAllowance: salary?.special_allowance ?? 0 },
    avatar: avatarFor(emp.full_name, emp.profile_picture_url),
    leaveBalanceDays: balances.reduce((sum, b) => sum + Number(b.balance_days), 0),
    attendanceRate: rate,
  };
}

// ---------------------------------------------------------------------------
// Directory / roster — same RLS-scoped employees read powers both the HR
// roster panel and the company directory (a plain employee simply sees only
// their own row back, by design; see RLS migration 008).
// ---------------------------------------------------------------------------
export async function loadEmployeeRoster(supabase: Client): Promise<EmployeeRosterItem[]> {
  const [employees, leaveRows] = await Promise.all([fetchEmployeesFull(supabase), fetchLeaveRequests(supabase)]);
  const today = todayStr();
  const onLeaveIds = new Set(
    leaveRows.filter((l) => l.status === "approved" && l.start_date <= today && l.end_date >= today).map((l) => l.employee_id)
  );
  return employees.map((e) => ({
    id: e.id,
    name: e.full_name,
    employeeCode: e.employee_code,
    department: e.department ?? "—",
    status: onLeaveIds.has(e.id) ? "On Leave" : "Active",
    avatar: avatarFor(e.full_name, e.profile_picture_url),
    email: e.email,
    role: e.job_title ?? "—",
  }));
}

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------
export function mapLeaveRow(row: DbLeaveRequest, employee: { name: string; department: string; avatar: string; employeeCode: string }): LeaveRequest {
  const days = Math.round((new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) / 86_400_000) + 1;
  return {
    id: row.id,
    employeeName: employee.name,
    employeeDept: employee.department,
    employeeAvatar: employee.avatar,
    employeeId: employee.employeeCode,
    leaveType: LEAVE_TYPE_FROM_DB[row.leave_type],
    startDate: row.start_date,
    endDate: row.end_date,
    durationDays: days,
    status: LEAVE_STATUS_FROM_DB[row.status],
    notes: row.remarks ?? undefined,
    appliedDate: fmtDate(row.created_at),
  };
}

export async function loadLeaveRequests(supabase: Client, self: UserProfile): Promise<LeaveRequest[]> {
  const [rows, employees] = await Promise.all([fetchLeaveRequests(supabase), fetchEmployeesFull(supabase)]);
  const byId = new Map(employees.map((e) => [e.id, e]));
  return rows.map((row) => {
    const emp = byId.get(row.employee_id);
    return mapLeaveRow(row, {
      name: emp?.full_name ?? (row.employee_id === self.id ? self.name : "—"),
      department: emp?.department ?? (row.employee_id === self.id ? self.department : "—"),
      avatar: emp ? avatarFor(emp.full_name, emp.profile_picture_url) : self.avatar,
      employeeCode: emp?.employee_code ?? (row.employee_id === self.id ? self.employeeId : "—"),
    });
  });
}

export function mapPendingApprovals(rows: DbLeaveRequest[], employees: Employee[]): PendingApproval[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  return rows
    .filter((r) => r.status === "pending")
    .map((r) => {
      const emp = byId.get(r.employee_id);
      const days = Math.round((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86_400_000) + 1;
      return {
        id: r.id,
        type: "leave" as const,
        name: emp?.full_name ?? "—",
        title: emp?.job_title ?? "—",
        details: `${LEAVE_TYPE_FROM_DB[r.leave_type]} • ${fmtDate(r.start_date)} - ${fmtDate(r.end_date)}`,
        durationOrAmount: `${days} day${days === 1 ? "" : "s"}`,
        avatar: emp ? avatarFor(emp.full_name, emp.profile_picture_url) : undefined,
      };
    });
}

/** POST /api/leave/apply — resolves the approver server-side; do not insert leave_requests directly. */
export async function createLeaveRequest(req: { leaveType: LeaveType; startDate: string; endDate: string; notes?: string }): Promise<void> {
  await apiCall("/api/leave/apply", {
    method: "POST",
    body: JSON.stringify({
      leave_type: LEAVE_TYPE_TO_DB[req.leaveType],
      from_date: req.startDate,
      to_date: req.endDate,
      remarks: req.notes || undefined,
    }),
  });
}

/** POST /api/leave/action — the coverage check + manager-graph permission gate only exist server-side. */
export async function reviewLeaveRequest(id: string, approve: boolean): Promise<void> {
  await apiCall("/api/leave/action", {
    method: "POST",
    body: JSON.stringify({ leave_request_id: id, action: approve ? "approve" : "reject" }),
  });
}

// ---------------------------------------------------------------------------
// Attendance — schema only has check_in/check_out (no lunch columns); the UI's
// Lunch Start/Lunch End punch types are accepted but are no-ops here (nothing
// in the UI currently dispatches them — the check-in/check-out toggle is the
// only wired action — so this degrades safely rather than faking persistence).
// ---------------------------------------------------------------------------
export function buildPunches(row: DbAttendance | null): AttendancePunch[] {
  const steps: { type: AttendancePunch["type"]; iso: string | null; icon: string }[] = [
    { type: "Check In", iso: row?.check_in ?? null, icon: "login" },
    { type: "Check Out", iso: row?.check_out ?? null, icon: "logout" },
  ];
  let currentAssigned = false;
  return steps.map((s) => {
    let status: AttendancePunch["status"];
    if (s.iso) status = "completed";
    else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else status = "upcoming";
    return { id: `punch-${s.type}`, type: s.type, time: fmtTime(s.iso), status, icon: s.icon };
  });
}

export async function addAttendancePunch(supabase: Client, employeeId: string, type: AttendancePunch["type"]): Promise<void> {
  if (type === "Lunch Start" || type === "Lunch End") return; // no backing column in this schema

  const date = todayStr();
  const nowIso = new Date().toISOString();

  const { data: existing, error: selErr } = await supabase
    .from("attendance")
    .select("id, check_in, check_out")
    .eq("employee_id", employeeId)
    .eq("date", date)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const patch = type === "Check In" ? { check_in: nowIso } : { check_out: nowIso };
    const { error } = await supabase.from("attendance").update(patch).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("attendance").insert({
      employee_id: employeeId,
      date,
      status: "present",
      check_in: type === "Check In" ? nowIso : null,
      check_out: type === "Check Out" ? nowIso : null,
    });
    if (error) throw error;
  }
}

export async function loadWeeklyAttendance(supabase: Client, employeeId: string): Promise<DayAttendance[]> {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const from = dates[0].toISOString().slice(0, 10);
  const to = dates[6].toISOString().slice(0, 10);

  const [attRows, { data: leaveRows, error: leaveErr }] = await Promise.all([
    fetchAttendanceRange(supabase, employeeId, from, to),
    supabase
      .from("leave_requests")
      .select("start_date, end_date, status")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from),
  ]);
  if (leaveErr) throw leaveErr;

  const attByDate = new Map(attRows.map((r) => [r.date, r]));
  const now = todayStr();

  return dates.map((d) => {
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const onLeave = (leaveRows ?? []).some((l) => dateStr >= l.start_date && dateStr <= l.end_date);
    const row = attByDate.get(dateStr);

    let statusType: DayAttendance["statusType"];
    let statusText: string | undefined;
    let hours = "—";

    if (isWeekend) {
      statusType = "weekend";
      statusText = "Weekend";
    } else if (onLeave) {
      statusType = "pto";
      statusText = "Leave";
    } else if (dateStr === now && row?.check_in && !row.check_out) {
      statusType = "active";
      statusText = "In progress";
    } else if (dateStr > now) {
      statusType = "future";
    } else if (row?.check_in && row?.check_out) {
      statusType = "normal";
      const ms = new Date(row.check_out).getTime() - new Date(row.check_in).getTime();
      hours = `${(ms / 3_600_000).toFixed(1)}h`;
    } else if (dateStr < now) {
      statusType = "normal";
      statusText = "Absent";
      hours = "0h";
    } else {
      statusType = "future";
    }

    return { dayName, dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), hours, statusType, statusText };
  });
}

// ---------------------------------------------------------------------------
// Payroll — computed payslips via GET /api/payroll/slip (statutory deductions
// are business logic, not something the frontend re-derives). There is no
// bulk "run payroll" write endpoint in this backend (see runPayrollCycleNote).
// ---------------------------------------------------------------------------
function isFullBreakdown(slip: PayslipBreakdown | { employeeId: string; month: string; netSalary: number }): slip is PayslipBreakdown {
  return "basicSalary" in slip;
}

export async function fetchPayslip(
  employeeId?: string,
  month?: string
): Promise<PayslipBreakdown | { employeeId: string; month: string; netSalary: number }> {
  const params = new URLSearchParams();
  if (employeeId) params.set("employee_id", employeeId);
  if (month) params.set("month", month);
  const qs = params.toString();
  return apiCall(`/api/payroll/slip${qs ? `?${qs}` : ""}`);
}

export async function loadPayroll(supabase: Client, self: UserProfile): Promise<PayrollRecord[]> {
  const employees = self.role === "employee" ? [{ id: self.id, name: self.name, title: self.title, avatar: self.avatar }] : (await fetchEmployeesFull(supabase)).map((e) => ({ id: e.id, name: e.full_name, title: e.job_title ?? "—", avatar: avatarFor(e.full_name, e.profile_picture_url) }));

  const records = await Promise.all(
    employees.map(async (e): Promise<PayrollRecord | null> => {
      try {
        const slip = await fetchPayslip(e.id);
        if (!isFullBreakdown(slip)) {
          // Manager without compensation_visibility on this report — net total only.
          return { id: e.id, name: e.name, role: e.title, avatar: e.avatar, baseSalary: 0, allowances: 0, deductions: 0, netPay: slip.netSalary };
        }
        return {
          id: e.id,
          name: e.name,
          role: e.title,
          avatar: e.avatar,
          baseSalary: slip.basicSalary,
          allowances: slip.hra + slip.specialAllowance,
          deductions: slip.totalDeductions,
          netPay: slip.netSalary,
        };
      } catch {
        return null; // no salary record for this employee this month
      }
    })
  );
  return records.filter((r): r is PayrollRecord => r !== null);
}

/** There is no bulk payroll-run endpoint in this backend — salary changes are per-employee bitemporal writes by HR/admin. */
export const RUN_PAYROLL_UNAVAILABLE_MESSAGE =
  "There's no bulk \"run payroll\" action in this environment — salary records are updated per employee by HR/Admin, and this view already reflects the current computed payslips.";

// ---------------------------------------------------------------------------
// Profile edits — only columns that exist on `employees` are writable here.
// ---------------------------------------------------------------------------
export async function updateEmployeeProfile(
  supabase: Client,
  id: string,
  updated: Partial<Pick<UserProfile, "name" | "email" | "phone" | "address">>
): Promise<void> {
  const patch: Partial<Employee> = {};
  if (updated.name !== undefined) patch.full_name = updated.name;
  if (updated.email !== undefined) patch.email = updated.email;
  if (updated.phone !== undefined) patch.phone = updated.phone;
  if (updated.address !== undefined) patch.address = updated.address;
  const { error } = await supabase.from("employees").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recent activity feed — derived from attendance + leave events, no dedicated table.
// ---------------------------------------------------------------------------
export function buildRecentActivity(opts: {
  attendanceToday: DbAttendance[];
  leaveRows: DbLeaveRequest[];
  employees: Employee[];
  self: UserProfile;
}): ActivityItem[] {
  const { attendanceToday, leaveRows, employees, self } = opts;
  const byId = new Map(employees.map((e) => [e.id, e]));
  const nameOf = (id: string) => (id === self.id ? self.name : byId.get(id)?.full_name ?? "Someone");

  const items: (ActivityItem & { at: number })[] = [];

  for (const row of attendanceToday) {
    if (row.check_in) {
      items.push({
        id: `att-in-${row.id}`,
        title: `${nameOf(row.employee_id)} checked in`,
        subtitle: `At ${fmtTime(row.check_in)}`,
        timeAgo: fmtTime(row.check_in),
        icon: "login",
        iconBg: "bg-[#e3e2e0]",
        iconColor: "text-[#424844]",
        at: new Date(row.check_in).getTime(),
      });
    }
    if (row.check_out) {
      items.push({
        id: `att-out-${row.id}`,
        title: `${nameOf(row.employee_id)} checked out`,
        subtitle: `At ${fmtTime(row.check_out)}`,
        timeAgo: fmtTime(row.check_out),
        icon: "logout",
        iconBg: "bg-[#e3e2e0]",
        iconColor: "text-[#424844]",
        at: new Date(row.check_out).getTime(),
      });
    }
  }

  for (const row of leaveRows.slice(0, 15)) {
    const label =
      row.status === "pending"
        ? `${nameOf(row.employee_id)} requested ${LEAVE_TYPE_FROM_DB[row.leave_type]}`
        : row.status === "escalated"
        ? `Escalated: ${nameOf(row.employee_id)}'s ${LEAVE_TYPE_FROM_DB[row.leave_type]} request`
        : `${row.status === "approved" ? "Approved" : "Rejected"}: ${nameOf(row.employee_id)}'s ${LEAVE_TYPE_FROM_DB[row.leave_type]}`;

    items.push({
      id: `leave-${row.id}`,
      title: label,
      subtitle: `${fmtDate(row.start_date)} - ${fmtDate(row.end_date)}`,
      timeAgo: new Date(row.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      icon: row.status === "approved" ? "check_circle" : row.status === "rejected" ? "cancel" : row.status === "escalated" ? "priority_high" : "flight_takeoff",
      iconBg: row.status === "rejected" ? "bg-[#ffdad6]/40" : row.status === "escalated" ? "bg-[#fef3c7]" : "bg-[#c8ead8]/40",
      iconColor: row.status === "rejected" ? "text-[#93000a]" : row.status === "escalated" ? "text-[#b45309]" : "text-[#436153]",
      at: new Date(row.updated_at).getTime(),
    });
  }

  return items
    .sort((a, b) => b.at - a.at)
    .slice(0, 12)
    .map((item): ActivityItem => {
      const { id, title, subtitle, timeAgo, icon, iconBg, iconColor } = item;
      return { id, title, subtitle, timeAgo, icon, iconBg, iconColor };
    });
}
