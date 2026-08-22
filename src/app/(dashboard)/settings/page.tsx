"use client";

import { useAppContext } from "@/context/AppContext";
import { SettingsView } from "@/components/views/SettingsView";

export default function SettingsPage() {
  const { currentUser } = useAppContext();

  return <SettingsView currentUser={currentUser} />;
}
