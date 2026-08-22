"use client";

import { useAppContext } from "@/context/AppContext";
import { AttendanceView } from "@/components/views/AttendanceView";

export default function AttendancePage() {
  const {
    currentUser,
    currentUserId,
    punches,
    weeklyDays,
    handleAddPunch,
    fetchAttendanceDayRoster,
    fetchAttendanceMonthSummaryFor,
    fetchAttendanceDayRowsFor,
  } = useAppContext();

  return (
    <AttendanceView
      currentUser={currentUser}
      currentUserId={currentUserId}
      punches={punches}
      weeklyDays={weeklyDays}
      onAddPunch={handleAddPunch}
      fetchAttendanceDayRoster={fetchAttendanceDayRoster}
      fetchAttendanceMonthSummaryFor={fetchAttendanceMonthSummaryFor}
      fetchAttendanceDayRowsFor={fetchAttendanceDayRowsFor}
    />
  );
}
