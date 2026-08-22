"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { EmployeesView } from "@/components/views/EmployeesView";
import { EmployeeRosterItem } from "@/types";

export default function EmployeesPage() {
  const { employeeRoster, currentUser, currentUserId } = useAppContext();
  const router = useRouter();

  const handleSelectEmployee = (emp: EmployeeRosterItem) => {
    if (emp.id === currentUserId) {
      router.push("/profile");
      return;
    }
    router.push(`/employees/${emp.id}`);
  };

  return (
    <EmployeesView
      employees={employeeRoster}
      currentUser={currentUser}
      currentUserId={currentUserId}
      onSelectEmployee={handleSelectEmployee}
    />
  );
}
