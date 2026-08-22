"use client";

import { useAppContext } from "@/context/AppContext";
import { TopNavBar } from "@/components/TopNavBar";
import { MobileNavBar } from "@/components/MobileNavBar";
import { ApplyLeaveModal } from "@/components/modals/ApplyLeaveModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { RunPayrollModal } from "@/components/modals/RunPayrollModal";
import { NotificationsModal } from "@/components/modals/NotificationsModal";
import { HelpModal } from "@/components/modals/HelpModal";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const {
    isLoading,
    setCurrentTab,
    currentUser,
    handleSwitchUser,
    companySettings,
    setNotificationsModalOpen,
    setHelpModalOpen,
    handleSignOut,
    applyLeaveModalOpen,
    setApplyLeaveModalOpen,
    handleApplyLeaveSubmit,
    editProfileModalOpen,
    setEditProfileModalOpen,
    handleEditProfileSave,
    runPayrollModalOpen,
    setRunPayrollModalOpen,
    payrollRecords,
    handleRunPayroll,
    notificationsModalOpen,
    helpModalOpen,
  } = useAppContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0EEE7] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#c1c8c3]/60 border-t-[#5b7a6b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EEE7] flex flex-col text-[#1a1c1b] font-sans antialiased">
      {/* Flat Top Navigation Bar */}
      <TopNavBar
        currentUser={currentUser}
        companySettings={companySettings}
        onSwitchUser={handleSwitchUser}
        onSelectTab={setCurrentTab}
        onOpenNotifications={() => setNotificationsModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* View Switcher */}
      <main className="flex-1 flex flex-col pt-2 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar onSelectTab={setCurrentTab} />

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}
