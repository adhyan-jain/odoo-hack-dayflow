"use client";

import { useAppContext } from "@/context/AppContext";
import { AuthView } from "@/components/views/AuthView";

export default function SignInPage() {
  const { handleSignIn, alexUser, sarahUser } = useAppContext();

  return (
    <AuthView
      onSignIn={handleSignIn}
      alexUser={alexUser}
      sarahUser={sarahUser}
    />
  );
}
