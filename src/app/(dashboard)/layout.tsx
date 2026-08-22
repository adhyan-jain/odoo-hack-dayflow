import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* TODO: sidebar/nav from @/components/layout, role-aware (employee vs HR) */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
