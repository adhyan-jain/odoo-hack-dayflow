import React, { useEffect, useMemo, useState } from 'react';
import { AttendanceDayRow, AttendanceMonthSummary, AttendancePunch, DayAttendance, UserProfile } from '@/types';

interface AttendanceViewProps {
  currentUser: UserProfile;
  currentUserId: string;
  punches: AttendancePunch[];
  weeklyDays: DayAttendance[];
  onAddPunch: (type: 'Check In' | 'Lunch Start' | 'Lunch End' | 'Check Out') => void;
  fetchAttendanceDayRoster: (date: string) => Promise<AttendanceDayRow[]>;
  fetchAttendanceMonthSummaryFor: (employeeId: string, monthStart: string, monthEnd: string) => Promise<AttendanceMonthSummary>;
  fetchAttendanceDayRowsFor: (employeeId: string, from: string, to: string) => Promise<AttendanceDayRow[]>;
}

const pad = (n: number) => String(n).padStart(2, '0');

const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseISODate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDisplayDate = (iso: string): string =>
  parseISODate(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

interface StatPillProps {
  label: string;
  value: number | string;
  icon: string;
}

const StatPill: React.FC<StatPillProps> = ({ label, value, icon }) => (
  <div className="bg-[#FFFFFF] rounded-[20px] p-5 bento-shadow flex items-center gap-4">
    <div className="w-11 h-11 rounded-full bg-[#c8ead8]/40 text-[#436153] flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-[#1a1c1b] leading-tight">{value}</p>
      <p className="text-xs text-[#424844] font-medium">{label}</p>
    </div>
  </div>
);

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser,
  currentUserId,
  punches,
  weeklyDays,
  onAddPunch,
  fetchAttendanceDayRoster,
  fetchAttendanceMonthSummaryFor,
  fetchAttendanceDayRowsFor,
}) => {
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly'>('Daily');
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [lastCheckInTime, setLastCheckInTime] = useState<string>('9:02 AM');

  const isAdmin = currentUser.role !== 'employee';

  // --- Admin/HR: single-day roster across all employees ---
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [rosterSearch, setRosterSearch] = useState('');
  const [dayRoster, setDayRoster] = useState<AttendanceDayRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setRosterLoading(true);
      setRosterError(null);
      try {
        const rows = await fetchAttendanceDayRoster(toISODate(selectedDate));
        if (!cancelled) setDayRoster(rows);
      } catch (err) {
        if (!cancelled) setRosterError(err instanceof Error ? err.message : 'Failed to load attendance.');
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedDate, fetchAttendanceDayRoster]);

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return dayRoster;
    return dayRoster.filter((row) => row.employeeName.toLowerCase().includes(q));
  }, [dayRoster, rosterSearch]);

  const goToPrevDay = () =>
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  const goToNextDay = () =>
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));

  // --- Plain employee: month history + summary for self ---
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthSummary, setMonthSummary] = useState<AttendanceMonthSummary | null>(null);
  const [monthRows, setMonthRows] = useState<AttendanceDayRow[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    const monthEndDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    const from = toISODate(selectedMonth);
    const to = toISODate(monthEndDate);

    (async () => {
      setMonthLoading(true);
      setMonthError(null);
      try {
        const [summary, rows] = await Promise.all([
          fetchAttendanceMonthSummaryFor(currentUserId, from, to),
          fetchAttendanceDayRowsFor(currentUserId, from, to),
        ]);
        if (cancelled) return;
        setMonthSummary(summary);
        setMonthRows(rows);
      } catch (err) {
        if (!cancelled) setMonthError(err instanceof Error ? err.message : 'Failed to load attendance.');
      } finally {
        if (!cancelled) setMonthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, currentUserId, selectedMonth, fetchAttendanceMonthSummaryFor, fetchAttendanceDayRowsFor]);

  const goToPrevMonth = () =>
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const monthLabel = selectedMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const todayLabel = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

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
            {todayLabel}
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
        {viewMode === 'Daily' && (
        <div className="lg:col-span-1 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Today&apos;s Activity</h3>
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
        )}

        {viewMode === 'Weekly' && (
        <div className="lg:col-span-3 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col">
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
        )}
      </div>

      {isAdmin ? (
        /* Admin/HR: day roster across all employees */
        <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow overflow-hidden flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 border-b border-[#eeeeeb]">
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Daily Attendance</h3>
              <p className="text-xs text-[#424844] mt-0.5">All employees for the selected day</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
              <div className="relative w-full sm:w-56">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727974] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full pl-10 pr-4 py-2 bg-[#faf9f7] rounded-full border border-[#c1c8c3]/30 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] focus:outline-none placeholder:text-[#727974]"
                />
              </div>
              <div className="flex items-center gap-1 bg-[#f4f4f1] rounded-full p-1 shrink-0">
                <button
                  onClick={goToPrevDay}
                  className="p-1.5 hover:bg-white rounded-full transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <input
                  type="date"
                  value={toISODate(selectedDate)}
                  onChange={(e) => e.target.value && setSelectedDate(parseISODate(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-[#1a1c1b] px-1 focus:outline-none cursor-pointer"
                />
                <button
                  onClick={goToNextDay}
                  className="p-1.5 hover:bg-white rounded-full transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[#eeeeeb] text-[#424844] text-xs font-semibold uppercase tracking-wider bg-[#faf9f7]/60">
            <div className="col-span-4">Employee</div>
            <div className="col-span-2">Check In</div>
            <div className="col-span-2">Check Out</div>
            <div className="col-span-2">Work Hours</div>
            <div className="col-span-2">Extra Hours</div>
          </div>

          <div className="flex flex-col divide-y divide-[#eeeeeb]">
            {rosterLoading ? (
              <div className="p-12 text-center text-sm text-[#424844]">Loading attendance…</div>
            ) : rosterError ? (
              <div className="p-12 text-center text-sm text-[#ba1a1a]">{rosterError}</div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#424844]">
                No attendance records for this day.
              </div>
            ) : (
              filteredRoster.map((row) => (
                <div
                  key={row.employeeId}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-[#faf9f7] transition-colors"
                >
                  <div className="col-span-1 md:col-span-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e3e2e0] shrink-0 border border-[#c1c8c3]/40">
                      {row.employeeAvatar ? (
                        <img
                          src={row.employeeAvatar}
                          alt={row.employeeName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#e6dfd0] text-[#676256] text-xs font-bold">
                          {row.employeeName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[#1a1c1b] truncate">{row.employeeName}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2 text-sm text-[#1a1c1b]">{row.checkIn || '—'}</div>
                  <div className="col-span-1 md:col-span-2 text-sm text-[#1a1c1b]">{row.checkOut || '—'}</div>
                  <div className="col-span-1 md:col-span-2 text-sm font-semibold text-[#1a1c1b]">{row.workHours}</div>
                  <div className="col-span-1 md:col-span-2 text-sm text-[#625e52]">{row.extraHours}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Plain employee: month summary + own history */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatPill label="Days Present" value={monthSummary?.daysPresent ?? '—'} icon="event_available" />
            <StatPill label="Leaves Count" value={monthSummary?.leavesCount ?? '—'} icon="beach_access" />
            <StatPill label="Total Working Days" value={monthSummary?.totalWorkingDays ?? '—'} icon="calendar_month" />
          </div>

          <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow overflow-hidden flex flex-col">
            <div className="flex justify-between items-center gap-4 p-6 border-b border-[#eeeeeb]">
              <div>
                <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Monthly History</h3>
                <p className="text-xs text-[#424844] mt-0.5">Your day-wise attendance</p>
              </div>
              <div className="flex items-center gap-1 bg-[#f4f4f1] rounded-full p-1">
                <button
                  onClick={goToPrevMonth}
                  className="p-1.5 hover:bg-white rounded-full transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-xs font-semibold text-[#1a1c1b] px-2">{monthLabel}</span>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 hover:bg-white rounded-full transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[#eeeeeb] text-[#424844] text-xs font-semibold uppercase tracking-wider bg-[#faf9f7]/60">
              <div className="col-span-4">Date</div>
              <div className="col-span-2">Check In</div>
              <div className="col-span-2">Check Out</div>
              <div className="col-span-2">Work Hours</div>
              <div className="col-span-2">Extra Hours</div>
            </div>

            <div className="flex flex-col divide-y divide-[#eeeeeb]">
              {monthLoading ? (
                <div className="p-12 text-center text-sm text-[#424844]">Loading attendance…</div>
              ) : monthError ? (
                <div className="p-12 text-center text-sm text-[#ba1a1a]">{monthError}</div>
              ) : monthRows.length === 0 ? (
                <div className="p-12 text-center text-sm text-[#424844]">
                  No attendance records for this month.
                </div>
              ) : (
                monthRows.map((row) => (
                  <div
                    key={row.date}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-[#faf9f7] transition-colors"
                  >
                    <div className="col-span-1 md:col-span-4 text-sm font-semibold text-[#1a1c1b]">
                      {formatDisplayDate(row.date)}
                    </div>
                    <div className="col-span-1 md:col-span-2 text-sm text-[#1a1c1b]">{row.checkIn || '—'}</div>
                    <div className="col-span-1 md:col-span-2 text-sm text-[#1a1c1b]">{row.checkOut || '—'}</div>
                    <div className="col-span-1 md:col-span-2 text-sm font-semibold text-[#1a1c1b]">
                      {row.workHours}
                    </div>
                    <div className="col-span-1 md:col-span-2 text-sm text-[#625e52]">{row.extraHours}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
