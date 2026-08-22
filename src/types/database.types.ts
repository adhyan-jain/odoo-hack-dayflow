export type UserRole = "employee" | "hr";
export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
export type LeaveType = "paid" | "sick" | "unpaid" | "annual" | "personal" | "maternity_paternity";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          employee_code: string;
          full_name: string;
          email: string;
          role: UserRole;
          phone: string | null;
          address: string | null;
          job_title: string | null;
          department: string | null;
          date_of_joining: string | null;
          date_of_birth: string | null;
          profile_picture_url: string | null;
          base_salary: number | null;
          leave_balance_days: number;
          employment_type: string;
          bonus_percent: number;
          equity_units: number;
          manager_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employees"]["Row"]> & {
          id: string;
          employee_code: string;
          full_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          check_in: string | null;
          lunch_start: string | null;
          lunch_end: string | null;
          check_out: string | null;
          status: AttendanceStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]> & {
          employee_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      leave_requests: {
        Row: {
          id: string;
          employee_id: string;
          leave_type: LeaveType;
          start_date: string;
          end_date: string;
          remarks: string | null;
          status: LeaveStatus;
          reviewed_by: string | null;
          reviewer_comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["leave_requests"]["Row"]
        > & {
          employee_id: string;
          leave_type: LeaveType;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["leave_requests"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll: {
        Row: {
          id: string;
          employee_id: string;
          pay_period: string;
          basic_salary: number;
          allowances: number;
          deductions: number;
          net_salary: number;
          slip_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payroll"]["Row"]> & {
          employee_id: string;
          pay_period: string;
          basic_salary: number;
        };
        Update: Partial<Database["public"]["Tables"]["payroll"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      employee_directory: {
        Row: {
          id: string;
          employee_code: string;
          full_name: string;
          email: string;
          department: string | null;
          job_title: string | null;
          profile_picture_url: string | null;
          role: UserRole;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
