import {
  UserProfile,
  LeaveRequest,
  AttendancePunch,
  DayAttendance,
  ActionItem,
  ActivityItem,
  PendingApproval,
  EmployeeRosterItem,
  PayrollRecord,
} from '@/types';

export const ALEX_PROFILE: UserProfile = {
  id: 'usr-alex',
  name: 'Alex Morgan',
  role: 'employee',
  title: 'Senior Designer',
  department: 'Product & Design',
  employeeId: 'EMP-3891',
  email: 'alex.morgan@dayflow.inc',
  phone: '+1 (555) 234-5678',
  address: '1420 Pinecrest Way, Apt 3A, San Francisco, CA 94107',
  birthDate: 'June 18, 1993',
  joinDate: 'February 10, 2022',
  tenure: '2y 4m',
  employmentType: 'Full-Time (Salaried)',
  manager: {
    name: 'Sarah Jenkins',
    title: 'Director of Product Design',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBSIq140tDlXAHCGhSKwjvBOFduOvDSGkRcTmy3KozI73rqVEHWoOMn_KFDOW4Ym00sHV_IH0jeysmpFohMPD7YdsRgyQ4jyNaztLwu-WE452ysGOxbfB9eKgY9YLZZQd30aplTKmYi31A9QMbLshidGd2L3XNrF6YwCrFhQ68wTxGIxVLuibdjnDo_CK0wezHe08JbxDhPmclmOa6HK9FHin7MsAuIHArCCuTWOuf_GEoVB0hRER96',
  },
  salary: {
    base: 135000,
    bonusPercent: 12,
    equity: 3200,
  },
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAA41u7uxsnvU3i6MBOj2rjHGrooAGCm7C5VukXiP9qjnaoJomIvI3nzS9p4rPY93hrGaieDRm1MpQz4daNsFVIyx_oZvqXNWBHm8ytVl9ZwqAmvUDUhfUKQbBIl8mxyOLgNz3snnDk9ONKPjt68gfzWxiaKFGonZ4r40JpLpgdM0epbj1wSzyLiQfbbDPUXxdQFhcK3-wYfz5y0S4lqZgiciozTMiweC4PT73dtZMxxjKRkzwt45dx',
  leaveBalanceDays: 12,
  attendanceRate: 88,
};

export const SARAH_PROFILE: UserProfile = {
  id: 'usr-sarah',
  name: 'Sarah Jenkins',
  role: 'admin',
  title: 'Director of Product Design',
  department: 'Product & Engineering',
  employeeId: 'EMP-8492',
  email: 'sarah.jenkins@dayflow.inc',
  phone: '+1 (555) 019-8234',
  address: '4920 Serenity Lane, Apt 4B, Seattle, WA 98109',
  birthDate: 'October 12, 1988',
  joinDate: 'March 15, 2021',
  tenure: '2y 8m',
  employmentType: 'Full-Time (Salaried)',
  manager: {
    name: 'David Chen',
    title: 'VP Product',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCe9Pq5hbvwnMT8oPlGciaE0fiZISXyD4w-NQzWIXXXjpZ28pZD4JMakdEdYW7Fvc7dknBEfb-VdhAC_hHk3uI-y2zex0qGhQVRvNxJkGnrvo2QdTwvuz0XnYXi3oevrqPOJggn3SQjwHcnAgQlA01_J3Yf9oOazvuR3HVT2Z_wam8EXwTNFpDADj67juB_zxdISgIQ1Ia1bUJ96nV7eMga-oCriNnfU_tBKHgZk33YBS3KMCoGauW8',
  },
  salary: {
    base: 165000,
    bonusPercent: 15,
    equity: 4500,
  },
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDGM4RuGzmjUs9Ph46NUqBCm2e62-NqwTtZ9-rgGPbIs6-pFQVO6CpcFGpK_82p6ZV82URTRRkSUmsA5t4_mVPtZcnp6qS8zOZFzdSgd42bOh1T-to9EK_xjyuQuHBt9StHt2FXrmpbCcFhZeq2n8l1foCIVMqzeb0-V472rQiMlz_pyB_NHR-HdkpfUSQJUS05SO7rqW2mUzUzT_UvqLkImu4s-gI8fTGeNRxbRFjJISr0GfgPgoPV',
  leaveBalanceDays: 18,
  attendanceRate: 96,
};

