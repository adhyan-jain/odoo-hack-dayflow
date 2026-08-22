"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
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
import {
  ALEX_PROFILE,
  SARAH_PROFILE,
  INITIAL_ACTION_ITEMS,
  INITIAL_RECENT_ACTIVITIES,
  INITIAL_PENDING_APPROVALS,
  INITIAL_EMPLOYEE_ROSTER,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PAYROLL_DATA,
  INITIAL_PUNCHES,
  INITIAL_WEEKLY_ATTENDANCE,
} from '@/data/mockData';
import { NavTabId } from '@/components/SideNavBar';

interface AppContextType {
  isAuthenticated: boolean;
  currentUser: UserProfile;
  currentUserId: string;
  currentTab: NavTabId;
  setCurrentTab: (tab: NavTabId) => void;
  alexUser: UserProfile;
  sarahUser: UserProfile;

  actionItems: ActionItem[];
  recentActivities: ActivityItem[];
  pendingApprovals: PendingApproval[];
  employeeRoster: EmployeeRosterItem[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  punches: AttendancePunch[];
  weeklyDays: DayAttendance[];

  // Modals state
  applyLeaveModalOpen: boolean;
  setApplyLeaveModalOpen: (open: boolean) => void;
  editProfileModalOpen: boolean;
  setEditProfileModalOpen: (open: boolean) => void;
  runPayrollModalOpen: boolean;
  setRunPayrollModalOpen: (open: boolean) => void;
  notificationsModalOpen: boolean;
  setNotificationsModalOpen: (open: boolean) => void;
  helpModalOpen: boolean;
  setHelpModalOpen: (open: boolean) => void;

  handleSwitchUser: () => void;
  handleSignIn: (user: UserProfile) => void;
  handleSignOut: () => void;
  handleToggleActionItem: (id: string) => void;
  handleApprovePending: (id: string) => void;
  handleRejectPending: (id: string) => void;
  handleApproveLeave: (id: string) => void;
  handleRejectLeave: (id: string) => void;
  handleAddPunch: (type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out') => void;
  handleApplyLeaveSubmit: (newReq: Omit<LeaveRequest, 'id'>) => void;
  handleEditProfileSave: (updated: Partial<UserProfile>) => void;
  handleRunPayroll: () => void;
  handleSelectEmployeeInDirectory: (emp: EmployeeRosterItem) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [alexUser, setAlexUser] = useState<UserProfile>(ALEX_PROFILE);
  const [sarahUser, setSarahUser] = useState<UserProfile>(SARAH_PROFILE);
  const [currentUserId, setCurrentUserId] = useState<string>('usr-alex');
  const [currentTab, setCurrentTab] = useState<NavTabId>('dashboard');

  const [actionItems, setActionItems] = useState<ActionItem[]>(INITIAL_ACTION_ITEMS);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(INITIAL_RECENT_ACTIVITIES);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(INITIAL_PENDING_APPROVALS);
  const [employeeRoster, setEmployeeRoster] = useState<EmployeeRosterItem[]>(INITIAL_EMPLOYEE_ROSTER);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(INITIAL_PAYROLL_DATA);
  const [punches, setPunches] = useState<AttendancePunch[]>(INITIAL_PUNCHES);
  const [weeklyDays, setWeeklyDays] = useState<DayAttendance[]>(INITIAL_WEEKLY_ATTENDANCE);

  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [runPayrollModalOpen, setRunPayrollModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const currentUser = currentUserId === 'usr-alex' ? alexUser : sarahUser;

  const handleSwitchUser = () => {
    if (currentUserId === 'usr-alex') {
      setCurrentUserId('usr-sarah');
    } else {
      setCurrentUserId('usr-alex');
    }
  };

  const handleSignIn = (user: UserProfile) => {
    if (user.id === 'usr-sarah') {
      setSarahUser(user);
      setCurrentUserId('usr-sarah');
    } else {
      setAlexUser(user);
      setCurrentUserId('usr-alex');
    }
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
  };

  const handleToggleActionItem = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' }
          : item
      )
    );
  };

