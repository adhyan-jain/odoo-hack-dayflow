/**
 * Data access layer bridging Supabase (snake_case DB rows, RLS-scoped) and the
 * frontend's domain types (src/types/index.ts). All access control is enforced
 * by Postgres RLS (see supabase/migrations) — these helpers never branch on
 * role to decide *what* a query returns, only how to shape it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  UserRole as DbUserRole,
  LeaveType as DbLeaveType,
  LeaveStatus as DbLeaveStatus,
} from "@/types/database.types";
import type {
  UserProfile,
  UserRole,
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

export type Client = SupabaseClient<Database>;
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];
type LeaveRow = Database["public"]["Tables"]["leave_requests"]["Row"];
type PayrollRow = Database["public"]["Tables"]["payroll"]["Row"];
type DirectoryRow = Database["public"]["Views"]["employee_directory"]["Row"];

// ---------------------------------------------------------------------------
// Enum mapping — DB uses 'employee'|'hr' and a 3-way leave_type; the UI uses
// 'employee'|'admin' and four named leave categories.
// ---------------------------------------------------------------------------
export const roleToFe = (r: DbUserRole): UserRole => (r === "hr" ? "admin" : "employee");
export const roleToDb = (r: UserRole): DbUserRole => (r === "admin" ? "hr" : "employee");

const LEAVE_TYPE_TO_DB: Record<LeaveType, DbLeaveType> = {
  "Annual Leave": "annual",
  "Sick Leave": "sick",
  "Personal Leave": "personal",
  "Maternity/Paternity": "maternity_paternity",
};
const LEAVE_TYPE_FROM_DB: Record<DbLeaveType, LeaveType> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  personal: "Personal Leave",
  maternity_paternity: "Maternity/Paternity",
  paid: "Annual Leave",
  unpaid: "Personal Leave",
};
const LEAVE_STATUS_FROM_DB: Record<DbLeaveStatus, LeaveStatus> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
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
// Raw fetchers — RLS scopes the rows returned; no role branching needed here.
// ---------------------------------------------------------------------------
export async function fetchMyEmployeeRow(supabase: Client, userId: string): Promise<EmployeeRow> {
  const { data, error } = await supabase.from("employees").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function fetchDirectory(supabase: Client): Promise<DirectoryRow[]> {
  const { data, error } = await supabase.from("employee_directory").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

/** Full employee rows (salary, phone, etc). RLS: HR gets everyone, an employee gets only self. */
export async function fetchEmployeesFull(supabase: Client): Promise<EmployeeRow[]> {
  const { data, error } = await supabase.from("employees").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeaveRequests(supabase: Client): Promise<LeaveRow[]> {
  const { data, error } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPayroll(supabase: Client): Promise<PayrollRow[]> {
  const { data, error } = await supabase.from("payroll").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAttendanceRange(supabase: Client, employeeId: string, from: string, to: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  return data ?? [];
}

/** Today's attendance for every employee visible to the caller (RLS-scoped) — used for the HR "present today" stat. */
export async function fetchAttendanceToday(supabase: Client): Promise<AttendanceRow[]> {
  const { data, error } = await supabase.from("attendance").select("*").eq("date", todayStr());
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Employee -> UserProfile
// ---------------------------------------------------------------------------
export async function mapEmployeeToProfile(supabase: Client, emp: EmployeeRow): Promise<UserProfile> {
  const [managerRes, rate] = await Promise.all([
    emp.manager_id
      ? supabase.from("employee_directory").select("full_name, job_title, profile_picture_url").eq("id", emp.manager_id).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string; job_title: string | null; profile_picture_url: string | null } | null }),
    computeAttendanceRate(supabase, emp.id),
  ]);
  const manager = managerRes.data;

  return {
    id: emp.id,
    name: emp.full_name,
    role: roleToFe(emp.role),
    title: emp.job_title ?? "—",
    department: emp.department ?? "—",
    employeeId: emp.employee_code,
    email: emp.email,
    phone: emp.phone ?? "",
    address: emp.address ?? "",
    birthDate: fmtDate(emp.date_of_birth),
    joinDate: fmtDate(emp.date_of_joining),
    tenure: tenureOf(emp.date_of_joining),
    employmentType: emp.employment_type,
    manager: manager
      ? { name: manager.full_name, title: manager.job_title ?? "", avatar: avatarFor(manager.full_name, manager.profile_picture_url) }
      : { name: "Unassigned", title: "—", avatar: "" },
    salary: { base: emp.base_salary ?? 0, bonusPercent: emp.bonus_percent, equity: emp.equity_units },
    avatar: avatarFor(emp.full_name, emp.profile_picture_url),
    leaveBalanceDays: emp.leave_balance_days,
    attendanceRate: rate,
  };
}

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

// ---------------------------------------------------------------------------
// Directory / roster
// ---------------------------------------------------------------------------
export function mapDirectoryRow(row: DirectoryRow, onLeaveIds: Set<string>): EmployeeRosterItem {
  return {
    id: row.id,
    name: row.full_name,
    employeeCode: row.employee_code,
    department: row.department ?? "—",
    status: onLeaveIds.has(row.id) ? "On Leave" : "Active",
    avatar: avatarFor(row.full_name, row.profile_picture_url),
    email: row.email,
    role: row.job_title ?? "—",
  };
}

export async function loadEmployeeRoster(supabase: Client): Promise<EmployeeRosterItem[]> {
  const [rows, leaveRows] = await Promise.all([fetchDirectory(supabase), fetchLeaveRequests(supabase)]);
  const today = todayStr();
  const onLeaveIds = new Set(
    leaveRows.filter((l) => l.status === "approved" && l.start_date <= today && l.end_date >= today).map((l) => l.employee_id)
  );
  return rows.map((r) => mapDirectoryRow(r, onLeaveIds));
}

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------
export function mapLeaveRow(row: LeaveRow, employee: { name: string; department: string; avatar: string; employeeCode: string }): LeaveRequest {
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
  const [rows, directory] = await Promise.all([fetchLeaveRequests(supabase), fetchDirectory(supabase)]);
  const byId = new Map(directory.map((d) => [d.id, d]));
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

export function mapPendingApprovals(rows: LeaveRow[], directory: DirectoryRow[]): PendingApproval[] {
  const byId = new Map(directory.map((d) => [d.id, d]));
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

export async function createLeaveRequest(
  supabase: Client,
  employeeId: string,
  req: { leaveType: LeaveType; startDate: string; endDate: string; notes?: string }
): Promise<void> {
  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employeeId,
    leave_type: LEAVE_TYPE_TO_DB[req.leaveType],
    start_date: req.startDate,
    end_date: req.endDate,
    remarks: req.notes || null,
  });
  if (error) throw error;
}

export async function reviewLeaveRequest(supabase: Client, id: string, reviewerId: string, approve: boolean): Promise<void> {
  const { error } = await supabase
    .from("leave_requests")
    .update({ status: approve ? "approved" : "rejected", reviewed_by: reviewerId })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export function buildPunches(row: AttendanceRow | null): AttendancePunch[] {
  const steps: { type: AttendancePunch["type"]; iso: string | null; icon: string }[] = [
    { type: "Check In", iso: row?.check_in ?? null, icon: "login" },
    { type: "Lunch Start", iso: row?.lunch_start ?? null, icon: "restaurant" },
    { type: "Lunch End", iso: row?.lunch_end ?? null, icon: "check" },
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
  const date = todayStr();
  const nowIso = new Date().toISOString();
  const column: "check_in" | "check_out" | "lunch_start" | "lunch_end" =
    type === "Check In" ? "check_in" : type === "Check Out" ? "check_out" : type === "Lunch Start" ? "lunch_start" : "lunch_end";

  const { data: existing, error: selErr } = await supabase
    .from("attendance")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("date", date)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const patch: Partial<Pick<AttendanceRow, "check_in" | "check_out" | "lunch_start" | "lunch_end">> = {};
    patch[column] = nowIso;
    const { error } = await supabase.from("attendance").update(patch).eq("id", existing.id);
    if (error) throw error;
  } else {
    const insertRow: Database["public"]["Tables"]["attendance"]["Insert"] = {
      employee_id: employeeId,
      date,
      status: "present",
      [column]: nowIso,
    };
    const { error } = await supabase.from("attendance").insert(insertRow);
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
// Payroll
// ---------------------------------------------------------------------------
export function mapPayrollRow(row: PayrollRow, employee: { name: string; title: string; avatar: string } | undefined): PayrollRecord {
  return {
    id: row.id,
    name: employee?.name ?? "—",
    role: employee?.title ?? "—",
    avatar: employee?.avatar,
    baseSalary: row.basic_salary,
    allowances: row.allowances,
    deductions: row.deductions,
    netPay: row.net_salary,
  };
}

export async function loadPayroll(supabase: Client, self: UserProfile): Promise<PayrollRecord[]> {
  const [rows, directory] = await Promise.all([fetchPayroll(supabase), fetchDirectory(supabase)]);
  const byId = new Map(directory.map((d) => [d.id, d]));
  return rows.map((row) => {
    const emp = byId.get(row.employee_id);
    return mapPayrollRow(row, {
      name: emp?.full_name ?? (row.employee_id === self.id ? self.name : "—"),
      title: emp?.job_title ?? (row.employee_id === self.id ? self.title : "—"),
      avatar: emp ? avatarFor(emp.full_name, emp.profile_picture_url) : self.avatar,
    });
  });
}

const currentPayPeriod = (): string => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** Runs the current pay cycle: upserts a payroll row per employee with a base salary set. */
export async function runPayrollCycle(supabase: Client, includeBonus: boolean): Promise<void> {
  const employees = await fetchEmployeesFull(supabase);
  const payPeriod = currentPayPeriod();
  const rows = employees
    .filter((e) => e.base_salary != null)
    .map((e) => ({
      employee_id: e.id,
      pay_period: payPeriod,
      basic_salary: e.base_salary!,
      allowances: includeBonus ? Math.round((e.base_salary! * e.bonus_percent) / 100) : 0,
      deductions: 0,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("payroll").upsert(rows, { onConflict: "employee_id,pay_period" });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Profile edits
// ---------------------------------------------------------------------------
export async function updateEmployeeProfile(
  supabase: Client,
  id: string,
  updated: Partial<Pick<UserProfile, "name" | "email" | "phone" | "address" | "birthDate">>
): Promise<void> {
  const patch: Database["public"]["Tables"]["employees"]["Update"] = {};
  if (updated.name !== undefined) patch.full_name = updated.name;
  if (updated.email !== undefined) patch.email = updated.email;
  if (updated.phone !== undefined) patch.phone = updated.phone;
  if (updated.address !== undefined) patch.address = updated.address;
  if (updated.birthDate !== undefined) {
    const parsed = new Date(updated.birthDate);
    patch.date_of_birth = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }
  const { error } = await supabase.from("employees").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recent activity feed — derived from attendance + leave + payroll, no dedicated table.
// ---------------------------------------------------------------------------
export function buildRecentActivity(opts: {
  attendanceToday: AttendanceRow[];
  leaveRows: LeaveRow[];
  payrollRows: PayrollRow[];
  directory: DirectoryRow[];
  self: UserProfile;
}): ActivityItem[] {
  const { attendanceToday, leaveRows, payrollRows, directory, self } = opts;
  const byId = new Map(directory.map((d) => [d.id, d]));
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
    const isNew = row.status === "pending";
    items.push({
      id: `leave-${row.id}`,
      title: isNew
        ? `${nameOf(row.employee_id)} requested ${LEAVE_TYPE_FROM_DB[row.leave_type]}`
        : `${row.status === "approved" ? "Approved" : "Rejected"}: ${nameOf(row.employee_id)}'s ${LEAVE_TYPE_FROM_DB[row.leave_type]}`,
      subtitle: `${fmtDate(row.start_date)} - ${fmtDate(row.end_date)}`,
      timeAgo: new Date(row.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      icon: row.status === "approved" ? "check_circle" : row.status === "rejected" ? "cancel" : "flight_takeoff",
      iconBg: row.status === "rejected" ? "bg-[#ffdad6]/40" : "bg-[#c8ead8]/40",
      iconColor: row.status === "rejected" ? "text-[#93000a]" : "text-[#436153]",
      at: new Date(row.updated_at).getTime(),
    });
  }

  for (const row of payrollRows.slice(0, 10)) {
    items.push({
      id: `pay-${row.id}`,
      title: `Payslip available (${row.pay_period})`,
      subtitle: `${nameOf(row.employee_id)} • net $${row.net_salary.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      timeAgo: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      icon: "receipt_long",
      iconBg: "bg-[#e9e2d3]",
      iconColor: "text-[#625e52]",
      at: new Date(row.created_at).getTime(),
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