export const INITIAL_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'act-1',
    title: 'Review Q3 Goals',
    status: 'pending',
    dotColor: 'error',
  },
  {
    id: 'act-2',
    title: 'Sign updated NDA',
    status: 'pending',
    dotColor: 'tertiary',
  },
];

export const INITIAL_RECENT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-hist-1',
    title: 'Leave request approved',
    subtitle: 'Manager approved your dates for Nov 12-14.',
    timeAgo: 'Just now',
    icon: 'check_circle',
    iconBg: 'bg-[#c8ead8]/30',
    iconColor: 'text-[#436153]',
  },
  {
    id: 'act-hist-2',
    title: 'Checked in at 9:02 AM',
    subtitle: 'Location: HQ Building A',
    timeAgo: 'Today',
    icon: 'login',
    iconBg: 'bg-[#e3e2e0]',
    iconColor: 'text-[#424844]',
  },
  {
    id: 'act-hist-3',
    title: 'Payslip available',
    subtitle: 'October 2023 statement is ready to view.',
    timeAgo: 'Yesterday',
    icon: 'receipt_long',
    iconBg: 'bg-[#e9e2d3]',
    iconColor: 'text-[#625e52]',
  },
];

export const INITIAL_PENDING_APPROVALS: PendingApproval[] = [
  {
    id: 'appr-1',
    type: 'leave',
    name: 'Sarah Kline',
    title: 'Annual Leave',
    details: 'Oct 12 - Oct 18 (5 days)',
    durationOrAmount: '5 days',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB5TDFzAfRxWtH0HvLZZPqcLWmZcj7kyriF5xTx8S7Tn4GL150IXdBCr2cRltScA95gJTfCpkHV-g5zZMVQS_pncH9EjPevFKaMQjP3clQ9xTT6P4VGVmoalZN0HZdzak8cB9VVeCX0Zbn8d4nya04-q9xqfFDae6xoN04ysxkWM0A_iPGWmhGeThlaCSBUYHtCeui3hADkBTq-qLCRqYmBPvaPSzzABOt5OxcMgEary_rns1evtnQc',
  },
  {
    id: 'appr-2',
    type: 'expense',
    name: 'Tom Perez',
    title: 'Expense Report',
    details: 'Client Dinner - $145.00',
    durationOrAmount: '$145.00',
    initials: 'TP',
  },
  {
    id: 'appr-3',
    type: 'leave',
    name: 'David Lee',
    title: 'Sick Leave',
    details: 'Oct 5 (1 day)',
    durationOrAmount: '1 day',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Aj5QIxfBu_0wT-DFq68HvZLfA2Ab6_c1JRFONWIunFWVAXsQZwGmzvXrEtXOyXrZR-VrfNOW9AABHDKPKmW0-U9cfzvddfxCeFj44Qss3NDe0e7BMtp3KMewTMQS_P-Nhy8QO0MFBV2it6uOQLrvhFn7l0-JosZXwJy2Cnl4DHjA1JIWeSP87ajCkVipOGMlYwScmpNlFZrkgEy_-dSZEQtUik3IFezqPvztvjiJVBn3DBuZPFKc',
  },
];

