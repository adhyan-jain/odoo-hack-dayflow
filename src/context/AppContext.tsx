"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  UserProfile,
  UserRole,
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
import { createClient } from '@/lib/supabase/client';
import {
  addAttendancePunch,
  buildPunches,
  buildRecentActivity,
  createLeaveRequest,
  fetchAttendanceRange,
  fetchAttendanceToday,
  fetchDirectory,
  fetchLeaveRequests,
  fetchMyEmployeeRow,
  fetchPayroll,
  loadEmployeeRoster,
  loadLeaveRequests,
  loadPayroll,
  loadWeeklyAttendance,
  mapEmployeeToProfile,
  mapPendingApprovals,
  reviewLeaveRequest,
  roleToDb,
  runPayrollCycle,
  updateEmployeeProfile,
} from '@/lib/supabase/hrms';

// Demo/showcase mode: skips real Supabase auth entirely (see proxy.ts / middleware.ts,
// which honor the same flag). Flip to `false` once the schema in supabase/migrations
// has been applied to the linked project.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

const EMPTY_PROFILE: UserProfile = {
  id: '',
  name: '',
  role: 'employee',
  title: '—',
  department: '—',
  employeeId: '—',
  email: '',
  phone: '',
  address: '',
  birthDate: '—',
  joinDate: '—',
  tenure: '—',
  employmentType: '—',
  manager: { name: '—', title: '—', avatar: '' },
  salary: { base: 0, bonusPercent: 0, equity: 0 },
  avatar: '',
  leaveBalanceDays: 0,
  attendanceRate: 0,
};

interface AppContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: UserProfile;
  currentUserId: string;
  currentTab: NavTabId;
  setCurrentTab: (tab: NavTabId) => void;

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
  handleSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  handleSignUp: (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
  }) => Promise<{ error: string | null }>;
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

