import React from 'react';
import { UserProfile, ActionItem, ActivityItem } from '@/types';

interface EmployeeDashboardViewProps {
  currentUser: UserProfile;
  actionItems: ActionItem[];
  recentActivities: ActivityItem[];
  onApplyLeave: () => void;
  onNavigateToProfile: () => void;
  onNavigateToAttendance: () => void;
  onNavigateToPayroll: () => void;
  onToggleActionItem: (id: string) => void;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({
  currentUser,
  actionItems,
  recentActivities,
  onApplyLeave,
  onNavigateToProfile,
  onNavigateToAttendance,
  onNavigateToPayroll,
  onToggleActionItem,
}) => {
  const pendingActionCount = actionItems.filter((i) => i.status === 'pending').length;

  return (
    <div id="employee-dashboard" className="px-6 md:px-10 pb-12 max-w-[1400px] mx-auto w-full flex-1">
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="text-3xl md:text-5xl font-bold text-[#1a1c1b] tracking-tight">
          Welcome back, {currentUser.name.split(' ')[0]}.
        </h2>
        <p className="text-[#424844] text-base md:text-lg mt-2 font-normal">
          Here is your snapshot for today.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* 1. Small "Your Profile" card (3 cols) */}
        <div
          onClick={onNavigateToProfile}
          className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between col-span-1 md:col-span-3 cursor-pointer hover:shadow-floating transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-full bg-[#c8ead8]/30 flex items-center justify-center text-[#436153] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                person
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToProfile();
              }}
              className="text-[#424844] hover:text-[#436153] transition-colors p-1 rounded-full hover:bg-[#eeeeeb]"
              aria-label="Profile options"
            >
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Your Profile</h3>
            <p className="text-[#424844] text-base mt-1 font-medium">{currentUser.title}</p>
          </div>
        </div>

        {/* 2. Small "Attendance Rate" card (3 cols) */}
        <div
          onClick={onNavigateToAttendance}
          className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between col-span-1 md:col-span-3 relative overflow-hidden group cursor-pointer hover:shadow-floating transition-all"
        >
          <div className="flex items-start justify-between z-10 relative">
            <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Attendance Rate</h3>
          </div>
          <div className="mt-2 z-10 relative">
            <span className="text-4xl md:text-5xl font-bold text-[#1a1c1b] tracking-tight">
              {currentUser.attendanceRate}%
            </span>
            <div className="flex items-center gap-1 mt-1.5 text-[#436153]">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
              <span className="text-xs font-semibold tracking-wide">+2.4% this month</span>
            </div>
          </div>
          {/* Sparkline Curve */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-25 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 50">
              <path
                className="text-[#436153] sparkline-path"
                d="M0,50 Q10,40 20,45 T40,30 T60,20 T80,35 T100,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* 3. Medium FILLED SAGE ACCENT CARD (6 cols) */}
        <div className="bg-[#5b7a6b] rounded-[20px] p-6 bento-shadow flex flex-col justify-between col-span-1 md:col-span-6 relative overflow-hidden text-[#ffffff] shadow-md">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="z-10 relative h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 opacity-85 mb-2">
                <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
                <span className="text-xs font-semibold uppercase tracking-wider">Annual Leave Balance</span>
              </div>
              <h3 className="text-4xl md:text-5xl font-bold tracking-tight">
                {currentUser.leaveBalanceDays} days left
              </h3>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                id="btn-apply-leave"
                onClick={onApplyLeave}
                className="text-xs font-semibold text-[#ffffff] border border-white/30 hover:bg-white/15 active:scale-95 px-5 py-2.5 rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-sm backdrop-blur-sm"
              >
                Apply for Leave
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Small "Action Items" card (4 cols) */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col col-span-1 md:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Action Items</h3>
            <span className="bg-[#ffdad6] text-[#93000a] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {pendingActionCount} Pending
            </span>
          </div>
          <div className="flex flex-col gap-2.5 flex-1 justify-center">
            {actionItems.map((item) => {
              const dotClass =
                item.dotColor === 'error'
                  ? 'bg-[#ba1a1a]'
                  : item.dotColor === 'tertiary'
                  ? 'bg-[#78514f]'
                  : 'bg-[#436153]';
              const isDone = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  onClick={() => onToggleActionItem(item.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f4f4f1] transition-all cursor-pointer group ${
                    isDone ? 'opacity-50 line-through' : ''
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
                  <span className="text-sm font-medium text-[#1a1c1b] flex-1 truncate">
                    {item.title}
                  </span>
                  <span className="material-symbols-outlined text-[#424844] text-[18px] group-hover:translate-x-0.5 transition-transform">
                    {isDone ? 'check' : 'chevron_right'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Wide "Recent Activity" card (8 cols) */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col col-span-1 md:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Recent Activity</h3>
            <button
              onClick={onNavigateToAttendance}
              className="text-xs font-semibold text-[#436153] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col divide-y divide-[#eeeeeb]">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                onClick={
                  act.title.includes('Payslip')
                    ? onNavigateToPayroll
                    : onNavigateToAttendance
                }
                className="py-3.5 flex items-center justify-between hover:bg-[#faf9f7] px-2 rounded-xl transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full ${act.iconBg} ${act.iconColor} flex items-center justify-center shrink-0`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {act.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1b]">{act.title}</p>
                    <p className="text-xs text-[#424844] mt-0.5">{act.subtitle}</p>
                  </div>
                </div>
                <span className="text-xs text-[#625e52] opacity-70 group-hover:opacity-100 transition-opacity">
                  {act.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
