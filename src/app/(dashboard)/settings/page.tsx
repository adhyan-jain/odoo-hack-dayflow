"use client";

import { useAppContext } from "@/context/AppContext";
import { SettingsView } from "@/components/views/SettingsView";

export default function SettingsPage() {
  const {
    currentUser,
    companySettings,
    teamCoverageConfig,
    handleUpdateCompanySettings,
    handleSaveTeamCoverageConfig,
  } = useAppContext();

  return (
    <SettingsView
      currentUser={currentUser}
      companySettings={companySettings}
      teamCoverageConfig={teamCoverageConfig}
      onUpdateCompanySettings={handleUpdateCompanySettings}
      onSaveTeamCoverageConfig={handleSaveTeamCoverageConfig}
    />
  );
}
