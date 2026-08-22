// ── Frontend UI types (owned by frontend dev, do not modify) ─────────────────

export type UserRole = 'employee' | 'hr' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  employeeId: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  tenure: string;
  manager: {
    name: string;
    title: string;
    avatar: string;
  };
  salary: {
    base: number;
    hra: number;
    specialAllowance: number;
  };
  avatar: string;
  leaveBalanceDays: number;
  attendanceRate: number;
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
  department: string;
  status: 'Active' | 'On Leave' | 'Remote';
  avatar?: string;
  initials?: string;
  email: string;
  role: string;
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
  OrgNode,
  OrgRewindResponse,
  ApiResponse,
  Database,
} from '@/lib/types';
