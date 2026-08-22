"use client";

import { useAppContext } from "@/context/AppContext";
import { PayrollView } from "@/components/views/PayrollView";

export default function PayrollPage() {
  const { currentUser, payrollRecords, setRunPayrollModalOpen } = useAppContext();

  return (
    <PayrollView
      currentUser={currentUser}
      payrollRecords={payrollRecords}
      onOpenRunPayrollModal={() => setRunPayrollModalOpen(true)}
    />
  );
}
