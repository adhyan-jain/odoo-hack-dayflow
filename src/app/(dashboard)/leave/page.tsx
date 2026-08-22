"use client";

import { useAppContext } from "@/context/AppContext";
import { LeaveManagementView } from "@/components/views/LeaveManagementView";

export default function LeavePage() {
  const {
    currentUser,
    currentUserId,
    leaveRequests,
    employeeRoster,
    supabase,
    handleApproveLeave,
    handleRejectLeave,
    handleFetchCoverageWarning,
    setApplyLeaveModalOpen,
  } = useAppContext();

  return (
    <LeaveManagementView
      currentUser={currentUser}
      currentUserId={currentUserId}
      leaveRequests={leaveRequests}
      employeeRoster={employeeRoster}
      supabase={supabase}
      onApproveLeave={handleApproveLeave}
      onRejectLeave={handleRejectLeave}
      onFetchCoverageWarning={handleFetchCoverageWarning}
      onOpenApplyModal={() => setApplyLeaveModalOpen(true)}
    />
  );
}
