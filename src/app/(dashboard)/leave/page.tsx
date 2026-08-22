"use client";

import { useAppContext } from "@/context/AppContext";
import { LeaveManagementView } from "@/components/views/LeaveManagementView";

export default function LeavePage() {
  const {
    currentUser,
    leaveRequests,
    handleApproveLeave,
    handleRejectLeave,
    setApplyLeaveModalOpen,
  } = useAppContext();

  return (
    <LeaveManagementView
      currentUser={currentUser}
      leaveRequests={leaveRequests}
      onApproveLeave={handleApproveLeave}
      onRejectLeave={handleRejectLeave}
      onOpenApplyModal={() => setApplyLeaveModalOpen(true)}
    />
  );
}
