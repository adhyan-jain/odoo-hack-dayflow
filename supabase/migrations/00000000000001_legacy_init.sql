-- Dayflow HRMS initial schema

create type public.user_role as enum ('employee', 'hr');
create type public.attendance_status as enum ('present', 'absent', 'half_day', 'leave');
create type public.leave_type as enum ('paid', 'sick', 'unpaid');
create type public.leave_status as enum ('pending', 'approved', 'rejected');

-- Extends auth.users with HRMS-specific profile data.
create table public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_code text unique not null,
  full_name text not null,
  email text unique not null,
  role public.user_role not null default 'employee',
  phone text,
  address text,
  job_title text,
  department text,
  date_of_joining date,
  profile_picture_url text,
  base_salary numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status public.attendance_status not null default 'present',
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  remarks text,
  status public.leave_status not null default 'pending',
  reviewed_by uuid references public.employees (id),
  reviewer_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  pay_period text not null,
  basic_salary numeric(12, 2) not null,
  allowances numeric(12, 2) not null default 0,
  deductions numeric(12, 2) not null default 0,
  net_salary numeric(12, 2) generated always as (basic_salary + allowances - deductions) stored,
  slip_url text,
  created_at timestamptz not null default now(),
  unique (employee_id, pay_period)
);

create index attendance_employee_date_idx on public.attendance (employee_id, date desc);
create index leave_requests_employee_idx on public.leave_requests (employee_id, status);
create index payroll_employee_idx on public.payroll (employee_id, pay_period desc);

-- Row Level Security
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payroll enable row level security;

create function public.is_hr(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.employees where id = uid and role = 'hr'
  );
$$;

-- employees: self read/update limited fields; HR full access
create policy "Employees can view own profile" on public.employees
  for select using (auth.uid() = id or public.is_hr(auth.uid()));

create policy "Employees can update own profile" on public.employees
  for update using (auth.uid() = id or public.is_hr(auth.uid()));

create policy "HR can insert employees" on public.employees
  for insert with check (public.is_hr(auth.uid()) or auth.uid() = id);

-- attendance: self view/insert own; HR full access
create policy "View own or all attendance (HR)" on public.attendance
  for select using (auth.uid() = employee_id or public.is_hr(auth.uid()));

create policy "Employees manage own attendance" on public.attendance
  for insert with check (auth.uid() = employee_id or public.is_hr(auth.uid()));

create policy "Employees update own attendance" on public.attendance
  for update using (auth.uid() = employee_id or public.is_hr(auth.uid()));

-- leave requests: self create/view; HR view/update all
create policy "View own or all leave requests (HR)" on public.leave_requests
  for select using (auth.uid() = employee_id or public.is_hr(auth.uid()));

create policy "Employees create own leave requests" on public.leave_requests
  for insert with check (auth.uid() = employee_id);

create policy "HR reviews leave requests" on public.leave_requests
  for update using (public.is_hr(auth.uid()));

-- payroll: read-only for self; HR full access
create policy "View own or all payroll (HR)" on public.payroll
  for select using (auth.uid() = employee_id or public.is_hr(auth.uid()));

create policy "HR manages payroll" on public.payroll
  for insert with check (public.is_hr(auth.uid()));

create policy "HR updates payroll" on public.payroll
  for update using (public.is_hr(auth.uid()));
