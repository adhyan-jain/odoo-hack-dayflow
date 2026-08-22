/**
 * @file lib/types.ts
 * @what Single source of truth for all Dayflow types. The frontend dev imports
 *       from here — never from individual files. This ensures both sides of
 *       the integration always agree on shapes.
 * @exports Employee, Attendance, LeaveRequest, SalaryRecord, ReportingEdge,
 *          LeaveBalance, TeamCoverageConfig, and all enum types + API shapes.
 * @dependents All API routes, permissions.ts, coverage.ts, payroll.ts,
 *             and (via package import) the frontend dev's components.
 */

// ── Enums (must mirror Postgres enum values exactly) ──────────────────────────

export type UserRole = 'employee' | 'hr' | 'admin';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';
export type LeaveType = 'paid' | 'sick' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

// ── Database row types ────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  employee_code: string;
  login_id: string | null;             // HR/Admin-provisioned login identifier, e.g. "OIJODO20220001"
  must_change_password: boolean;       // true until the employee changes their system-generated password
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department: string | null;
  date_of_joining: string | null;      // ISO date string "YYYY-MM-DD"
  profile_picture_url: string | null;
  compensation_visibility: boolean;    // if true, manager can see full salary breakdown
  // ── Resume tab ──────────────────────────────────────────────────────────
  about: string | null;
  skills: string[];
  certifications: string[];
  interests: string | null;
  resume_path: string | null;         // Storage object path in the private "resumes" bucket, or null
  // ── Private Info tab: personal ─────────────────────────────────────────
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  nationality: string | null;
  personal_email: string | null;
  residing_address: string | null;
  // ── Private Info tab: bank details ─────────────────────────────────────
  bank_name: string | null;
  bank_account_no: string | null;
  ifsc_code: string | null;
  uan_no: string | null;
  pan_no: string | null;
  created_at: string;                  // ISO timestamptz
  updated_at: string;
}