  const handleApprovePending = (id: string) => {
    const item = pendingApprovals.find((p) => p.id === id);
    setPendingApprovals((prev) => prev.filter((p) => p.id !== id));
    if (item) {
      setRecentActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: `Approved: ${item.name} (${item.title})`,
          subtitle: item.details,
          timeAgo: 'Just now',
          icon: 'check_circle',
          iconBg: 'bg-[#c8ead8]/40',
          iconColor: 'text-[#436153]',
        },
        ...prev,
      ]);
    }
  };

  const handleRejectPending = (id: string) => {
    setPendingApprovals((prev) => prev.filter((p) => p.id !== id));
  };

  const handleApproveLeave = (id: string) => {
    setLeaveRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'Approved' } : req))
    );
  };

  const handleRejectLeave = (id: string) => {
    setLeaveRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'Rejected' } : req))
    );
  };

  const handleAddPunch = (type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const icon =
      type === 'Check In'
        ? 'login'
        : type === 'Check Out'
        ? 'logout'
        : type === 'Lunch Start'
        ? 'restaurant'
        : 'check';

    setPunches((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        type,
        time: timeStr,
        status: 'completed',
        icon,
      },
    ]);

    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        title: `${type} recorded at ${timeStr}`,
        subtitle: 'System Attendance Log',
        timeAgo: 'Just now',
        icon,
        iconBg: 'bg-[#e3e2e0]',
        iconColor: 'text-[#424844]',
      },
      ...prev,
    ]);
  };

  const handleApplyLeaveSubmit = (newReq: Omit<LeaveRequest, 'id'>) => {
    const newRecord: LeaveRequest = {
      ...newReq,
      id: `leave-${Date.now()}`,
    };
    setLeaveRequests((prev) => [newRecord, ...prev]);

    if (currentUserId === 'usr-alex') {
      setAlexUser((prev) => ({
        ...prev,
        leaveBalanceDays: Math.max(0, prev.leaveBalanceDays - newReq.durationDays),
      }));
    } else {
      setSarahUser((prev) => ({
        ...prev,
        leaveBalanceDays: Math.max(0, prev.leaveBalanceDays - newReq.durationDays),
      }));
    }

    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        title: `Requested ${newReq.leaveType}`,
        subtitle: `${newReq.startDate} - ${newReq.endDate} (${newReq.durationDays} days)`,
        timeAgo: 'Just now',
        icon: 'flight_takeoff',
        iconBg: 'bg-[#c8ead8]/30',
        iconColor: 'text-[#436153]',
      },
      ...prev,
    ]);
  };

  const handleEditProfileSave = (updated: Partial<UserProfile>) => {
    if (currentUserId === 'usr-alex') {
      setAlexUser((prev) => ({ ...prev, ...updated }));
    } else {
      setSarahUser((prev) => ({ ...prev, ...updated }));
    }
  };

  const handleRunPayroll = () => {
    alert('Payroll disbursement executed successfully for all active employees!');
  };

  const handleSelectEmployeeInDirectory = (emp: EmployeeRosterItem) => {
    if (emp.name.includes('Sarah')) {
      setCurrentUserId('usr-sarah');
    } else {
      setCurrentUserId('usr-alex');
    }
    setCurrentTab('profile');
  };

  const value = {
    isAuthenticated,
    currentUser,
    currentUserId,
    currentTab,
    setCurrentTab,
    alexUser,
    sarahUser,
    actionItems,
    recentActivities,
    pendingApprovals,
    employeeRoster,
    leaveRequests,
    payrollRecords,
    punches,
    weeklyDays,
    applyLeaveModalOpen,
    setApplyLeaveModalOpen,
    editProfileModalOpen,
    setEditProfileModalOpen,
    runPayrollModalOpen,
    setRunPayrollModalOpen,
    notificationsModalOpen,
    setNotificationsModalOpen,
    helpModalOpen,
    setHelpModalOpen,
    handleSwitchUser,
    handleSignIn,
    handleSignOut,
    handleToggleActionItem,
    handleApprovePending,
    handleRejectPending,
    handleApproveLeave,
    handleRejectLeave,
    handleAddPunch,
    handleApplyLeaveSubmit,
    handleEditProfileSave,
    handleRunPayroll,
    handleSelectEmployeeInDirectory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
