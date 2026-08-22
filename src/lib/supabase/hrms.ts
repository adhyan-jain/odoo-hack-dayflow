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
  SalaryComponent,
  CompanySettings,
  TeamCoverageConfig,
  CoverageResult,
  OrgRewindResponse,
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
  EmployeeStatus,
  CompanySettingsUI,
  CoverageWarning,
  AttendanceDayRow,
  AttendanceMonthSummary,
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
  const [manager, balances, rate, todaysAttendance, activeLeave] = await Promise.all([
    fetchMyManager(supabase, emp.id),
    fetchLeaveBalances(supabase, emp.id),
    computeAttendanceRate(supabase, emp.id),
    supabase.from("attendance").select("status, check_in, check_out").eq("employee_id", emp.id).eq("date", todayStr()).maybeSingle(),
    supabase
      .from("leave_requests")
      .select("id")
      .eq("employee_id", emp.id)
      .eq("status", "approved")
      .lte("start_date", todayStr())
      .gte("end_date", todayStr())
      .maybeSingle(),
  ]);

  const status: EmployeeStatus = activeLeave.data ? "on_leave" : todaysAttendance.data?.check_in ? "present" : "absent";

  // Full breakdown when accessible (self/admin/hr/manager-with-visibility);
  // fetchPayslip degrades to { netSalary } under allow_partial, and throws
  // (no salary_records row yet) for a brand-new employee — both handled below.
  let salary: UserProfile["salary"] = {
    base: 0, hra: 0, specialAllowance: 0, components: [], pfEmployee: 0, pfEmployer: 0,
    professionalTax: 0, netMonthly: 0, netYearly: 0, workingDaysPerWeek: 5, breakMinutes: 60, netOnly: false,
  };
  try {
    const slip = await fetchPayslip(emp.id);
    if (isFullBreakdown(slip)) {
      salary = {
        base: slip.basicSalary,
        hra: slip.hra,
        specialAllowance: slip.specialAllowance,
        components: slip.components.map((c, i) => ({
          id: `${emp.id}-component-${i}`,
          name: c.name,
          category: c.category,
          computationType: c.computationType,
          value: c.value,
          monthlyAmount: c.monthlyAmount,
        })),
        pfEmployee: slip.pfEmployee,
        pfEmployer: slip.pfEmployer,
        professionalTax: slip.professionalTax,
        netMonthly: slip.netSalary,
        netYearly: slip.netSalaryYearly,
        workingDaysPerWeek: slip.workingDaysPerWeek,
        breakMinutes: slip.breakMinutes,
        netOnly: false,
      };
    } else {
      salary = { ...salary, netMonthly: slip.netSalary, netYearly: slip.netSalary * 12, netOnly: true };
    }
  } catch {
    // No salary_records row yet for this employee — leave the zeroed default.
  }

  return {
    id: emp.id,
    name: emp.full_name,
    role: emp.role,
    title: emp.job_title ?? "—",
    department: emp.department ?? "—",
    employeeId: emp.employee_code,
    loginId: emp.login_id,
    mustChangePassword: emp.must_change_password,
    email: emp.email,
    phone: emp.phone ?? "",
    address: emp.address ?? "",
    joinDate: fmtDate(emp.date_of_joining),
    tenure: tenureOf(emp.date_of_joining),
    status,
    manager: manager
      ? { name: manager.full_name, title: manager.job_title ?? "—", avatar: avatarFor(manager.full_name, manager.profile_picture_url) }
      : { name: "—", title: "—", avatar: "" },
    about: emp.about ?? "",
    skills: emp.skills,
    certifications: emp.certifications,
    interests: emp.interests ?? "",
    resumePath: emp.resume_path,
    dateOfBirth: fmtDate(emp.date_of_birth),
    gender: emp.gender ?? "",
    maritalStatus: emp.marital_status ?? "",
    nationality: emp.nationality ?? "",
    personalEmail: emp.personal_email ?? "",
    residingAddress: emp.residing_address ?? "",
    bankName: emp.bank_name ?? "",
    bankAccountNo: emp.bank_account_no ?? "",
    ifscCode: emp.ifsc_code ?? "",
    uanNo: emp.uan_no ?? "",
    panNo: emp.pan_no ?? "",
    salary,
    compensationVisibility: emp.compensation_visibility,
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
  const today = todayStr();
  const [employees, leaveRows, attendanceToday] = await Promise.all([
    fetchEmployeesFull(supabase),
    fetchLeaveRequests(supabase),
    fetchAttendanceToday(supabase),
  ]);
  const onLeaveIds = new Set(
    leaveRows.filter((l) => l.status === "approved" && l.start_date <= today && l.end_date >= today).map((l) => l.employee_id)
  );
  const presentIds = new Set(attendanceToday.filter((a) => a.check_in).map((a) => a.employee_id));
  return employees.map((e) => ({
    id: e.id,
    name: e.full_name,
    employeeCode: e.employee_code,
    loginId: e.login_id,
    department: e.department ?? "—",
    status: onLeaveIds.has(e.id) ? "On Leave" : "Active",
    attendanceStatus: onLeaveIds.has(e.id) ? "on_leave" : presentIds.has(e.id) ? "present" : "absent",
    avatar: avatarFor(e.full_name, e.profile_picture_url),
    email: e.email,
    role: e.job_title ?? "—",
    jobTitle: e.job_title ?? undefined,
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
export async function createLeaveRequest(req: { leaveType: LeaveType; startDate: string; endDate: string; notes?: string; attachmentUrl?: string }): Promise<void> {
  await apiCall("/api/leave/apply", {
    method: "POST",
    body: JSON.stringify({
      leave_type: LEAVE_TYPE_TO_DB[req.leaveType],
      from_date: req.startDate,
      to_date: req.endDate,
      remarks: req.notes || undefined,
      attachment_url: req.attachmentUrl || undefined,
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
// Profile edits — self-editable columns (Resume + Private Info tabs). Role,
// compensation_visibility, login_id, and employee_code are re-pinned server-
// side by migration 017's guard trigger even if a caller tries to smuggle
// them through here, so this function intentionally never accepts them.
// ---------------------------------------------------------------------------
export async function updateEmployeeProfile(
  supabase: Client,
  id: string,
  updated: Partial<
    Pick<
      UserProfile,
      | "name" | "email" | "phone" | "address"
      | "about" | "skills" | "certifications" | "interests" | "resumePath"
      | "gender" | "maritalStatus" | "nationality" | "personalEmail" | "residingAddress"
      | "bankName" | "bankAccountNo" | "ifscCode" | "uanNo" | "panNo"
    >
  > & { dateOfBirthIso?: string }
): Promise<void> {
  const patch: Partial<Employee> = {};
  if (updated.name !== undefined) patch.full_name = updated.name;
  if (updated.email !== undefined) patch.email = updated.email;
  if (updated.phone !== undefined) patch.phone = updated.phone;
  if (updated.address !== undefined) patch.address = updated.address;
  if (updated.about !== undefined) patch.about = updated.about;
  if (updated.skills !== undefined) patch.skills = updated.skills;
  if (updated.certifications !== undefined) patch.certifications = updated.certifications;
  if (updated.interests !== undefined) patch.interests = updated.interests;
  if (updated.resumePath !== undefined) patch.resume_path = updated.resumePath;
  if (updated.gender !== undefined) patch.gender = updated.gender;
  if (updated.maritalStatus !== undefined) patch.marital_status = updated.maritalStatus;
  if (updated.nationality !== undefined) patch.nationality = updated.nationality;
  if (updated.personalEmail !== undefined) patch.personal_email = updated.personalEmail;
  if (updated.residingAddress !== undefined) patch.residing_address = updated.residingAddress;
  if (updated.bankName !== undefined) patch.bank_name = updated.bankName;
  if (updated.bankAccountNo !== undefined) patch.bank_account_no = updated.bankAccountNo;
  if (updated.ifscCode !== undefined) patch.ifsc_code = updated.ifscCode;
  if (updated.uanNo !== undefined) patch.uan_no = updated.uanNo;
  if (updated.panNo !== undefined) patch.pan_no = updated.panNo;
  if (updated.dateOfBirthIso !== undefined) patch.date_of_birth = updated.dateOfBirthIso;
  const { error } = await supabase.from("employees").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Resume file — private "resumes" Storage bucket (S3-backed), one file per
// employee under `${employee_id}/...` so RLS (migration 019) can scope
// access by folder. Unlike leave-attachments this bucket supports replace
// (upsert) and delete, since a resume is a single current file, not a log.
// ---------------------------------------------------------------------------
export async function uploadResumeFile(supabase: Client, employeeId: string, file: File): Promise<string> {
  const path = `${employeeId}/resume-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function getResumeSignedUrl(supabase: Client, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeResumeFile(supabase: Client, path: string): Promise<void> {
  const { error } = await supabase.storage.from("resumes").remove([path]);
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

// ---------------------------------------------------------------------------
// Company settings — direct RLS read (authenticated); write happens only via
// POST /api/auth/bootstrap-company (first admin) and the Settings page (admin).
// ---------------------------------------------------------------------------
export async function fetchCompanySettings(supabase: Client): Promise<CompanySettingsUI | null> {
  const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { name: data.name, logoUrl: data.logo_url };
}

export async function updateCompanySettings(supabase: Client, patch: Partial<CompanySettingsUI>): Promise<void> {
  const dbPatch: Partial<CompanySettings> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
  const { error } = await supabase.from("company_settings").update(dbPatch).eq("id", true);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Identity / provisioning — HR/Admin-created employees (never self-signup)
// and the one-time company bootstrap. Both go through /api/* because they
// use the Admin Auth API (service-role only, never in browser code).
// ---------------------------------------------------------------------------
export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  dateOfJoining?: string; // "YYYY-MM-DD"
  role?: "employee" | "hr" | "admin";
}

export async function createEmployee(input: CreateEmployeeInput): Promise<{ employee: Employee; temporaryPassword: string }> {
  return apiCall("/api/employees/create", {
    method: "POST",
    body: JSON.stringify({
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      department: input.department,
      job_title: input.jobTitle,
      date_of_joining: input.dateOfJoining,
      role: input.role,
    }),
  });
}

export interface BootstrapCompanyInput {
  companyName: string;
  fullName: string;
  email: string;
  password: string;
  logoBase64?: string;
  logoContentType?: string;
}

export async function bootstrapCompany(input: BootstrapCompanyInput): Promise<{ employee: Employee }> {
  return apiCall("/api/auth/bootstrap-company", {
    method: "POST",
    body: JSON.stringify({
      company_name: input.companyName,
      full_name: input.fullName,
      email: input.email,
      password: input.password,
      logo_base64: input.logoBase64,
      logo_content_type: input.logoContentType,
    }),
  });
}

export async function companyExists(supabase: Client): Promise<boolean> {
  const { data, error } = await supabase.rpc("company_exists");
  if (error) throw error;
  return data === true;
}

/** Sign-in form accepts an email OR a wireframe-format login_id; resolves the latter before calling supabase.auth.signInWithPassword. */
export async function resolveSignInIdentifier(supabase: Client, identifier: string): Promise<string> {
  if (identifier.includes("@")) return identifier;
  const { data, error } = await supabase.rpc("resolve_login_id_to_email", { p_login_id: identifier });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("No account found for that Login ID");
  return data;
}

/** Security tab: sets a new password and clears must_change_password on the caller's own row. */
export async function changeOwnPassword(supabase: Client, employeeId: string, newPassword: string): Promise<void> {
  const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
  if (authErr) throw authErr;
  const { error: rowErr } = await supabase.from("employees").update({ must_change_password: false }).eq("id", employeeId);
  if (rowErr) throw rowErr;
}

// ---------------------------------------------------------------------------
// Salary Info tab — component-level editing (admin only; RLS enforces write).
// ---------------------------------------------------------------------------
export interface SalaryComponentInput {
  name: string;
  category: SalaryComponent["category"];
  computationType: SalaryComponent["computation_type"];
  value: number;
}

/** Returns the employee's current (non-superseded) salary_records id, creating a zeroed one if none exists yet. */
export async function ensureCurrentSalaryRecord(supabase: Client, employeeId: string): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from("salary_records")
    .select("id")
    .eq("employee_id", employeeId)
    .is("valid_to", null)
    .is("superseded_at", null)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from("salary_records")
    .insert({ employee_id: employeeId, basic_salary: 0, hra: 0, special_allowance: 0, deductions: 0, valid_from: todayStr() })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created.id;
}

/**
 * Bitemporal salary change: closes the current salary_records row and
 * inserts a new one with the given basic_salary/schedule, carrying forward
 * the given component set. Never UPDATEs a salary_records row in place.
 */
export async function reviseSalary(
  supabase: Client,
  employeeId: string,
  patch: { basicSalary: number; workingDaysPerWeek: number; standardDailyHours: number; breakMinutes: number },
  components: SalaryComponentInput[],
): Promise<void> {
  const today = todayStr();
  const nowIso = new Date().toISOString();

  const { data: current } = await supabase
    .from("salary_records")
    .select("id")
    .eq("employee_id", employeeId)
    .is("valid_to", null)
    .is("superseded_at", null)
    .maybeSingle();

  if (current) {
    const { error: closeErr } = await supabase
      .from("salary_records")
      .update({ valid_to: today, superseded_at: nowIso })
      .eq("id", current.id);
    if (closeErr) throw closeErr;
  }

  const { data: created, error: insErr } = await supabase
    .from("salary_records")
    .insert({
      employee_id: employeeId,
      basic_salary: patch.basicSalary,
      hra: 0,
      special_allowance: 0,
      deductions: 0,
      working_days_per_week: patch.workingDaysPerWeek,
      standard_daily_hours: patch.standardDailyHours,
      break_minutes: patch.breakMinutes,
      valid_from: today,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  if (components.length > 0) {
    const { error: compErr } = await supabase.from("salary_components").insert(
      components.map((c) => ({
        salary_record_id: created.id,
        employee_id: employeeId,
        name: c.name,
        category: c.category,
        computation_type: c.computationType,
        value: c.value,
      })),
    );
    if (compErr) throw compErr;
  }
}

export async function updateCompensationVisibility(supabase: Client, employeeId: string, visible: boolean): Promise<void> {
  const { error } = await supabase.from("employees").update({ compensation_visibility: visible }).eq("id", employeeId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Coverage / org graph — advisory pre-approval warning and reporting-tree read.
// ---------------------------------------------------------------------------
export async function fetchCoverageWarning(input: { employeeId: string; fromDate: string; toDate: string }): Promise<CoverageWarning> {
  const result = await apiCall<CoverageResult>("/api/leave/check-coverage", {
    method: "POST",
    body: JSON.stringify({
      requesting_employee_id: input.employeeId,
      from_date: input.fromDate,
      to_date: input.toDate,
    }),
  });
  return {
    safe: result.safe,
    conflicts: result.conflicts,
    suggestedDates: result.suggestedDates.map((d) => ({ from: String(d.from).slice(0, 10), to: String(d.to).slice(0, 10) })),
  };
}

export interface ReporteeEntry {
  id: string;
  name: string;
  avatar: string;
  department: string;
  jobTitle: string;
  depth: number;
}

/** Direct + indirect reports of the caller, via /api/org/reportees (graph traversal is not RLS-expressible). */
export async function fetchMyReportees(): Promise<ReporteeEntry[]> {
  const result = await apiCall<{ asOf: string; reportees: Array<Employee & { depth: number }> }>("/api/org/reportees");
  return result.reportees.map((r) => ({
    id: r.id,
    name: r.full_name,
    avatar: avatarFor(r.full_name, r.profile_picture_url),
    department: r.department ?? "—",
    jobTitle: r.job_title ?? "—",
    depth: r.depth,
  }));
}

/** Org chart as it stood on `asOf` (defaults to today) — powers the Org Chart page's time-travel slider. */
export async function fetchOrgRewind(asOf?: string): Promise<OrgRewindResponse> {
  const qs = asOf ? `?as_of=${asOf}` : "";
  return apiCall(`/api/org/rewind${qs}`);
}

// ---------------------------------------------------------------------------
// Team coverage config — Settings page (admin/hr write, RLS-enforced).
// ---------------------------------------------------------------------------
export async function fetchTeamCoverageConfig(supabase: Client): Promise<TeamCoverageConfig[]> {
  const { data, error } = await supabase.from("team_coverage_config").select("*").order("department");
  if (error) throw error;
  return data ?? [];
}

export async function saveTeamCoverageConfig(
  supabase: Client,
  config: { department: string; minHeadcountRequired: number; appliesToLeaveTypes: DbLeaveType[] },
): Promise<void> {
  const { error } = await supabase
    .from("team_coverage_config")
    .upsert(
      { department: config.department, min_headcount_required: config.minHeadcountRequired, applies_to_leave_types: config.appliesToLeaveTypes },
      { onConflict: "department" },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Leave attachments — private Storage bucket, path scoped to employee_id.
// ---------------------------------------------------------------------------
export async function uploadLeaveAttachment(supabase: Client, employeeId: string, file: File): Promise<string> {
  const path = `${employeeId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("leave-attachments").upload(path, file);
  if (error) throw error;
  return path;
}

export async function getLeaveAttachmentSignedUrl(supabase: Client, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("leave-attachments").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Attendance — day-wise roster (admin/hr, one date across all employees) and
// per-employee month summary, backing the wireframe's Attendance list view.
// ---------------------------------------------------------------------------
export async function fetchAttendanceDayRoster(supabase: Client, date: string): Promise<AttendanceDayRow[]> {
  const [employees, { data: attRows, error }] = await Promise.all([
    fetchEmployeesFull(supabase),
    supabase.from("attendance").select("*").eq("date", date),
  ]);
  if (error) throw error;

  const byEmployee = new Map((attRows ?? []).map((r) => [r.employee_id, r]));

  return employees.map((e) => {
    const row = byEmployee.get(e.id);
    const workMs = row?.check_in && row?.check_out ? new Date(row.check_out).getTime() - new Date(row.check_in).getTime() : 0;
    return {
      employeeId: e.id,
      employeeName: e.full_name,
      employeeAvatar: avatarFor(e.full_name, e.profile_picture_url),
      date,
      checkIn: row?.check_in ? fmtTime(row.check_in) : null,
      checkOut: row?.check_out ? fmtTime(row.check_out) : null,
      workHours: formatHoursMinutes(workMs),
      extraHours: formatHoursMinutes(Math.max(0, workMs - 8 * 3_600_000)),
    };
  });
}

export async function fetchAttendanceMonthSummary(supabase: Client, employeeId: string, monthStart: string, monthEnd: string): Promise<AttendanceMonthSummary> {
  const [attRows, { data: leaveRows, error: leaveErr }] = await Promise.all([
    fetchAttendanceRange(supabase, employeeId, monthStart, monthEnd),
    supabase
      .from("leave_requests")
      .select("start_date, end_date")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart),
  ]);
  if (leaveErr) throw leaveErr;

  const daysPresent = attRows.filter((r) => r.check_in).length;
  const totalWorkingDays = Array.from(
    { length: Math.round((new Date(monthEnd).getTime() - new Date(monthStart).getTime()) / 86_400_000) + 1 },
    (_, i) => {
      const d = new Date(monthStart);
      d.setDate(d.getDate() + i);
      return d.getDay();
    },
  ).filter((dow) => dow !== 0 && dow !== 6).length;

  const leavesCount = (leaveRows ?? []).reduce((sum, l) => {
    const from = l.start_date > monthStart ? l.start_date : monthStart;
    const to = l.end_date < monthEnd ? l.end_date : monthEnd;
    return sum + Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1);
  }, 0);

  return { daysPresent, leavesCount, totalWorkingDays };
}

export async function fetchAttendanceDayRowsForEmployee(supabase: Client, employeeId: string, from: string, to: string): Promise<AttendanceDayRow[]> {
  const [rows, employee] = await Promise.all([fetchAttendanceRange(supabase, employeeId, from, to), fetchMyEmployeeRow(supabase, employeeId)]);
  return rows
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((row) => {
      const workMs = row.check_in && row.check_out ? new Date(row.check_out).getTime() - new Date(row.check_in).getTime() : 0;
      return {
        employeeId,
        employeeName: employee.full_name,
        date: row.date,
        checkIn: row.check_in ? fmtTime(row.check_in) : null,
        checkOut: row.check_out ? fmtTime(row.check_out) : null,
        workHours: formatHoursMinutes(workMs),
        extraHours: formatHoursMinutes(Math.max(0, workMs - 8 * 3_600_000)),
      };
    });
}

function formatHoursMinutes(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
