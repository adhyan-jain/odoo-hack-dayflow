"use client";

import { AppProvider, useAppContext } from "@/context/AppContext";
import { SideNavBar } from "@/components/SideNavBar";
import { TopNavBar } from "@/components/TopNavBar";
import { MobileNavBar } from "@/components/MobileNavBar";
import { ApplyLeaveModal } from "@/components/modals/ApplyLeaveModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { RunPayrollModal } from "@/components/modals/RunPayrollModal";
import { NotificationsModal } from "@/components/modals/NotificationsModal";
import { HelpModal } from "@/components/modals/HelpModal";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const {
    currentTab,
    setCurrentTab,
    currentUser,
    handleSwitchUser,
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
      <div className="flex-1 flex flex-col min-w-0 md:pl-[72px] min-h-screen pb-20 md:pb-6">
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
          {children}
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}