export const INITIAL_EMPLOYEE_ROSTER: EmployeeRosterItem[] = [
  {
    id: 'emp-1',
    name: 'Marcus Chen',
    employeeCode: 'EMP-2041',
    department: 'Engineering',
    status: 'Active',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJroW7ngteaVdPqSlkdolD_EzEwqy3wCg2Aq1Y7UHVk3EwKXGSBJOFU_BjhVS9Lm3CmiDGja9Zi-aovdJS7qi0SIhkOgTwzcTgLJRzsoJWoIfAk23HA1ZvANn06gc-QN0Vx76b6UERw6uJsVMPjsgA64HyOA8RaO6n8Ui3IvD5AN9iR2zIHc0uN0cwlC8yGI2CLO1mdIsxWfsZTAZrhhr5tp2kPTFMBJHAvdtXgsZalrEzmI0WMC2A',
    email: 'marcus.chen@dayflow.inc',
    role: 'Staff Engineer',
  },
  {
    id: 'emp-2',
    name: 'Elena Rodriguez',
    employeeCode: 'EMP-1892',
    department: 'Marketing',
    status: 'Active',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAuB7GHPzf7Wh3HEb5u0IQv9ADn_Z_YKFG3jYzQ8Pl7pYI09SkU2RgQBMuW7OMLy2-ucz_mWETYjbAPby-5JCrZxviuXdcWs1ZD08d1riLyRLgMi2is6vB3Wr7LM8GFIXqgandERE5Pw_I8R-QirzRfmZplwGsrdoE4RlukqwW7ONtZeoJ4jwObW_x4T_xuo4Xupid8ko-F2tm6bPVlUVYH1sIt2F8-QbqDb3WAirXJ6gvOAtd96-O_',
    email: 'elena.rodriguez@dayflow.inc',
    role: 'Marketing Lead',
  },
  {
    id: 'emp-3',
    name: 'James Donovan',
    employeeCode: 'EMP-1905',
    department: 'Sales',
    status: 'On Leave',
    initials: 'JD',
    email: 'james.donovan@dayflow.inc',
    role: 'Account Executive',
  },
  {
    id: 'emp-4',
    name: 'Robert Vance',
    employeeCode: 'EMP-1022',
    department: 'Finance',
    status: 'Active',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA0mBp2ifeJHnPOqVdeT5gNrigHE9ZoOc-I2R4jQFgt_GcXPWsFFE1xwHshLqP6wrwm04yuqCan1-lXLPpkIHM7vS-VgJJikqGNb_OA0thaa8SlAJ1SSMsh1POfG1v1qUTkC0sQJuaXSo5KRm4XlPS30O_lsr-Fa6K81jNI5OAqT4MDX_whFBT31lhD8dPnUgVO-401H2fw5qkdmxTDEqAnxjWNiF1jrXSYCeShnIJo5D3Aj_7p6iPc',
    email: 'robert.vance@dayflow.inc',
    role: 'Senior Financial Analyst',
  },
  {
    id: 'emp-5',
    name: 'Sarah Kline',
    employeeCode: 'EMP-2309',
    department: 'Design',
    status: 'Active',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB5TDFzAfRxWtH0HvLZZPqcLWmZcj7kyriF5xTx8S7Tn4GL150IXdBCr2cRltScA95gJTfCpkHV-g5zZMVQS_pncH9EjPevFKaMQjP3clQ9xTT6P4VGVmoalZN0HZdzak8cB9VVeCX0Zbn8d4nya04-q9xqfFDae6xoN04ysxkWM0A_iPGWmhGeThlaCSBUYHtCeui3hADkBTq-qLCRqYmBPvaPSzzABOt5OxcMgEary_rns1evtnQc',
    email: 'sarah.kline@dayflow.inc',
    role: 'Design Lead',
  },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'leave-1',
    employeeName: 'Michael Chen',
    employeeDept: 'Engineering Dept',
    employeeAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCkL5gj3akZvvwh87ocSSUhs01-oAMPf1Ddcss8aTIi-BclJlr_FrMU_iXoWnIkzTnhsQ6UkuYfZ5zj7BaBloFd3LJYhcE7LXk52csH__SQAN_YIxh86wVQrt80HwkE71SUhfi3v0fkuXJG7yGZ-X3DiJf2gfSH4KJu0eeMT9DBWOFG937ibzEl6OvmxKPEBzcXep7homwEoklY9_gJ2Hp9ZOtrzJZBBm2lth1n5mUc4gSH5cx9jO0o',
    employeeId: 'EMP-2041',
    leaveType: 'Sick Leave',
    startDate: 'Oct 12, 2023',
    endDate: 'Oct 14, 2023',
    durationDays: 3,
    status: 'Pending Review',
    appliedDate: 'Oct 10, 2023',
  },
  {
    id: 'leave-2',
    employeeName: 'Sarah Jenkins',
    employeeDept: 'Marketing',
    employeeAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9qp2annmTPjq0qnF7gbq7_08oLgXbI-2JHX-zxpS43pOgLEg32lEFZuZVpGatYiEUijeaXoQbZFuOoGkLA4yIXmq9c798FVAHVMa2Twj5CDvYBAPT3bYqQqqtjx27zNn2e-WZdgSb4iYbMuIwKztY1nHlux2QDoJ4eH7QN9GvlHpr9_4visQWk8KCBLImAURjdS6NpesB0QBkhUUU9ADWYEbno5V9irMyVu_lXc28dmiBDWHR341',
    employeeId: 'EMP-8492',
    leaveType: 'Annual Leave',
    startDate: 'Nov 01, 2023',
    endDate: 'Nov 15, 2023',
    durationDays: 10,
    status: 'Pending Review',
    appliedDate: 'Oct 20, 2023',
  },
  {
    id: 'leave-3',
    employeeName: 'Elena Rodriguez',
    employeeDept: 'Marketing',
    employeeAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAuB7GHPzf7Wh3HEb5u0IQv9ADn_Z_YKFG3jYzQ8Pl7pYI09SkU2RgQBMuW7OMLy2-ucz_mWETYjbAPby-5JCrZxviuXdcWs1ZD08d1riLyRLgMi2is6vB3Wr7LM8GFIXqgandERE5Pw_I8R-QirzRfmZplwGsrdoE4RlukqwW7ONtZeoJ4jwObW_x4T_xuo4Xupid8ko-F2tm6bPVlUVYH1sIt2F8-QbqDb3WAirXJ6gvOAtd96-O_',
    employeeId: 'EMP-1892',
    leaveType: 'Personal Leave',
    startDate: 'Nov 20, 2023',
    endDate: 'Nov 22, 2023',
    durationDays: 2,
    status: 'Approved',
    appliedDate: 'Oct 15, 2023',
  },
  {
    id: 'leave-4',
    employeeName: 'David Lee',
    employeeDept: 'IT Support',
    employeeAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Aj5QIxfBu_0wT-DFq68HvZLfA2Ab6_c1JRFONWIunFWVAXsQZwGmzvXrEtXOyXrZR-VrfNOW9AABHDKPKmW0-U9cfzvddfxCeFj44Qss3NDe0e7BMtp3KMewTMQS_P-Nhy8QO0MFBV2it6uOQLrvhFn7l0-JosZXwJy2Cnl4DHjA1JIWeSP87ajCkVipOGMlYwScmpNlFZrkgEy_-dSZEQtUik3IFezqPvztvjiJVBn3DBuZPFKc',
    employeeId: 'EMP-3091',
    leaveType: 'Sick Leave',
    startDate: 'Oct 05, 2023',
    endDate: 'Oct 05, 2023',
    durationDays: 1,
    status: 'Approved',
    appliedDate: 'Oct 04, 2023',
  },
];