// ---------------------------------------------------------------------------
// Demo mode: all-mock, zero backend calls. Unchanged behavior from the
// original scaffold, adapted only to the shared context shape above.
// ---------------------------------------------------------------------------
function MockAppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [alexUser, setAlexUser] = useState<UserProfile>(ALEX_PROFILE);
  const [sarahUser, setSarahUser] = useState<UserProfile>(SARAH_PROFILE);
  const [currentUserId, setCurrentUserId] = useState<string>('usr-alex');
  const [currentTab, setCurrentTab] = useState<NavTabId>('dashboard');

  const [actionItems, setActionItems] = useState<ActionItem[]>(INITIAL_ACTION_ITEMS);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(INITIAL_RECENT_ACTIVITIES);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(INITIAL_PENDING_APPROVALS);
  const [employeeRoster] = useState<EmployeeRosterItem[]>(INITIAL_EMPLOYEE_ROSTER);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [payrollRecords] = useState<PayrollRecord[]>(INITIAL_PAYROLL_DATA);
  const [punches, setPunches] = useState<AttendancePunch[]>(INITIAL_PUNCHES);
  const [weeklyDays] = useState<DayAttendance[]>(INITIAL_WEEKLY_ATTENDANCE);

  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [runPayrollModalOpen, setRunPayrollModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const currentUser = currentUserId === 'usr-alex' ? alexUser : sarahUser;

  const handleSwitchUser = () => {
    setCurrentUserId((prev) => (prev === 'usr-alex' ? 'usr-sarah' : 'usr-alex'));
  };

  const pickPersona = (email: string) =>
    email.toLowerCase().includes('sarah') || email.toLowerCase().includes('admin') ? 'usr-sarah' : 'usr-alex';

  const handleSignIn = async (email: string) => {
    setCurrentUserId(pickPersona(email));
    setCurrentTab('dashboard');
    router.push('/dashboard');
    return { error: null };
  };

  const handleSignUp = async ({ email }: { email: string }) => {
    setCurrentUserId(pickPersona(email));
    setCurrentTab('dashboard');
    router.push('/dashboard');
    return { error: null };
  };

  const handleSignOut = () => {
    setCurrentTab('dashboard');
    router.push('/sign-in');
  };

  const handleToggleActionItem = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' } : item))
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
    setLeaveRequests((prev) => prev.map((req) => (req.id === id ? { ...req, status: 'Approved' } : req)));
  };

  const handleRejectLeave = (id: string) => {
    setLeaveRequests((prev) => prev.map((req) => (req.id === id ? { ...req, status: 'Rejected' } : req)));
  };

  const handleAddPunch = (type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const icon = type === 'Check In' ? 'login' : type === 'Check Out' ? 'logout' : type === 'Lunch Start' ? 'restaurant' : 'check';

    setPunches((prev) => [...prev, { id: `p-${Date.now()}`, type, time: timeStr, status: 'completed', icon }]);

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
    const newRecord: LeaveRequest = { ...newReq, id: `leave-${Date.now()}` };
    setLeaveRequests((prev) => [newRecord, ...prev]);

    const setUser = currentUserId === 'usr-alex' ? setAlexUser : setSarahUser;
    setUser((prev) => ({ ...prev, leaveBalanceDays: Math.max(0, prev.leaveBalanceDays - newReq.durationDays) }));

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
    const setUser = currentUserId === 'usr-alex' ? setAlexUser : setSarahUser;
    setUser((prev) => ({ ...prev, ...updated }));
  };

  const handleRunPayroll = () => {
    alert('Payroll disbursement executed successfully for all active employees!');
  };

  const handleSelectEmployeeInDirectory = (emp: EmployeeRosterItem) => {
    setCurrentUserId(emp.name.includes('Sarah') ? 'usr-sarah' : 'usr-alex');
    setCurrentTab('profile');
  };

  const value: AppContextType = {
    isAuthenticated: true,
    isLoading: false,
    currentUser,
    currentUserId,
    currentTab,
    setCurrentTab,
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
    handleSignUp,
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

// ---------------------------------------------------------------------------
// Real mode: Supabase Auth + Postgres (RLS-scoped) via src/lib/supabase/hrms.ts.
// ---------------------------------------------------------------------------
function RealAppProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTabId>('dashboard');

  const [currentUser, setCurrentUser] = useState<UserProfile>(EMPTY_PROFILE);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [employeeRoster, setEmployeeRoster] = useState<EmployeeRosterItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [punches, setPunches] = useState<AttendancePunch[]>(() => buildPunches(null));
  const [weeklyDays, setWeeklyDays] = useState<DayAttendance[]>([]);

  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [runPayrollModalOpen, setRunPayrollModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const refreshAll = useCallback(
    async (uid: string) => {
      const empRow = await fetchMyEmployeeRow(supabase, uid);
      const profile = await mapEmployeeToProfile(supabase, empRow);
      setCurrentUser(profile);

      const today = new Date().toISOString().slice(0, 10);
      const [todayRows, weekly, leaveList, payroll, roster, allLeaveRows, directory, attendanceToday, rawPayroll] = await Promise.all([
        fetchAttendanceRange(supabase, uid, today, today),
        loadWeeklyAttendance(supabase, uid),
        loadLeaveRequests(supabase, profile),
        loadPayroll(supabase, profile),
        loadEmployeeRoster(supabase),
        fetchLeaveRequests(supabase),
        fetchDirectory(supabase),
        fetchAttendanceToday(supabase),
        fetchPayroll(supabase),
      ]);

      setPunches(buildPunches(todayRows[0] ?? null));
      setWeeklyDays(weekly);
      setLeaveRequests(leaveList);
      setPayrollRecords(payroll);
      setEmployeeRoster(roster);

      const pending = profile.role === 'admin' ? mapPendingApprovals(allLeaveRows, directory) : [];
      setPendingApprovals(pending);
      setRecentActivities(buildRecentActivity({ attendanceToday, leaveRows: allLeaveRows, payrollRows: rawPayroll, directory, self: profile }));

      const items: ActionItem[] = [];
      if (!empRow.phone || !empRow.address || !empRow.job_title) {
        items.push({ id: 'ai-complete-profile', title: 'Complete your profile details', status: 'pending', dotColor: 'tertiary' });
      }
      if (profile.role === 'admin' && pending.length > 0) {
        items.push({
          id: 'ai-pending-leave',
          title: `${pending.length} leave request${pending.length === 1 ? '' : 's'} awaiting your review`,
          status: 'pending',
          dotColor: 'primary',
        });
      }
      const ownPending = leaveList.filter((l) => l.status === 'Pending Review').length;
      if (profile.role === 'employee' && ownPending > 0) {
        items.push({
          id: 'ai-own-leave',
          title: `${ownPending} leave request${ownPending === 1 ? '' : 's'} pending review`,
          status: 'pending',
          dotColor: 'tertiary',
        });
      }
      setActionItems(items);
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setAuthUser(user);
      if (user) {
        try {
          await refreshAll(user.id);
        } catch (err) {
          console.error('Failed to load HRMS data', err);
        }
      }
      setIsLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) {
        setCurrentUser(EMPTY_PROFILE);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const withRefresh = useCallback(
    (fn: (uid: string) => Promise<void>) => async () => {
      if (!authUser) return;
      try {
        await fn(authUser.id);
        await refreshAll(authUser.id);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    },
    [authUser, refreshAll]
  );

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        setIsLoading(true);
        try {
          await refreshAll(data.user.id);
        } finally {
          setIsLoading(false);
        }
      }
      setCurrentTab('dashboard');
      router.push('/dashboard');
      return { error: null };
    },
    [supabase, refreshAll, router]
  );

  const handleSignUp = useCallback(
    async ({ email, password, fullName, role }: { email: string; password: string; fullName: string; role: UserRole }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: roleToDb(role) } },
      });
      if (error) return { error: error.message };
      if (data.session && data.user) {
        setIsLoading(true);
        try {
          await refreshAll(data.user.id);
        } finally {
          setIsLoading(false);
        }
        setCurrentTab('dashboard');
        router.push('/dashboard');
      }
      return { error: null };
    },
    [supabase, refreshAll, router]
  );

  const handleSignOut = useCallback(() => {
    supabase.auth.signOut().then(() => {
      setCurrentUser(EMPTY_PROFILE);
      router.push('/sign-in');
    });
  }, [supabase, router]);

  const handleAddPunch = useCallback(
    (type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out') =>
      withRefresh((uid) => addAttendancePunch(supabase, uid, type))(),
    [withRefresh, supabase]
  );

  const handleApplyLeaveSubmit = useCallback(
    (newReq: Omit<LeaveRequest, 'id'>) =>
      withRefresh((uid) =>
        createLeaveRequest(supabase, uid, {
          leaveType: newReq.leaveType,
          startDate: newReq.startDate,
          endDate: newReq.endDate,
          notes: newReq.notes,
        })
      )(),
    [withRefresh, supabase]
  );

  const handleEditProfileSave = useCallback(
    (updated: Partial<UserProfile>) => withRefresh((uid) => updateEmployeeProfile(supabase, uid, updated))(),
    [withRefresh, supabase]
  );

  const handleRunPayroll = useCallback(() => withRefresh(() => runPayrollCycle(supabase, true))(), [withRefresh, supabase]);

  const reviewLeave = useCallback(
    (id: string, approve: boolean) => withRefresh((uid) => reviewLeaveRequest(supabase, id, uid, approve))(),
    [withRefresh, supabase]
  );

  const handleToggleActionItem = useCallback((id: string) => {
    setActionItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSelectEmployeeInDirectory = useCallback(
    (emp: EmployeeRosterItem) => {
      if (emp.id === authUser?.id) {
        setCurrentTab('profile');
        return;
      }
      router.push(`/employees/${emp.id}`);
    },
    [authUser, router]
  );

  const value: AppContextType = {
    isAuthenticated: !!authUser,
    isLoading,
    currentUser,
    currentUserId: currentUser.id,
    currentTab,
    setCurrentTab,
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
    handleSwitchUser: handleSignOut,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    handleToggleActionItem,
    handleApprovePending: (id) => reviewLeave(id, true),
    handleRejectPending: (id) => reviewLeave(id, false),
    handleApproveLeave: (id) => reviewLeave(id, true),
    handleRejectLeave: (id) => reviewLeave(id, false),
    handleAddPunch,
    handleApplyLeaveSubmit,
    handleEditProfileSave,
    handleRunPayroll,
    handleSelectEmployeeInDirectory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return BYPASS_AUTH ? <MockAppProvider>{children}</MockAppProvider> : <RealAppProvider>{children}</RealAppProvider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
