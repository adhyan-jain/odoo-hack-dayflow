"use client";

import { useAppContext } from "@/context/AppContext";
import { AttendanceView } from "@/components/views/AttendanceView";

export default function AttendancePage() {
  const { currentUser, punches, weeklyDays, handleAddPunch } = useAppContext();

  return (
    <AttendanceView
      currentUser={currentUser}
      punches={punches}
      weeklyDays={weeklyDays}
      onAddPunch={handleAddPunch}
    />
  );
}