export const INITIAL_PAYROLL_DATA: PayrollRecord[] = [
  {
    id: 'pay-1',
    name: 'Marcus Sterling',
    role: 'Lead Designer',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCinpktNRmR2euOJrxXswWo4BSYsWq0quUvNsQPx4GGot4tzif7HSsL97Fgt7MOCb2_nBU3DK7NetP3CVwMmEtLRkRbt654drYkw25NgPZ8yZDZGqeYPi2RxVIwi_ZwzFSts617kcKW1ih_KwRJc6OWOeqxBflo7AmcJBdh0IPrrJ4ioJXNjQA471WhXOwZe7bjlZcqeQj99KEkbNKwCJKuIU2-QRt8mk3BUXwIMIyQFTFap9inxeX',
    baseSalary: 8500,
    allowances: 450,
    deductions: 1250,
    netPay: 7700,
  },
  {
    id: 'pay-2',
    name: 'Sarah Yoon',
    role: 'Engineering Manager',
    initials: 'SY',
    baseSalary: 10200,
    allowances: 600,
    deductions: 1840,
    netPay: 8960,
  },
  {
    id: 'pay-3',
    name: 'Elena Rostova',
    role: 'Product Manager',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuADT_txqEH1465mAgefAIsrdEMIuud58kLFrMFq2b-_ihnIKLQWFZQTlv_bescEDlMONcspPGUEkeoiiHH2PB6owLSpMga1R1l39ldPfT9gcMN10P_2VKyZmDEpV19-iHfVYl_sjTcZnRAEEPghlktAONGBo4tpmP8gn-TewQzzr1OtsJ_K8n_lJdOOXKoRl1zzOPOATRHdCELhPwsF-6oDRbkZw4EsTRMAsUiBuhQU8vrFgxnbkLw0',
    baseSalary: 9100,
    allowances: 300,
    deductions: 1420,
    netPay: 7980,
  },
  {
    id: 'pay-4',
    name: 'James Denton',
    role: 'Senior Developer',
    initials: 'JD',
    baseSalary: 8900,
    allowances: 500,
    deductions: 1380,
    netPay: 8020,
  },
  {
    id: 'pay-5',
    name: 'Alex Morgan',
    role: 'Senior Designer',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAA41u7uxsnvU3i6MBOj2rjHGrooAGCm7C5VukXiP9qjnaoJomIvI3nzS9p4rPY93hrGaieDRm1MpQz4daNsFVIyx_oZvqXNWBHm8ytVl9ZwqAmvUDUhfUKQbBIl8mxyOLgNz3snnDk9ONKPjt68gfzWxiaKFGonZ4r40JpLpgdM0epbj1wSzyLiQfbbDPUXxdQFhcK3-wYfz5y0S4lqZgiciozTMiweC4PT73dtZMxxjKRkzwt45dx',
    baseSalary: 11250,
    allowances: 400,
    deductions: 1950,
    netPay: 9700,
  },
];

