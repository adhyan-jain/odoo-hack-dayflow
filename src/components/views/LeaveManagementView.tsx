import React, { useEffect, useState } from 'react';
import { UserProfile, LeaveRequest, EmployeeRosterItem, CoverageWarning } from '@/types';
import type { LeaveBalance } from '@/lib/types';
import { fetchLeaveBalances, Client } from '@/lib/supabase/hrms';

interface LeaveManagementViewProps {
  currentUser: UserProfile;
  currentUserId: string;
  leaveRequests: LeaveRequest[];
  employeeRoster: EmployeeRosterItem[];
  supabase: Client | null;
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onFetchCoverageWarning: (input: { employeeId: string; fromDate: string; toDate: string }) => Promise<CoverageWarning>;
  onOpenApplyModal: () => void;
}

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

interface PendingApproval {
  request: LeaveRequest;
  warning: CoverageWarning;
}

const LEAVE_TYPE_STYLE: Record<LeaveRequest['leaveType'], { bg: string; fg: string; icon: string }> = {
  'Sick Leave': { bg: 'bg-[#fce4e4]', fg: 'text-[#e02424]', icon: 'medical_services' },
  'Paid Leave': { bg: 'bg-[#e1effe]', fg: 'text-[#1c64f2]', icon: 'flight_takeoff' },
  'Unpaid Leave': { bg: 'bg-[#e6dfd0]', fg: 'text-[#676256]', icon: 'schedule' },
};

