export type UserRole = "employee" | "hr";
export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
export type LeaveType = "paid" | "sick" | "unpaid";
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
          profile_picture_url: string | null;
          base_salary: number | null;
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
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          check_in: string | null;
          check_out: string | null;
          status: AttendanceStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]> & {
          employee_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
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
      };
    };
  };
}
