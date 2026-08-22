import React, { useState } from 'react';
import { EmployeeRosterItem } from '@/types';

interface DirectoryViewProps {
  employees: EmployeeRosterItem[];
  onSelectEmployee: (emp: EmployeeRosterItem) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  employees,
  onSelectEmployee,
}) => {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  const departments = ['All', 'Engineering', 'Marketing', 'Sales', 'Finance', 'Design', 'Product'];

  const filtered = employees.filter((emp) => {
    if (selectedDept !== 'All' && !emp.department.toLowerCase().includes(selectedDept.toLowerCase())) {
      return false;
    }
    if (
      search &&
      !emp.name.toLowerCase().includes(search.toLowerCase()) &&
      !emp.role.toLowerCase().includes(search.toLowerCase()) &&
      !emp.employeeCode.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div id="directory-view" className="px-6 md:px-10 pb-16 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
            Team Directory
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">
            Discover colleagues, view contact info, and understand team structures
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727974] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or ID..."
            className="w-full pl-10 pr-4 py-2 bg-[#FFFFFF] rounded-full border border-[#c1c8c3]/40 bento-shadow text-xs text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] focus:outline-none placeholder:text-[#727974]"
          />
        </div>
      </div>

      {/* Department Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedDept === dept
                ? 'bg-[#5b7a6b] text-[#ffffff] shadow-sm'
                : 'bg-[#FFFFFF] text-[#424844] hover:bg-[#eeeeeb] border border-[#c1c8c3]/30'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Grid of Employee Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            onClick={() => onSelectEmployee(emp)}
            className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between hover:shadow-floating transition-all border border-[#eeeeeb] cursor-pointer group"
          >
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
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a1c1b] truncate">{emp.name}</h3>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      emp.status === 'Active'
                        ? 'bg-[#5b7a6b]'
                        : emp.status === 'On Leave'
                        ? 'bg-[#625e52]'
                        : 'bg-[#ba1a1a]'
                    }`}
                  />
                </div>
                <p className="text-xs font-medium text-[#424844] mt-0.5 truncate">{emp.role}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f4f4f1] text-[#625e52] text-[11px] font-medium">
                  {emp.department}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#eeeeeb] flex items-center justify-between text-xs text-[#625e52]">
              <span className="font-mono">{emp.employeeCode}</span>
              <span className="text-[#436153] font-semibold group-hover:underline flex items-center gap-1">
                View Details
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
