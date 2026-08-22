"use client";

import { useAppContext } from "@/context/AppContext";
import { DirectoryView } from "@/components/views/DirectoryView";

export default function DirectoryPage() {
  const { employeeRoster, handleSelectEmployeeInDirectory } = useAppContext();

  return (
    <DirectoryView
      employees={employeeRoster}
      onSelectEmployee={handleSelectEmployeeInDirectory}
    />
  );
}
