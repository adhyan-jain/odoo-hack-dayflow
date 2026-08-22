import React, { useState } from 'react';
import { UserProfile, LeaveType, LeaveRequest } from '@/types';

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSubmit: (newRequest: Omit<LeaveRequest, 'id'>) => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
}) => {
  const [leaveType, setLeaveType] = useState<LeaveType>('Paid Leave');
  const [startDate, setStartDate] = useState(() => addDays(1));
  const [endDate, setEndDate] = useState(() => addDays(3));
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const calculateDays = () => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  const daysCount = calculateDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      employeeName: currentUser.name,
      employeeDept: currentUser.department,
      employeeAvatar: currentUser.avatar,
      employeeId: currentUser.employeeId,
      leaveType,
      startDate,
      endDate,
      durationDays: daysCount,
      status: 'Pending Review',
      notes,
      appliedDate: 'Just now',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-[#FFFFFF] rounded-[24px] shadow-floating max-w-lg w-full p-6 md:p-8 z-10 animate-in fade-in zoom-in-95 border border-[#eeeeeb]">
        <div className="flex items-center justify-between pb-4 border-b border-[#eeeeeb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c8ead8]/40 text-[#436153] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">flight_takeoff</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Request Time Off</h3>
              <p className="text-xs text-[#625e52]">
                Remaining balance: {currentUser.leaveBalanceDays} days
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#424844] hover:bg-[#eeeeeb] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Leave Category
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            >
              <option value="Paid Leave">Paid Leave</option>
              <option value="Sick Leave">Sick / Medical Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-[#faf9f7] rounded-2xl flex items-center justify-between border border-[#eeeeeb]">
            <span className="text-xs font-medium text-[#424844]">Total Requested Days:</span>
            <span className="text-sm font-bold text-[#5b7a6b]">
              {daysCount} {daysCount === 1 ? 'Working Day' : 'Working Days'}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Reason / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Attending family wedding, coverage arranged with Sarah..."
              className="w-full rounded-2xl bg-[#f4f4f1] border-0 p-3 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none placeholder:text-[#727974]"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-full bg-[#5b7a6b] hover:bg-[#436153] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