export const LeaveManagementView: React.FC<LeaveManagementViewProps> = ({
  currentUser,
  currentUserId,
  leaveRequests,
  employeeRoster,
  supabase,
  onApproveLeave,
  onRejectLeave,
  onFetchCoverageWarning,
  onOpenApplyModal,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'hr';

  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [balances, setBalances] = useState<{ paid: number; sick: number } | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  useEffect(() => {
    if (isAdmin) return;

    const total = Math.max(0, currentUser.leaveBalanceDays);
    const paidFallback = Math.round(total * 0.7);
    const fallback = { paid: paidFallback, sick: Math.max(0, total - paidFallback) };

    let cancelled = false;
    (async () => {
      if (!supabase) {
        setBalances(fallback);
        return;
      }
      setBalancesLoading(true);
      try {
        const rows: LeaveBalance[] = await fetchLeaveBalances(supabase, currentUserId);
        if (cancelled) return;
        const byType = new Map(rows.map((r) => [r.leave_type, r.balance_days]));
        const paid = byType.get('paid');
        const sick = byType.get('sick');
        setBalances(paid === undefined && sick === undefined ? fallback : { paid: paid ?? 0, sick: sick ?? 0 });
      } catch {
        if (!cancelled) setBalances(fallback);
      } finally {
        if (!cancelled) setBalancesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, supabase, currentUserId, currentUser.leaveBalanceDays]);

  const scopedRequests = isAdmin
    ? leaveRequests
    : leaveRequests.filter((r) => r.employeeId === currentUser.employeeId);

  const pendingCount = scopedRequests.filter((r) => r.status === 'Pending Review').length;

  const filteredRequests = scopedRequests.filter((req) => {
    if (selectedFilter === 'Pending' && req.status !== 'Pending Review') return false;
    if (selectedFilter === 'Approved' && req.status !== 'Approved') return false;
    if (selectedFilter === 'Rejected' && req.status !== 'Rejected') return false;

    if (
      isAdmin &&
      searchQuery &&
      !req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !req.employeeDept.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !req.leaveType.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleApproveClick = async (req: LeaveRequest) => {
    const employee = employeeRoster.find((e) => e.employeeCode === req.employeeId);
    if (!employee) {
      onApproveLeave(req.id);
      return;
    }

    setCheckingId(req.id);
    try {
      const warning = await onFetchCoverageWarning({
        employeeId: employee.id,
        fromDate: req.startDate,
        toDate: req.endDate,
      });
      if (!warning.safe && warning.conflicts.length > 0) {
        setPendingApproval({ request: req, warning });
      } else {
        onApproveLeave(req.id);
      }
    } catch {
      onApproveLeave(req.id);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div id="leave-management-view" className="px-4 md:px-10 pb-12 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">Time Off</h2>
          <p className="text-[#424844] text-sm mt-0.5">
            {isAdmin
              ? 'Review time-off requests, balances, and team coverage'
              : 'Track your leave balance and request time off'}
          </p>
        </div>

        <button
          onClick={onOpenApplyModal}
          className="bg-[#5b7a6b] text-[#ffffff] hover:bg-[#436153] px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {isAdmin ? 'New' : 'Request Time Off'}
        </button>
      </div>

      {/* Allocation Summary — employee view only */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[#e1effe] text-[#1c64f2]">
              <span className="material-symbols-outlined text-[24px]">flight_takeoff</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#625e52] uppercase tracking-wider">Paid Time Off</p>
              <p className="text-2xl font-bold text-[#1a1c1b] mt-0.5">
                {balancesLoading || !balances ? '—' : balances.paid}{' '}
                <span className="text-sm font-medium text-[#424844]">Days Available</span>
              </p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[#fce4e4] text-[#e02424]">
              <span className="material-symbols-outlined text-[24px]">medical_services</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#625e52] uppercase tracking-wider">Sick Time Off</p>
              <p className="text-2xl font-bold text-[#1a1c1b] mt-0.5">
                {balancesLoading || !balances ? '—' : balances.sick}{' '}
                <span className="text-sm font-medium text-[#424844]">Days Available</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coverage warning banner — admin/hr approvals only */}
      {isAdmin && pendingApproval && (
        <div className="bg-[#fff7e6] border border-[#f0c36d] rounded-[20px] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#b45309] text-[22px] shrink-0">warning</span>
              <div>
                <p className="text-sm font-semibold text-[#92400e]">
                  Approving {pendingApproval.request.employeeName}&apos;s {pendingApproval.request.leaveType} request
                  may leave {pendingApproval.request.employeeDept} understaffed.
                </p>
                {pendingApproval.warning.conflicts.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-[#92400e]">
                    {pendingApproval.warning.conflicts.map((c) => (
                      <li key={c.date}>
                        {c.date}: only {c.availableAfterApproval} available, {c.minRequired} required
                      </li>
                    ))}
                  </ul>
                )}
                {pendingApproval.warning.suggestedDates.length > 0 && (
                  <p className="mt-2 text-xs text-[#92400e]">
                    Suggested alternative dates:{' '}
                    {pendingApproval.warning.suggestedDates.map((d) => `${d.from} → ${d.to}`).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setPendingApproval(null)}
              className="p-1 rounded-full text-[#92400e] hover:bg-[#f0dfb4] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setPendingApproval(null)}
              className="px-4 py-2 rounded-full border border-[#e2b866] text-xs font-semibold text-[#92400e] hover:bg-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApproveLeave(pendingApproval.request.id);
                setPendingApproval(null);
              }}
              className="px-4 py-2 rounded-full bg-[#b45309] text-white text-xs font-semibold hover:bg-[#92400e] transition-colors cursor-pointer shadow-sm"
            >
              Approve Anyway
            </button>
          </div>
        </div>
      )}

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

        {/* Search — admin/hr only */}
        {isAdmin && (
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
        )}
      </div>

      {/* Requests List Bento Container */}
      <div className="bg-[#FFFFFF] rounded-[20px] bento-shadow overflow-hidden flex flex-col">
        {/* Header Row */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[#eeeeeb] text-[#424844] text-xs font-semibold uppercase tracking-wider bg-[#faf9f7]/60">
          {isAdmin && <div className="col-span-3">Employee</div>}
          <div className={isAdmin ? 'col-span-2' : 'col-span-3'}>Leave Type</div>
          <div className={isAdmin ? 'col-span-3' : 'col-span-4'}>Dates &amp; Duration</div>
          <div className={isAdmin ? 'col-span-2' : 'col-span-3'}>Status</div>
          {isAdmin && <div className="col-span-2 text-right">Actions</div>}
          {!isAdmin && <div className="col-span-2 text-right">Attachment</div>}
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
              const typeStyle = LEAVE_TYPE_STYLE[req.leaveType];

              return (
                <div
                  key={req.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-[#faf9f7] transition-colors group"
                >
                  {/* Employee */}
                  {isAdmin && (
                    <div className="col-span-1 md:col-span-3 flex items-center gap-3.5">
                      <img
                        src={req.employeeAvatar}
                        alt={req.employeeName}
                        className="w-10 h-10 rounded-full object-cover border border-[#c1c8c3]/40 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-[#1a1c1b] truncate">{req.employeeName}</span>
                        <span className="text-xs text-[#424844] truncate">{req.employeeDept}</span>
                      </div>
                    </div>
                  )}

                  {/* Leave Type */}
                  <div className={`col-span-1 flex items-center gap-2.5 ${isAdmin ? 'md:col-span-2' : 'md:col-span-3'}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeStyle.bg} ${typeStyle.fg}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{typeStyle.icon}</span>
                    </div>
                    <span className="text-sm font-medium text-[#1a1c1b]">{req.leaveType}</span>
                  </div>

                  {/* Dates & Duration */}
                  <div className={`col-span-1 flex flex-col ${isAdmin ? 'md:col-span-3' : 'md:col-span-4'}`}>
                    <span className="text-sm font-medium text-[#1a1c1b]">
                      {req.startDate} - {req.endDate}
                    </span>
                    <span className="text-xs text-[#625e52]">
                      {req.durationDays} day{req.durationDays > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Status */}
                  <div className={`col-span-1 flex items-center ${isAdmin ? 'md:col-span-2' : 'md:col-span-3'}`}>
                    {isEscalated ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fde68a]/70 text-[#92400e] text-[10px] font-bold uppercase tracking-wide w-fit">
                          <span className="material-symbols-outlined text-[13px]">priority_high</span>
                          Escalated
                        </span>
                        {(req.escalatedTo || req.slaDeadline) && (
                          <span
                            className="text-[10px] text-[#92400e]/80"
                            title={`Escalated to ${req.escalatedTo ?? 'skip-level manager'}${
                              req.slaDeadline ? ` · SLA due ${req.slaDeadline}` : ''
                            }`}
                          >
                            {req.escalatedTo ? `→ ${req.escalatedTo}` : 'Skip-level manager'}
                            {req.slaDeadline ? ` · due ${req.slaDeadline}` : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isPending ? 'bg-[#d97706]' : isApproved ? 'bg-[#5b7a6b]' : 'bg-[#ba1a1a]'
                          }`}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            isPending ? 'text-[#b45309]' : isApproved ? 'text-[#436153]' : 'text-[#ba1a1a]'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions (admin/hr) or Attachment (employee) */}
                  {isAdmin ? (
                    <div className="col-span-1 md:col-span-2 flex items-center gap-2 md:justify-end mt-2 md:mt-0">
                      {isPending && (
                        <>
                          <button
                            onClick={() => onRejectLeave(req.id)}
                            disabled={checkingId === req.id}
                            className="px-3.5 py-1.5 rounded-full border border-[#c1c8c3] text-[#424844] text-xs font-semibold hover:bg-[#eeeeeb] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveClick(req)}
                            disabled={checkingId === req.id}
                            className="px-3.5 py-1.5 rounded-full bg-[#5b7a6b] text-white text-xs font-semibold hover:bg-[#436153] transition-colors cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
                          >
                            {checkingId === req.id ? 'Checking…' : 'Approve'}
                          </button>
                        </>
                      )}
                      {!isPending && (
                        <span className="text-xs text-[#727974] font-medium italic">Resolved</span>
                      )}
                    </div>
                  ) : (
                    <div className="col-span-1 md:col-span-2 flex items-center md:justify-end mt-2 md:mt-0">
                      {req.attachmentUrl ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#436153] font-medium">
                          <span className="material-symbols-outlined text-[16px]">attachment</span>
                          Attached
                        </span>
                      ) : (
                        <span className="text-xs text-[#a3a39a]">—</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#eeeeeb] flex items-center justify-between text-[#424844] text-xs font-medium bg-[#faf9f7]/40">
          <span>
            Showing 1 to {filteredRequests.length} of {scopedRequests.length} requests
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
