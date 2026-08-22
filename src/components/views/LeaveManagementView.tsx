import React, { useState } from 'react';
import { UserProfile, LeaveRequest, LeaveStatus } from '@/types';

interface LeaveManagementViewProps {
  currentUser: UserProfile;
  leaveRequests: LeaveRequest[];
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onOpenApplyModal: () => void;
}

export const LeaveManagementView: React.FC<LeaveManagementViewProps> = ({
  currentUser,
  leaveRequests,
  onApproveLeave,
  onRejectLeave,
  onOpenApplyModal,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingCount = leaveRequests.filter((r) => r.status === 'Pending Review').length;

  const filteredRequests = leaveRequests.filter((req) => {
    if (selectedFilter === 'Pending' && req.status !== 'Pending Review') return false;
    if (selectedFilter === 'Approved' && req.status !== 'Approved') return false;
    if (selectedFilter === 'Rejected' && req.status !== 'Rejected') return false;

    if (
      searchQuery &&
      !req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !req.employeeDept.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !req.leaveType.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div id="leave-management-view" className="px-4 md:px-10 pb-12 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
            Leave Management
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">
            Review time-off requests, balances, and team coverage
          </p>
        </div>

        <button
          onClick={onOpenApplyModal}
          className="bg-[#5b7a6b] text-[#ffffff] hover:bg-[#436153] px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Request Time Off
        </button>
      </div>

      {/* Filters & Actions Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        {/* Soft Pill Filters */}
        <div className="flex flex-wrap gap-1.5 bg-[#FFFFFF] p-1.5 rounded-full bento-shadow border border-[#c1c8c3]/30">
          <button
            onClick={() => setSelectedFilter('All')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedFilter === 'All'
                ? 'bg-[#e3e2e0] text-[#1a1c1b] shadow-sm'
                : 'text-[#424844] hover:bg-[#f4f4f1]'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setSelectedFilter('Pending')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'Pending'
                ? 'bg-[#e3e2e0] text-[#1a1c1b] shadow-sm'
                : 'text-[#424844] hover:bg-[#f4f4f1]'
            }`}
          >
            Pending
            <span className="px-1.5 py-0.5 bg-[#5b7a6b] text-white rounded-full text-[10px] font-bold">
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => setSelectedFilter('Approved')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedFilter === 'Approved'
                ? 'bg-[#e3e2e0] text-[#1a1c1b] shadow-sm'
                : 'text-[#424844] hover:bg-[#f4f4f1]'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setSelectedFilter('Rejected')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedFilter === 'Rejected'
                ? 'bg-[#e3e2e0] text-[#1a1c1b] shadow-sm'
                : 'text-[#424844] hover:bg-[#f4f4f1]'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727974] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-10 pr-4 py-2 bg-[#FFFFFF] rounded-full border border-[#c1c8c3]/30 bento-shadow text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] focus:outline-none placeholder:text-[#727974]"
          />
        </div>
      </div>

      {/* Requests List Bento Container */}
      <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow overflow-hidden flex flex-col">
        {/* Header Row */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[#eeeeeb] text-[#424844] text-xs font-semibold uppercase tracking-wider bg-[#faf9f7]/60">
          <div className="col-span-3">Employee</div>
          <div className="col-span-2">Leave Type</div>
          <div className="col-span-3">Dates &amp; Duration</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* List Items */}
        <div className="flex flex-col divide-y divide-[#eeeeeb]">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#424844]">
              No leave requests found matching the current filter.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.status === 'Pending Review';
              const isApproved = req.status === 'Approved';
              const isEscalated = req.status === 'Escalated';

              return (
                <div
                  key={req.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-[#faf9f7] transition-colors group"
                >
                  {/* Employee */}
                  <div className="col-span-1 md:col-span-3 flex items-center gap-3.5">
                    <img
                      src={req.employeeAvatar}
                      alt={req.employeeName}
                      className="w-10 h-10 rounded-full object-cover border border-[#c1c8c3]/40 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-[#1a1c1b] truncate">
                        {req.employeeName}
                      </span>
                      <span className="text-xs text-[#424844] truncate">{req.employeeDept}</span>
                    </div>
                  </div>

                  {/* Leave Type */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        req.leaveType === 'Sick Leave'
                          ? 'bg-[#fce4e4] text-[#e02424]'
                          : req.leaveType === 'Paid Leave'
                          ? 'bg-[#e1effe] text-[#1c64f2]'
                          : 'bg-[#e6dfd0] text-[#676256]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {req.leaveType === 'Sick Leave'
                          ? 'medical_services'
                          : req.leaveType === 'Paid Leave'
                          ? 'flight_takeoff'
                          : 'schedule'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-[#1a1c1b]">{req.leaveType}</span>
                  </div>

                  {/* Dates & Duration */}
                  <div className="col-span-1 md:col-span-3 flex flex-col">
                    <span className="text-sm font-medium text-[#1a1c1b]">
                      {req.startDate} - {req.endDate}
                    </span>
                    <span className="text-xs text-[#625e52]">
                      {req.durationDays} day{req.durationDays > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 md:col-span-2 flex items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isPending || isEscalated
                            ? 'bg-[#d97706]'
                            : isApproved
                            ? 'bg-[#5b7a6b]'
                            : 'bg-[#ba1a1a]'
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          isPending || isEscalated
                            ? 'text-[#b45309]'
                            : isApproved
                            ? 'text-[#436153]'
                            : 'text-[#ba1a1a]'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2 md:justify-end mt-2 md:mt-0">
                    {isPending && (
                      <>
                        <button
                          onClick={() => onRejectLeave(req.id)}
                          className="px-3.5 py-1.5 rounded-full border border-[#c1c8c3] text-[#424844] text-xs font-semibold hover:bg-[#eeeeeb] transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onApproveLeave(req.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#5b7a6b] text-white text-xs font-semibold hover:bg-[#436153] transition-colors cursor-pointer shadow-sm"
                        >
                          Approve
                        </button>
                      </>
                    )}
                    {isEscalated && (
                      <span className="text-xs text-[#b45309] font-medium italic">
                        Escalated to skip-level manager
                      </span>
                    )}
                    {!isPending && !isEscalated && (
                      <span className="text-xs text-[#727974] font-medium italic">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#eeeeeb] flex items-center justify-between text-[#424844] text-xs font-medium bg-[#faf9f7]/40">
          <span>
            Showing 1 to {filteredRequests.length} of {leaveRequests.length} requests
          </span>
          <div className="flex gap-1">
            <button
              disabled
              className="p-1.5 hover:bg-[#eeeeeb] rounded-full transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="p-1.5 hover:bg-[#eeeeeb] rounded-full transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
