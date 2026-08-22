"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ProfileView } from "@/components/views/ProfileView";
import { mapEmployeeToProfile } from "@/lib/supabase/hrms";
import {
  UserProfile,
  DbEmployee,
  EmployeeRosterItem,
  DEFAULT_PROFILE_EXTRAS,
  createSalaryBreakdown,
} from "@/types";

/** Demo-mode fallback (no Supabase client): builds a real, if partial, profile
 * straight from the already-loaded roster entry — no fake/mock data source. */
function profileFromRosterItem(roster: EmployeeRosterItem): UserProfile {
  return {
    id: roster.id,
    name: roster.name,
    role: (roster.role as UserProfile["role"]) || "employee",
    title: roster.jobTitle ?? "—",
    department: roster.department,
    employeeId: roster.employeeCode,
    ...DEFAULT_PROFILE_EXTRAS,
    loginId: roster.loginId ?? null,
    status: roster.attendanceStatus,
    email: roster.email,
    phone: "",
    address: "",
    joinDate: "—",
    tenure: "—",
    manager: { name: "—", title: "—", avatar: "" },
    salary: createSalaryBreakdown(),
    avatar: roster.avatar ?? "",
    leaveBalanceDays: 0,
    attendanceRate: 0,
  };
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { supabase, employeeRoster, currentUserId } = useAppContext();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    if (id === currentUserId) {
      router.replace("/profile");
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      if (supabase) {
        const { data, error: fetchError } = await supabase
          .from("employees")
          .select("*")
          .eq("id", id)
          .single();

        if (cancelled) return;

        if (fetchError || !data) {
          setError("Employee not found, or you don't have access to view this profile.");
          setLoading(false);
          return;
        }

        try {
          const mapped = await mapEmployeeToProfile(supabase, data as DbEmployee);
          if (!cancelled) {
            setProfile(mapped);
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setError("Failed to load this employee's profile.");
            setLoading(false);
          }
        }
      } else {
        // Demo mode: no Supabase client — derive from the roster already in context.
        const roster = employeeRoster.find((e) => e.id === id);
        if (!roster) {
          setError("Employee not found.");
          setLoading(false);
          return;
        }
        setProfile(profileFromRosterItem(roster));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, supabase, currentUserId, router, employeeRoster]);

  if (loading) {
    return (
      <div className="px-6 md:px-10 py-16 text-center text-[#625e52] text-sm">Loading profile…</div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-6 md:px-10 py-16 text-center text-[#ba1a1a] text-sm">
        {error ?? "Employee not found."}
      </div>
    );
  }

  return (
    <ProfileView
      currentUser={profile}
      viewOnly
      onEditProfile={() => {}}
      onOpenApplyLeave={() => {}}
    />
  );
}
