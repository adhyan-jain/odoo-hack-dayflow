import { redirect } from "next/navigation";

// Payroll now lives inside the Profile page's "Salary Info" tab (see
// src/components/views/ProfileView.tsx). This route is kept only so old
// links/bookmarks land somewhere sensible.
export default function PayrollPage() {
  redirect("/profile");
}
