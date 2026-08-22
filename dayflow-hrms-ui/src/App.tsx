import React, { useState } from 'react';
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
} from './types';
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
} from './data/mockData';
import { SideNavBar, NavTabId } from './components/SideNavBar';
import { TopNavBar } from './components/TopNavBar';
import { MobileNavBar } from './components/MobileNavBar';
import { AuthView } from './components/views/AuthView';
import { EmployeeDashboardView } from './components/views/EmployeeDashboardView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { AttendanceView } from './components/views/AttendanceView';
import { LeaveManagementView } from './components/views/LeaveManagementView';
import { ProfileView } from './components/views/ProfileView';
import { PayrollView } from './components/views/PayrollView';
import { DirectoryView } from './components/views/DirectoryView';
import { SettingsView } from './components/views/SettingsView';
import { ApplyLeaveModal } from './components/modals/ApplyLeaveModal';
import { EditProfileModal } from './components/modals/EditProfileModal';
import { RunPayrollModal } from './components/modals/RunPayrollModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { HelpModal } from './components/modals/HelpModal';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [alexUser, setAlexUser] = useState<UserProfile>(ALEX_PROFILE);
  const [sarahUser, setSarahUser] = useState<UserProfile>(SARAH_PROFILE);
  const [currentUserId, setCurrentUserId] = useState<string>('usr-alex');
  const [currentTab, setCurrentTab] = useState<NavTabId>('dashboard');

  // Application Data States
  const [actionItems, setActionItems] = useState<ActionItem[]>(INITIAL_ACTION_ITEMS);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(INITIAL_RECENT_ACTIVITIES);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(INITIAL_PENDING_APPROVALS);
  const [employeeRoster, setEmployeeRoster] = useState<EmployeeRosterItem[]>(INITIAL_EMPLOYEE_ROSTER);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(INITIAL_PAYROLL_DATA);
  const [punches, setPunches] = useState<AttendancePunch[]>(INITIAL_PUNCHES);
  const [weeklyDays, setWeeklyDays] = useState<DayAttendance[]>(INITIAL_WEEKLY_ATTENDANCE);

  // Modal States
  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [runPayrollModalOpen, setRunPayrollModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const currentUser = currentUserId === 'usr-alex' ? alexUser : sarahUser;

  // Handlers
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

    // Update currentUser balance
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

  if (!isAuthenticated) {
    return (
      <AuthView
        onSignIn={handleSignIn}
        alexUser={alexUser}
        sarahUser={sarahUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EEE7] flex text-[#1a1c1b] font-sans antialiased">
      {/* 72px Fixed Desktop Rail Navigation */}
      <SideNavBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-[72px] min-h-screen pb-20 md:pb-6">
        {/* Top Header Bar */}
        <TopNavBar
          currentTab={currentTab}
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
          onSelectTab={setCurrentTab}
          onOpenNotifications={() => setNotificationsModalOpen(true)}
          onOpenHelp={() => setHelpModalOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* View Switcher */}
        <main className="flex-1 flex flex-col pt-2">
          {currentTab === 'dashboard' && currentUser.role === 'employee' && (
            <EmployeeDashboardView
              currentUser={currentUser}
              actionItems={actionItems}
              recentActivities={recentActivities}
              onApplyLeave={() => setApplyLeaveModalOpen(true)}
              onNavigateToProfile={() => setCurrentTab('profile')}
              onNavigateToAttendance={() => setCurrentTab('attendance')}
              onNavigateToPayroll={() => setCurrentTab('payroll')}
              onToggleActionItem={handleToggleActionItem}
            />
          )}

          {currentTab === 'dashboard' && currentUser.role === 'admin' && (
            <AdminDashboardView
              currentUser={currentUser}
              employeeRoster={employeeRoster}
              pendingApprovals={pendingApprovals}
              onApprove={handleApprovePending}
              onReject={handleRejectPending}
              onNavigateToDirectory={() => setCurrentTab('directory')}
              onNavigateToLeave={() => setCurrentTab('leave')}
              onNavigateToPayroll={() => setCurrentTab('payroll')}
            />
          )}

          {currentTab === 'attendance' && (
            <AttendanceView
              currentUser={currentUser}
              punches={punches}
              weeklyDays={weeklyDays}
              onAddPunch={handleAddPunch}
            />
          )}

          {currentTab === 'leave' && (
            <LeaveManagementView
              currentUser={currentUser}
              leaveRequests={leaveRequests}
              onApproveLeave={handleApproveLeave}
              onRejectLeave={handleRejectLeave}
              onOpenApplyModal={() => setApplyLeaveModalOpen(true)}
            />
          )}

          {currentTab === 'payroll' && (
            <PayrollView
              currentUser={currentUser}
              payrollRecords={payrollRecords}
              onOpenRunPayrollModal={() => setRunPayrollModalOpen(true)}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onEditProfile={() => setEditProfileModalOpen(true)}
              onOpenApplyLeave={() => setApplyLeaveModalOpen(true)}
            />
          )}

          {currentTab === 'directory' && (
            <DirectoryView
              employees={employeeRoster}
              onSelectEmployee={handleSelectEmployeeInDirectory}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Modals */}
      <ApplyLeaveModal
        isOpen={applyLeaveModalOpen}
        onClose={() => setApplyLeaveModalOpen(false)}
        currentUser={currentUser}
        onSubmit={handleApplyLeaveSubmit}
      />

      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        currentUser={currentUser}
        onSave={handleEditProfileSave}
      />

      <RunPayrollModal
        isOpen={runPayrollModalOpen}
        onClose={() => setRunPayrollModalOpen(false)}
        records={payrollRecords}
        onConfirmRun={handleRunPayroll}
      />

      <NotificationsModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
      />

      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </div>
  );
}

export default App;