export interface CompanySettings {
  id: true;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportingEdge {
  id: string;
  employee_id: string;
  manager_id: string;
  valid_from: string;                  // ISO date "YYYY-MM-DD"
  valid_to: string | null;             // null = currently active
  recorded_at: string;
  superseded_at: string | null;        // null = current row of record
}

export type SalaryComponentCategory = 'earning' | 'employer_contribution' | 'deduction';
export type SalaryComputationType = 'fixed' | 'percent';

export interface SalaryRecord {
  id: string;
  employee_id: string;
  basic_salary: number;
  hra: number;
  special_allowance: number;
  deductions: number;
  working_days_per_week: number;
  standard_daily_hours: number;
  break_minutes: number;
  valid_from: string;
  valid_to: string | null;
  recorded_at: string;
  superseded_at: string | null;
}

export interface SalaryComponent {
  id: string;
  salary_record_id: string;
  employee_id: string;
  name: string;
  category: SalaryComponentCategory;
  computation_type: SalaryComputationType;
  value: number;                       // fixed: ₹/month amount. percent: 0-100 of basic_salary
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;                        // ISO date "YYYY-MM-DD"
  check_in: string | null;             // ISO timestamptz
  check_out: string | null;
  status: AttendanceStatus;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  remarks: string | null;
  status: LeaveStatus;
  approver_id: string | null;
  attachment_url: string | null;       // sick-leave certificate, required by app-layer validation for leave_type='sick'
  sla_deadline: string;
  escalated: boolean;
  escalated_at: string | null;
  escalated_to: string | null;
  reviewer_comments: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  balance_days: number;
  reason: string | null;               // 'accrual' | 'consumption' | 'adjustment'
  valid_from: string;
  valid_to: string | null;
  recorded_at: string;
  superseded_at: string | null;
}

export interface TeamCoverageConfig {
  id: string;
  department: string;
  min_headcount_required: number;
  applies_to_leave_types: LeaveType[];
  created_at: string;
}

// ── Permission layer types (lib/permissions.ts) ───────────────────────────────

export type Resource = 'attendance' | 'leave' | 'payroll' | 'profile' | 'org';
export type Action = 'read' | 'write' | 'approve';
export type AccessResult = 'allow' | 'deny' | 'allow_partial';

// ── Coverage algorithm types (lib/coverage.ts) ────────────────────────────────

export interface DateRange {
  from: string;                        // ISO date string "YYYY-MM-DD"
  to: string;                          // ISO date string "YYYY-MM-DD"
}

export interface CoverageBreach {
  date: string;                        // "YYYY-MM-DD"
  availableAfterApproval: number;
  minRequired: number;
}

export interface CoverageResult {
  safe: boolean;
  conflicts: CoverageBreach[];
  suggestedDates: DateRange[];
}

// ── Payroll types (lib/payroll.ts) ────────────────────────────────────────────

export interface PayslipComponentLine {
  name: string;
  category: SalaryComponentCategory;
  computationType: SalaryComputationType;
  value: number;                       // as configured: ₹/month if fixed, % of basic if percent
  monthlyAmount: number;               // resolved ₹/month amount
}

export interface PayslipBreakdown {
  employeeId: string;
  month: string;                       // "YYYY-MM"
  workingDaysPerWeek: number;
  standardDailyHours: number;
  breakMinutes: number;
  // Component-level breakdown (Basic/HRA/Standard Allowance/Performance Bonus/
  // LTA/Fixed Allowance/etc.) — see salary_components.
  components: PayslipComponentLine[];
  // Gross components (retained flat for the payslip summary line)
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
  // Statutory deductions (hardcoded formulas — see ARCHITECTURE.md §12)
  pfEmployee: number;                  // 12% of basic, employee contribution
  pfEmployer: number;                  // 12% of basic, employer contribution (not deducted from net pay)
  esi: number;                         // 0.75% of gross if gross < 21000, else 0
  professionalTax: number;             // 200 (Maharashtra flat slab)
  tds: number;                         // 10% of basic if basic > 50000/month, else 0
  otherDeductions: number;             // from salary_records.deductions
  totalDeductions: number;
  netSalary: number;
  netSalaryYearly: number;
}

// ── Org tree type (returned by /api/org/rewind) ───────────────────────────────

export interface OrgNode {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  role: UserRole;
  reports: OrgNode[];                  // nested children
}

export interface OrgRewindResponse {
  date: string;
  tree: OrgNode[];                     // top-level nodes (employees with no manager on that date)
  // Flat edge list for custom rendering (e.g. D3 force graph)
  edges: Array<{ employeeId: string; managerId: string }>;
  employees: Record<string, Pick<Employee, 'full_name' | 'job_title' | 'department' | 'role'>>;
}

// ── API response envelope ─────────────────────────────────────────────────────

/** Every API route returns this shape. data is null on error; error is null on success. */
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

// ── Database type (supabase-js generic parameter) ─────────────────────────────
// This is what supabase-js uses internally for type inference.
// The frontend can pass `Database` to createBrowserClient<Database>().
//
// NOTE: supabase-js v2 GenericSchema requires each table entry to have
// a `Relationships` field (array), and the schema must have `Views`.
// We use `Relationships: []` (empty — no FK relationships are surfaced
// through the auto-generated types for this project) and `Views: {}`.

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: Employee;
        Insert: Partial<Employee> & { id: string; employee_code: string; full_name: string; email: string };
        Update: Partial<Employee>;
        Relationships: [];
      };
      reporting_edges: {
        Row: ReportingEdge;
        Insert: Omit<ReportingEdge, 'id' | 'recorded_at'>;
        Update: Partial<ReportingEdge>;
        Relationships: [];
      };
      salary_records: {
        Row: SalaryRecord;
        Insert: Omit<SalaryRecord, 'id' | 'recorded_at'>;
        Update: Partial<SalaryRecord>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: Omit<Attendance, 'id' | 'created_at'>;
        Update: Partial<Attendance>;
        Relationships: [];
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at' | 'sla_deadline' | 'escalated'>;
        Update: Partial<LeaveRequest>;
        Relationships: [];
      };
      leave_balances: {
        Row: LeaveBalance;
        Insert: Omit<LeaveBalance, 'id' | 'recorded_at'>;
        Update: Partial<LeaveBalance>;
        Relationships: [];
      };
      team_coverage_config: {
        Row: TeamCoverageConfig;
        Insert: Omit<TeamCoverageConfig, 'id' | 'created_at'>;
        Update: Partial<TeamCoverageConfig>;
        Relationships: [];
      };
      company_settings: {
        Row: CompanySettings;
        Insert: Omit<CompanySettings, 'created_at' | 'updated_at'> & { id?: true };
        Update: Partial<CompanySettings>;
        Relationships: [];
      };
      salary_components: {
        Row: SalaryComponent;
        Insert: Omit<SalaryComponent, 'id' | 'created_at'>;
        Update: Partial<SalaryComponent>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_reportees: {
        Args: { manager_uuid: string; as_of?: string };
        Returns: Array<{ employee_id: string; depth: number }>;
      };
      get_manager_chain: {
        Args: { employee_uuid: string; as_of?: string };
        Returns: Array<{ manager_id: string; depth: number }>;
      };
      get_current_salary: {
        Args: { employee_uuid: string };
        Returns: SalaryRecord[];
      };
      get_salary_at: {
        Args: { employee_uuid: string; as_of: string };
        Returns: SalaryRecord[];
      };
      escalate_overdue_leave_requests: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      is_admin_or_hr: {
        Args: { uid: string };
        Returns: boolean;
      };
      current_employee_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      company_exists: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      resolve_login_id_to_email: {
        Args: { p_login_id: string };
        Returns: string | null;
      };
      generate_login_id: {
        Args: { p_full_name: string; p_join_year: number };
        Returns: string;
      };
    };
  };
}
