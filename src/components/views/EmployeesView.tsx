import React, { useState } from 'react';
import { EmployeeRosterItem, EmployeeStatus, UserProfile } from '@/types';
import { CreateEmployeeModal } from '@/components/modals/CreateEmployeeModal';
import { useAppContext } from '@/context/AppContext';

interface EmployeesViewProps {
  employees: EmployeeRosterItem[];
  currentUser: UserProfile;
  currentUserId: string;
  onSelectEmployee: (emp: EmployeeRosterItem) => void;
}

const StatusIndicator: React.FC<{ status: EmployeeStatus }> = ({ status }) => {
  if (status === 'present') {
    return (
      <span
        className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[#5b7a6b] ring-2 ring-[#FFFFFF]"
        title="Present"
        aria-label="Present"
      />
    );
  }
  if (status === 'on_leave') {
    return (
      <span
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#5b7a6b]/10 flex items-center justify-center"
        title="On Leave"
        aria-label="On Leave"
      >
        <span className="material-symbols-outlined text-[15px] text-[#436153]">flight_takeoff</span>
      </span>
    );
  }
  return (
    <span
      className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[#eab308] ring-2 ring-[#FFFFFF]"
      title="Absent"
      aria-label="Absent"
    />
  );
};

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  currentUser,
  currentUserId,
  onSelectEmployee,
}) => {
  const { createEmployeeModalOpen, setCreateEmployeeModalOpen, handleCreateEmployee } = useAppContext();
  const [search, setSearch] = useState('');

  const canCreate = currentUser.role !== 'employee';

  const filtered = employees.filter((emp) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      (emp.jobTitle ?? '').toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q)
    );
  });

  return (
    <div id="employees-view" className="px-6 md:px-10 pb-16 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">Employees</h2>
          <p className="text-[#424844] text-sm mt-0.5">Browse everyone at the company and view their profile</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727974] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, department, or ID..."
              className="w-full pl-10 pr-4 py-2 bg-[#FFFFFF] rounded-full border border-[#c1c8c3]/40 bento-shadow text-xs text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] focus:outline-none placeholder:text-[#727974]"
            />
          </div>

          {canCreate && (
            <button
              id="btn-new-employee"
              onClick={() => setCreateEmployeeModalOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1c1b] hover:bg-[#424844] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              NEW
            </button>
          )}
        </div>
      </div>

      {/* Grid of Employee Cards */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-[#625e52] text-sm py-16">
          No employees match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              onClick={() => onSelectEmployee(emp)}
              className="relative bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between hover:shadow-floating transition-all border border-[#eeeeeb] cursor-pointer group"
            >
              <StatusIndicator status={emp.attendanceStatus} />

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#e3e2e0] shrink-0 border border-[#c1c8c3]/40 group-hover:scale-105 transition-transform">
                  {emp.avatar ? (
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#e6dfd0] text-[#676256] text-sm font-bold">
                      {emp.initials || emp.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[#1a1c1b] truncate">
                    {emp.id === currentUserId ? `${emp.name} (You)` : emp.name}
                  </h3>
                  <p className="text-xs font-medium text-[#424844] mt-0.5 truncate">{emp.jobTitle || emp.role}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f4f4f1] text-[#625e52] text-[11px] font-medium">
                    {emp.department}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#eeeeeb] flex items-center justify-between text-xs text-[#625e52]">
                <span className="font-mono">{emp.employeeCode}</span>
                <span className="text-[#436153] font-semibold group-hover:underline flex items-center gap-1">
                  View Profile
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateEmployeeModal
        isOpen={createEmployeeModalOpen}
        onClose={() => setCreateEmployeeModalOpen(false)}
        creatorRole={currentUser.role}
        onSubmit={handleCreateEmployee}
      />
    </div>
  );
};
