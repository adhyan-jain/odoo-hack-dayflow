import React, { useState } from 'react';
import { PayrollRecord } from '../../types';

interface RunPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: PayrollRecord[];
  onConfirmRun: () => void;
}

export const RunPayrollModal: React.FC<RunPayrollModalProps> = ({
  isOpen,
  onClose,
  records,
  onConfirmRun,
}) => {
  const [includeBonus, setIncludeBonus] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Direct Deposit (ACH)');

  if (!isOpen) return null;

  const totalDisbursement = records.reduce((acc, curr) => acc + curr.netPay, 0);

  const handleRun = () => {
    onConfirmRun();
    onClose();
  };

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
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">
                Process Payroll Cycle
              </h3>
              <p className="text-xs text-[#625e52]">Period: October 2023</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#424844] hover:bg-[#eeeeeb] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="p-4 bg-[#faf9f7] rounded-2xl border border-[#eeeeeb]">
            <p className="text-xs font-semibold text-[#625e52] uppercase tracking-wider">
              Total Disbursement Amount
            </p>
            <p className="text-3xl font-bold text-[#1a1c1b] mt-1">
              ${totalDisbursement.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#5b7a6b] font-medium mt-1">
              {records.length} Employees Included • All Tax Withholdings Calculated
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Settlement Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            >
              <option value="Direct Deposit (ACH)">Automated Clearing House (Direct Deposit)</option>
              <option value="Wire Transfer">Same-day Fedwire Disbursement</option>
              <option value="Physical Cheque">Payroll Cheque Batch</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#f4f4f1] rounded-2xl">
            <div>
              <p className="text-xs font-semibold text-[#1a1c1b]">Include Performance Allowances</p>
              <p className="text-[11px] text-[#625e52]">
                Applies approved monthly travel and meal stipends.
              </p>
            </div>
            <input
              type="checkbox"
              checked={includeBonus}
              onChange={(e) => setIncludeBonus(e.target.checked)}
              className="w-5 h-5 accent-[#5b7a6b] rounded cursor-pointer"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRun}
              className="flex-1 py-3 rounded-full bg-[#5b7a6b] hover:bg-[#436153] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              Execute Disbursement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
