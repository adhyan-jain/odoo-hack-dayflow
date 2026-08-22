import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-[#FFFFFF] rounded-[24px] shadow-floating max-w-lg w-full p-6 md:p-8 z-10 animate-in fade-in zoom-in-95 border border-[#eeeeeb]">
        <div className="flex items-center justify-between pb-4 border-b border-[#eeeeeb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5b7a6b]/20 text-[#5b7a6b] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">help</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Dayflow HRMS Guide</h3>
              <p className="text-xs text-[#625e52]">Every workday, perfectly aligned</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#424844] hover:bg-[#eeeeeb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-6 space-y-4 text-xs text-[#424844]">
          <div className="p-3 bg-[#faf9f7] rounded-xl border border-[#eeeeeb]">
            <p className="font-bold text-[#1a1c1b] text-sm mb-1">Dual Persona Experience</p>
            <p>
              Switch between <strong>Alex Morgan (Senior Designer)</strong> and <strong>Sarah Jenkins (HR Director / Admin)</strong> using the switcher in the top bar to preview both employee and administrator workflows.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[18px]">schedule</span>
              <p><strong>Attendance:</strong> Clock in / out, track lunch breaks, and review weekly hours with day-by-day status indicators.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[18px]">calendar_month</span>
              <p><strong>Leave Management:</strong> Submit leave requests, filter by pending/approved, and approve or reject team submissions.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[18px]">payments</span>
              <p><strong>Payroll:</strong> Review company payroll run, view the 6-month disbursement trend chart, and download payslips.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-full bg-[#5b7a6b] hover:bg-[#436153] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
        >
          Got it, thanks
        </button>
      </div>
    </div>
  );
};