export const INITIAL_PUNCHES: AttendancePunch[] = [
  {
    id: 'p-1',
    type: 'Check In',
    time: '9:02 AM',
    status: 'completed',
    icon: 'login',
  },
  {
    id: 'p-2',
    type: 'Lunch Start',
    time: '12:30 PM',
    status: 'completed',
    icon: 'restaurant',
  },
  {
    id: 'p-3',
    type: 'Lunch End',
    time: '1:15 PM',
    status: 'completed',
    icon: 'check',
  },
];

export const INITIAL_WEEKLY_ATTENDANCE: DayAttendance[] = [
  {
    dayName: 'Mon',
    dateStr: 'Oct 23',
    hours: '8h 12m',
    statusType: 'normal',
  },
  {
    dayName: 'Tue',
    dateStr: 'Oct 24',
    hours: '8h 05m',
    statusType: 'normal',
  },
  {
    dayName: 'Wed',
    dateStr: 'Oct 25',
    hours: 'PTO',
    statusType: 'pto',
    statusText: 'PTO',
  },
  {
    dayName: 'Thu',
    dateStr: 'Oct 26',
    hours: 'Active',
    statusType: 'active',
    statusText: 'Active',
  },
  {
    dayName: 'Fri',
    dateStr: 'Oct 27',
    hours: '-',
    statusType: 'future',
  },
  {
    dayName: 'Sat',
    dateStr: 'Oct 28',
    hours: '-',
    statusType: 'weekend',
  },
  {
    dayName: 'Sun',
    dateStr: 'Oct 29',
    hours: '-',
    statusType: 'weekend',
  },
];
