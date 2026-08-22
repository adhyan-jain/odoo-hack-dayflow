import React, { useState } from 'react';
import { UserProfile, PayrollRecord } from '@/types';

interface PayrollViewProps {
  currentUser: UserProfile;
  payrollRecords: PayrollRecord[];
  onOpenRunPayrollModal: () => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  currentUser,
  payrollRecords,
  onOpenRunPayrollModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const totalPayroll = payrollRecords.reduce((sum, r) => sum + r.netPay, 0);

  const filteredRecords = payrollRecords.filter(
    (record) =>
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPayslip = (employeeName: string) => {
    alert(`Generating & downloading October 2023 Payslip for ${employeeName}...`);
  };

  return (
    <div id="payroll-view" className="px-6 md:px-10 pb-16 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
            Payroll &amp; Compensation
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">
            Process compensation cycles, review disbursements, and manage tax withholdings
          </p>
        </div>

        {currentUser.role !== 'employee' && (
          <button
            id="btn-run-payroll"
            onClick={onOpenRunPayrollModal}
            className="bg-[#5b7a6b] text-[#ffffff] hover:bg-[#436153] px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Run Payroll Cycle
          </button>
        )}
      </div>

      {/* Top Section: Stat Card + Interactive Chart Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Total Payroll Stat (col-span-4) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between border border-[#eeeeeb]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#424844]">
              Total Payroll (Oct 2023)
            </span>
            <div className="text-4xl md:text-5xl font-bold text-[#1a1c1b] tracking-tight mt-3">
              ${totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[#436153]">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
              <span className="text-xs font-semibold">+2.4% from last month</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#eeeeeb] flex items-center justify-between text-xs text-[#625e52]">
            <span>Cycle: Oct 01 - Oct 31, 2023</span>
            <span className="font-semibold text-[#5b7a6b] bg-[#c8ead8]/30 px-2 py-0.5 rounded-full">
              Ready to disburse
            </span>
          </div>
        </div>

        {/* Payroll Trend Area Chart (col-span-8) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between border border-[#eeeeeb]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1a1c1b] tracking-tight">Payroll Trend</h3>
              <p className="text-xs text-[#424844]">Monthly net disbursement across all units</p>
            </div>
            <span className="text-xs font-semibold text-[#424844] bg-[#f4f4f1] px-3 py-1 rounded-full">
              Last 6 Months
            </span>
          </div>

          {/* SVG Smooth Area Chart */}
          <div className="relative w-full h-36 mt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b7a6b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#5b7a6b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#eeeeeb" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#eeeeeb" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#eeeeeb" />

              {/* Area */}
              <polygon
                points="0,110 0,90 100,82 200,68 300,52 400,40 500,24 500,110"
                fill="url(#payrollGradient)"
              />

              {/* Stroke Line */}
              <polyline
                points="0,90 100,82 200,68 300,52 400,40 500,24"
                fill="none"
                stroke="#5b7a6b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {[
                { x: 0, y: 90, val: '$128k' },
                { x: 100, y: 82, val: '$132k' },
                { x: 200, y: 68, val: '$135k' },
                { x: 300, y: 52, val: '$139k' },
                { x: 400, y: 40, val: '$140k' },
                { x: 500, y: 24, val: '$142.5k' },
              ].map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke="#5b7a6b"
                    strokeWidth="2.5"
                    className="hover:r-6 transition-all"
                  />
                </g>
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[11px] font-medium text-[#625e52] mt-2">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Employee Roster Payroll Table */}
      <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow overflow-hidden flex flex-col border border-[#eeeeeb]">
        <div className="p-6 border-b border-[#eeeeeb] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Employee Payroll Breakdown</h3>
            <p className="text-xs text-[#424844] mt-0.5">Individual salary items, allowances, and net calculation</p>
          </div>

          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727974] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 bg-[#f4f4f1] rounded-full border border-transparent text-xs text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] focus:outline-none placeholder:text-[#727974]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#faf9f7]/70">
                <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                  Employee
                </th>
                <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                  Base Salary
                </th>
                <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                  Allowances
                </th>
                <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                  Deductions
                </th>
                <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                  Net Pay
                </th>
                <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeeb]">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#faf9f7] transition-colors group">
                  <td className="py-4 px-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#e3e2e0] shrink-0 border border-[#c1c8c3]/40">
                      {rec.avatar ? (
                        <img
                          src={rec.avatar}
                          alt={rec.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#e6dfd0] text-[#676256] text-xs font-bold">
                          {rec.initials || rec.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1a1c1b]">{rec.name}</p>
                      <p className="text-xs text-[#625e52]">{rec.role}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-[#424844] font-medium">
                    ${rec.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-sm text-[#436153] font-medium">
                    +${rec.allowances.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-sm text-[#ba1a1a] font-medium">
                    -${rec.deductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-sm font-bold text-[#1a1c1b]">
                    ${rec.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleDownloadPayslip(rec.name)}
                      className="p-2 text-[#424844] hover:text-[#5b7a6b] hover:bg-[#eeeeeb] rounded-full transition-colors cursor-pointer"
                      title="Download Payslip"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        receipt_long
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
