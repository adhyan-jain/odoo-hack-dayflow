"use client";

import { useAppContext } from "@/context/AppContext";
import { ProfileView } from "@/components/views/ProfileView";

export default function ProfilePage() {
  const { currentUser, setEditProfileModalOpen, setApplyLeaveModalOpen } = useAppContext();

  return (
    <ProfileView
      currentUser={currentUser}
      onEditProfile={() => setEditProfileModalOpen(true)}
      onOpenApplyLeave={() => setApplyLeaveModalOpen(true)}
    />
  );
}
