// ── Frontend UI types (owned by frontend dev, do not modify) ─────────────────

export type UserRole = 'employee' | 'hr' | 'admin';

export type EmployeeStatus = 'present' | 'on_leave' | 'absent';

export interface SalaryComponentUI {
  id: string;
  name: string;
  category: 'earning' | 'employer_contribution' | 'deduction';
  computationType: 'fixed' | 'percent';
  value: number;                       // ₹/month if fixed, % of basic if percent
  monthlyAmount: number;               // resolved ₹/month
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  employeeId: string;
  loginId: string | null;
  mustChangePassword: boolean;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  tenure: string;
  status: EmployeeStatus;
  manager: {
    name: string;
    title: string;
    avatar: string;
  };
  // ── Resume tab ──────────────────────────────────────────────────────────
  about: string;
  skills: string[];
  certifications: string[];
  interests: string;
  resumePath: string | null;
  // ── Private Info tab ────────────────────────────────────────────────────
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  personalEmail: string;
  residingAddress: string;
  bankName: string;
  bankAccountNo: string;
  ifscCode: string;
  uanNo: string;
  panNo: string;
  // ── Salary Info tab (admin/hr-visible; 'allow_partial' -> netOnly=true) ──
  salary: {
    base: number;
    hra: number;
    specialAllowance: number;
    components: SalaryComponentUI[];
    pfEmployee: number;
    pfEmployer: number;
    professionalTax: number;
    netMonthly: number;
    netYearly: number;
    workingDaysPerWeek: number;
    breakMinutes: number;
    netOnly: boolean;                  // true when the viewer only has allow_partial access
  };
  compensationVisibility: boolean;     // admin-set: lets this employee's manager see full salary
  avatar: string;
  leaveBalanceDays: number;
  attendanceRate: number;
}

/** Factory for a UserProfile['salary'] value — used by EMPTY_PROFILE and the mock personas, which only need to seed base/hra/specialAllowance without hand-writing every derived field. */
export function createSalaryBreakdown(overrides: { base?: number; hra?: number; specialAllowance?: number; netMonthly?: number } = {}): UserProfile['salary'] {
  const base = overrides.base ?? 0;
  const hra = overrides.hra ?? 0;
  const specialAllowance = overrides.specialAllowance ?? 0;
  return {
    base,
    hra,
    specialAllowance,
    components: [],
    pfEmployee: 0,
    pfEmployer: 0,
    professionalTax: 0,
    netMonthly: overrides.netMonthly ?? base + hra + specialAllowance,
    netYearly: (overrides.netMonthly ?? base + hra + specialAllowance) * 12,
    workingDaysPerWeek: 5,
    breakMinutes: 60,
    netOnly: false,
  };
}

/** Default values for the Resume/Private Info/identity fields added to UserProfile — spread this into mock/empty profiles that only care about the core identity fields. */
export const DEFAULT_PROFILE_EXTRAS = {
  loginId: null as string | null,
  mustChangePassword: false,
  status: 'present' as EmployeeStatus,
  about: '',
  skills: [] as string[],
  certifications: [] as string[],
  interests: '',
  resumePath: null as string | null,
  dateOfBirth: '—',
  gender: '',
  maritalStatus: '',
  nationality: '',
  personalEmail: '',
  residingAddress: '',
  bankName: '',
  bankAccountNo: '',
  ifscCode: '',
  uanNo: '',
  panNo: '',
  compensationVisibility: false,
};

export interface CompanySettingsUI {
  name: string;
  logoUrl: string | null;
}

export type LeaveType = 'Paid Leave' | 'Sick Leave' | 'Unpaid Leave';
export type LeaveStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'Escalated';

export interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeDept: string;
  employeeAvatar: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: LeaveStatus;
  notes?: string;
  appliedDate: string;
  attachmentUrl?: string | null;       // sick-leave certificate; required for LeaveType 'Sick Leave'
  escalatedTo?: string | null;         // skip-level manager name, when status === 'Escalated'
  slaDeadline?: string | null;
}

export interface LeaveAllocation {
  leaveType: LeaveType;
  daysAvailable: number;
  daysTotal: number;
}

export interface CoverageWarning {
  safe: boolean;
  conflicts: Array<{ date: string; availableAfterApproval: number; minRequired: number }>;
  suggestedDates: Array<{ from: string; to: string }>;
}

export interface AttendanceDayRow {
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  date: string;                        // "YYYY-MM-DD"
  checkIn: string | null;              // display time, e.g. "10:00"
  checkOut: string | null;
  workHours: string;                   // "HH:MM"
  extraHours: string;                  // "HH:MM"
}

export interface AttendanceMonthSummary {
  daysPresent: number;
  leavesCount: number;
  totalWorkingDays: number;
}

export interface AttendancePunch {
  id: string;
  type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out';
  time: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: string;
}

export interface DayAttendance {
  dayName: string;
  dateStr: string;
  hours: string;
  statusType: 'normal' | 'pto' | 'active' | 'future' | 'weekend';
  statusText?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  dotColor: 'error' | 'tertiary' | 'primary';
  dueDate?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timeAgo: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

export interface PendingApproval {
  id: string;
  type: 'leave' | 'expense';
  name: string;
  title: string;
  details: string;
  durationOrAmount: string;
  avatar?: string;
  initials?: string;
}

export interface EmployeeRosterItem {
  id: string;
  name: string;
  employeeCode: string;
  loginId?: string | null;
  department: string;
  status: 'Active' | 'On Leave' | 'Remote';
  attendanceStatus: EmployeeStatus;    // drives the card's green/airplane/yellow indicator
  avatar?: string;
  initials?: string;
  email: string;
  role: string;
  jobTitle?: string;
}

export interface PayrollRecord {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  initials?: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
}

// ── Backend DB types (re-exported from lib/types.ts for API route consumers) ──
// NOTE: The frontend dev uses the types above (UI shapes). These re-exports are
// for backend API routes and any frontend code that directly consumes the API.
// To avoid naming collisions, import from '@/lib/types' directly in API routes.
export type {
  AttendanceStatus,
  Employee as DbEmployee,
  Attendance as DbAttendance,
  LeaveRequest as DbLeaveRequest,
  SalaryRecord,
  SalaryComponent,
  SalaryComponentCategory,
  SalaryComputationType,
  CompanySettings,
  ReportingEdge,
  LeaveBalance,
  TeamCoverageConfig,
  Resource,
  Action,
  AccessResult,
  DateRange,
  CoverageBreach,
  CoverageResult,
  PayslipBreakdown,
  PayslipComponentLine,
  OrgNode,
  OrgRewindResponse,
  ApiResponse,
  Database,
} from '@/lib/types';
