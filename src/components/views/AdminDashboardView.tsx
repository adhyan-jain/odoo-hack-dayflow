import React, { useState } from 'react';
import { UserProfile, EmployeeRosterItem, PendingApproval } from '@/types';

interface AdminDashboardViewProps {
  currentUser: UserProfile;
  employeeRoster: EmployeeRosterItem[];
  pendingApprovals: PendingApproval[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onNavigateToDirectory: () => void;
  onNavigateToLeave: () => void;
  onNavigateToPayroll: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  employeeRoster,
  pendingApprovals,
  onApprove,
  onReject,
  onNavigateToDirectory,
  onNavigateToLeave,
  onNavigateToPayroll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoster = employeeRoster.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="admin-dashboard" className="px-6 md:px-10 pb-12 max-w-[1600px] mx-auto w-full flex-1">
      {/* Top Search & Filter toolbar */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
            Workforce Overview
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">Real-time status across all departments</p>
        </div>

        <div className="relative flex items-center w-full sm:w-auto">
          <span className="material-symbols-outlined absolute left-3.5 text-[#727974] pointer-events-none text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees, IDs..."
            className="pl-10 pr-4 py-2 rounded-full bg-[#FFFFFF] border border-[#c1c8c3]/40 focus:ring-2 focus:ring-[#5b7a6b] text-sm w-full sm:w-64 md:w-80 transition-all outline-none placeholder:text-[#424844]/50 shadow-sm"
          />
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ROW 1: 4 Key Stat Metric Cards */}
        {/* Stat 1: Total Employees */}
        <div
          onClick={onNavigateToDirectory}
          className="col-span-1 md:col-span-3 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col gap-4 cursor-pointer hover:shadow-floating transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#424844] uppercase tracking-wider">
              Total Employees
            </span>
            <div className="w-9 h-9 rounded-full bg-[#5b7a6b]/15 flex items-center justify-center text-[#5b7a6b] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#1a1c1b] tracking-tight">154</div>
          <div className="flex items-center gap-1.5 mt-auto text-[#436153]">
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            <span className="text-xs font-semibold">+3 this month</span>
          </div>
        </div>

        {/* Stat 2: Present Today */}
        <div className="col-span-1 md:col-span-3 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#424844] uppercase tracking-wider">
              Present Today
            </span>
            <div className="w-9 h-9 rounded-full bg-[#5b7a6b]/15 flex items-center justify-center text-[#5b7a6b]">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#1a1c1b] tracking-tight">92%</div>
          <div className="w-full bg-[#e3e2e0] h-2 rounded-full mt-auto overflow-hidden">
            <div className="bg-[#5b7a6b] h-full rounded-full w-[92%] transition-all duration-700" />
          </div>
        </div>

        {/* Stat 3: Pending Leave (Sage Accent Card) */}
        <div
          onClick={onNavigateToLeave}
          className="col-span-1 md:col-span-3 bg-[#5b7a6b] text-[#ffffff] rounded-[20px] p-6 bento-shadow flex flex-col gap-4 relative overflow-hidden cursor-pointer hover:shadow-floating transition-all group"
        >
          <div className="absolute -right-6 -bottom-6 opacity-10 text-[#ffffff] pointer-events-none group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[130px]">event_note</span>
          </div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
              Pending Leave
            </span>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">event_note</span>
            </div>
          </div>
          <div className="text-4xl md:text-5xl font-bold text-white tracking-tight relative z-10">
            {pendingApprovals.filter((p) => p.type === 'leave').length || 8}
          </div>
          <div className="text-xs font-medium text-white/90 mt-auto relative z-10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />
            Requires attention
          </div>
        </div>

        {/* Stat 4: Payroll Processed */}
        <div
          onClick={onNavigateToPayroll}
          className="col-span-1 md:col-span-3 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col gap-4 cursor-pointer hover:shadow-floating transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#424844] uppercase tracking-wider">
              Payroll Processed
            </span>
            <div className="w-9 h-9 rounded-full bg-[#e6dfd0]/50 flex items-center justify-center text-[#676256] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#1a1c1b] tracking-tight">Yes</div>
          <div className="text-xs text-[#424844] font-medium mt-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5b7a6b] block" />
            Next cycle in 12 days
          </div>
        </div>

        {/* ROW 2: Main Panels */}
        {/* Left Panel: Employee Roster (~65% width = col-span-8) */}
        <div className="col-span-1 md:col-span-8 bg-[#FFFFFF] rounded-[20px] bento-shadow flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#eeeeeb] flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Employee Roster</h2>
              <p className="text-xs text-[#424844] mt-0.5">Active team members and department allocation</p>
            </div>
            <button
              onClick={onNavigateToDirectory}
              className="text-xs font-semibold text-[#436153] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#faf9f7]/60">
                  <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                    Employee
                  </th>
                  <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                    ID
                  </th>
                  <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb]">
                    Department
                  </th>
                  <th className="text-xs text-[#424844] font-semibold uppercase tracking-wider py-3.5 px-6 border-b border-[#eeeeeb] text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeeb]">
                {filteredRoster.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#faf9f7] transition-colors group cursor-pointer"
                  >
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-[#e3e2e0] shrink-0 border border-[#c1c8c3]/40">
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#e6dfd0] text-[#676256] text-xs font-bold">
                            {emp.initials || emp.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[#1a1c1b]">{emp.name}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#424844] font-medium">{emp.employeeCode}</td>
                    <td className="py-4 px-6 text-sm text-[#424844]">{emp.department}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            emp.status === 'Active'
                              ? 'bg-[#5b7a6b]'
                              : emp.status === 'On Leave'
                              ? 'bg-[#625e52]'
                              : 'bg-[#78514f]'
                          }`}
                        />
                        <span className="text-xs font-medium text-[#1a1c1b]">{emp.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Pending Approvals (~35% width = col-span-4) */}
        <div className="col-span-1 md:col-span-4 bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col h-full">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Pending Approvals</h2>
            <div className="w-6 h-6 rounded-full bg-[#eeeeeb] flex items-center justify-center text-xs font-semibold text-[#424844]">
              {pendingApprovals.length}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 overflow-y-auto no-scrollbar flex-1">
            {pendingApprovals.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#424844] bg-[#f4f4f1] rounded-2xl">
                No pending requests. All clear!
              </div>
            ) : (
              pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-[#eeeeeb] hover:border-[#c1c8c3] transition-all flex flex-col gap-3 bg-[#ffffff]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e3e2e0] shrink-0 mt-0.5 border border-[#c1c8c3]/40">
                        {req.avatar ? (
                          <img
                            src={req.avatar}
                            alt={req.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#e6dfd0] text-[#676256] text-xs font-bold">
                            {req.initials || req.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#1a1c1b]">{req.name}</h3>
                        <p className="text-xs text-[#424844] font-medium">{req.title}</p>
                        <p className="text-xs text-[#625e52] mt-0.5">{req.details}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => onReject(req.id)}
                      className="flex-1 py-2 px-4 rounded-full border border-[#c1c8c3] text-[#1a1c1b] hover:bg-[#eeeeeb] active:scale-95 transition-all text-xs font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onApprove(req.id)}
                      className="flex-1 py-2 px-4 rounded-full bg-[#5b7a6b] text-[#ffffff] hover:bg-[#436153] active:scale-95 transition-all text-xs font-semibold cursor-pointer shadow-sm"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={onNavigateToLeave}
            className="mt-4 w-full py-2.5 text-center text-[#436153] text-xs font-semibold hover:bg-[#f4f4f1] rounded-full transition-colors cursor-pointer"
          >
            View All Requests
          </button>
        </div>
      </div>
    </div>
  );
};
