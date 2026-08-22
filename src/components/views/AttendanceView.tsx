import React, { useState } from 'react';
import { UserProfile, AttendancePunch, DayAttendance } from '@/types';

interface AttendanceViewProps {
  currentUser: UserProfile;
  punches: AttendancePunch[];
  weeklyDays: DayAttendance[];
  onAddPunch: (type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out') => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser,
  punches,
  weeklyDays,
  onAddPunch,
}) => {
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly'>('Daily');
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [lastCheckInTime, setLastCheckInTime] = useState<string>('9:02 AM');

  const handleToggleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isCheckedIn) {
      setIsCheckedIn(false);
      onAddPunch('Check Out');
    } else {
      setIsCheckedIn(true);
      setLastCheckInTime(timeStr);
      onAddPunch('Check In');
    }
  };

  return (
    <div id="attendance-view" className="px-6 md:px-10 pb-12 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
      {/* Top App Bar & Segmented Toggle */}
      <div className="flex justify-between items-center w-full flex-wrap gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a1c1b] tracking-tight">
            Attendance
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">
            Log your daily schedule and track work hours seamlessly
          </p>
        </div>

        {/* Segmented Control */}
        <div className="bg-[#e9e8e6] rounded-full p-1 flex shadow-inner">
          <button
            onClick={() => setViewMode('Daily')}
            className={`px-6 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'Daily'
                ? 'bg-[#FFFFFF] text-[#436153] shadow-sm'
                : 'text-[#424844] hover:text-[#1a1c1b]'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode('Weekly')}
            className={`px-6 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'Weekly'
                ? 'bg-[#FFFFFF] text-[#436153] shadow-sm'
                : 'text-[#424844] hover:text-[#1a1c1b]'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Hero Check-in Card */}
      <div className="bg-[#5b7a6b] text-[#ffffff] rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md relative overflow-hidden">
        {/* Abstract Deco blobs */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 text-center md:text-left">
          <p className="text-sm md:text-base text-[#c8ead8] opacity-90 mb-1 font-medium">
            Thursday, Oct 26
          </p>
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {isCheckedIn ? `Checked in at ${lastCheckInTime}` : 'Checked Out'}
          </h3>
          <div className="inline-flex items-center gap-2 bg-black/15 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                isCheckedIn ? 'bg-[#c8ead8] animate-pulse' : 'bg-[#e3e2e0]'
              }`}
            />
            <span>{isCheckedIn ? 'On Duty' : 'Off Duty'}</span>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <button
            id="btn-clock-toggle"
            onClick={handleToggleCheckIn}
            className="w-full md:w-auto bg-[#FFFFFF] text-[#436153] hover:bg-[#faf9f7] px-8 py-3.5 rounded-full text-base font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCheckedIn ? 'logout' : 'login'}
            </span>
            {isCheckedIn ? 'Check Out' : 'Check In Now'}
          </button>
        </div>
      </div>

      {/* Main Grid: Today's Activity & Weekly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Activity Timeline (1 col) */}
        <div className="lg:col-span-1 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Today's Activity</h3>
              <span className="text-xs text-[#424844] font-medium bg-[#f4f4f1] px-2.5 py-1 rounded-full">
                7h 45m today
              </span>
            </div>

            <div className="flex flex-col gap-6 relative ml-2">
              {/* Timeline Line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#eeeeeb]" />

              {punches.map((punch, idx) => (
                <div key={punch.id || idx} className="flex gap-4 relative z-10 items-start">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-4 ring-[#FFFFFF] ${
                      idx === 0
                        ? 'bg-[#5b7a6b] text-white'
                        : 'bg-[#eeeeeb] text-[#424844]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {punch.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#625e52] font-medium mb-0.5">{punch.type}</p>
                    <p className="text-sm font-bold text-[#1a1c1b]">{punch.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick manual actions */}
          <div className="mt-8 pt-4 border-t border-[#eeeeeb] flex gap-2">
            <button
              onClick={() => onAddPunch('Lunch Start')}
              className="flex-1 py-2 px-3 rounded-full bg-[#f4f4f1] hover:bg-[#eeeeeb] text-xs font-semibold text-[#1a1c1b] transition-all cursor-pointer text-center"
            >
              Start Lunch
            </button>
            <button
              onClick={() => onAddPunch('Lunch End')}
              className="flex-1 py-2 px-3 rounded-full bg-[#f4f4f1] hover:bg-[#eeeeeb] text-xs font-semibold text-[#1a1c1b] transition-all cursor-pointer text-center"
            >
              End Lunch
            </button>
          </div>
        </div>

        {/* Weekly Overview Bento (2 cols) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Weekly Overview</h3>
              <p className="text-xs text-[#424844] mt-0.5">Average: 8h 08m / day</p>
            </div>
            <span className="text-xs font-semibold text-[#424844] bg-[#f4f4f1] px-3 py-1 rounded-full">
              Oct 23 - Oct 29
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-1 items-stretch">
            {weeklyDays.map((day) => {
              if (day.statusType === 'normal') {
                return (
                  <div
                    key={day.dayName}
                    className="bg-[#faf9f7] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border border-transparent hover:border-[#c1c8c3]/60 transition-all group"
                  >
                    <p className="text-xs font-medium text-[#424844]">{day.dayName}</p>
                    <div className="w-10 h-10 rounded-full bg-[#c8ead8]/40 text-[#436153] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <p className="text-xs font-semibold text-[#1a1c1b]">{day.hours}</p>
                  </div>
                );
              }

              if (day.statusType === 'pto') {
                return (
                  <div
                    key={day.dayName}
                    className="bg-[#faf9f7] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border border-transparent hover:border-[#c1c8c3]/60 transition-all"
                  >
                    <p className="text-xs font-medium text-[#424844]">{day.dayName}</p>
                    <div className="w-10 h-10 rounded-full bg-[#e6dfd0] text-[#676256] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">beach_access</span>
                    </div>
                    <p className="text-xs font-semibold text-[#676256]">PTO</p>
                  </div>
                );
              }

              if (day.statusType === 'active') {
                return (
                  <div
                    key={day.dayName}
                    className="bg-[#5b7a6b]/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 ring-2 ring-[#5b7a6b] shadow-sm"
                  >
                    <p className="text-xs font-bold text-[#436153]">{day.dayName}</p>
                    <div className="w-10 h-10 rounded-full bg-[#5b7a6b] text-[#ffffff] flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">schedule</span>
                    </div>
                    <p className="text-xs font-bold text-[#436153]">Active</p>
                  </div>
                );
              }

              if (day.statusType === 'future') {
                return (
                  <div
                    key={day.dayName}
                    className="bg-[#f4f4f1] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 opacity-70"
                  >
                    <p className="text-xs font-medium text-[#424844]">{day.dayName}</p>
                    <div className="w-10 h-10 rounded-full border border-dashed border-[#727974] flex items-center justify-center text-[#727974]">
                      <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                    </div>
                    <p className="text-xs text-transparent select-none">-</p>
                  </div>
                );
              }

              // Weekend
              return (
                <div
                  key={day.dayName}
                  className="bg-[#faf9f7]/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 opacity-50"
                >
                  <p className="text-xs font-medium text-[#424844]">{day.dayName}</p>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#c1c8c3]" />
                  <p className="text-xs text-transparent select-none">-</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
