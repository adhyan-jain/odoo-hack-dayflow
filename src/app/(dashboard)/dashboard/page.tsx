"use client";

import { useAppContext } from "@/context/AppContext";
import { EmployeeDashboardView } from "@/components/views/EmployeeDashboardView";
import { AdminDashboardView } from "@/components/views/AdminDashboardView";

export default function DashboardPage() {
  const {
    currentUser,
    actionItems,
    recentActivities,
    setApplyLeaveModalOpen,
    setCurrentTab,
    handleToggleActionItem,
    employeeRoster,
    pendingApprovals,
    handleApprovePending,
    handleRejectPending,
  } = useAppContext();

  if (currentUser.role === "employee") {
    return (
      <EmployeeDashboardView
        currentUser={currentUser}
        actionItems={actionItems}
        recentActivities={recentActivities}
        onApplyLeave={() => setApplyLeaveModalOpen(true)}
        onNavigateToProfile={() => setCurrentTab("profile")}
        onNavigateToAttendance={() => setCurrentTab("attendance")}
        onNavigateToPayroll={() => setCurrentTab("payroll")}
        onToggleActionItem={handleToggleActionItem}
      />
    );
  }

  return (
    <AdminDashboardView
      currentUser={currentUser}
      employeeRoster={employeeRoster}
      pendingApprovals={pendingApprovals}
      onApprove={handleApprovePending}
      onReject={handleRejectPending}
      onNavigateToDirectory={() => setCurrentTab("directory")}
      onNavigateToLeave={() => setCurrentTab("leave")}
      onNavigateToPayroll={() => setCurrentTab("payroll")}
    />
  );
}
