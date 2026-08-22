export type {
  UserRole,
  AttendanceStatus,
  LeaveType,
  LeaveStatus,
  Database,
} from "./database.types";

export type Employee =
  import("./database.types").Database["public"]["Tables"]["employees"]["Row"];
export type Attendance =
  import("./database.types").Database["public"]["Tables"]["attendance"]["Row"];
export type LeaveRequest =
  import("./database.types").Database["public"]["Tables"]["leave_requests"]["Row"];
export type Payroll =
  import("./database.types").Database["public"]["Tables"]["payroll"]["Row"];
