"use client";

import { useAppContext } from "@/context/AppContext";
import { OrgChartView } from "@/components/views/OrgChartView";

export default function OrgChartPage() {
  const { currentUser, fetchOrgChart } = useAppContext();

  return <OrgChartView currentUser={currentUser} fetchOrgChart={fetchOrgChart} />;
}
