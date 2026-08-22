import React from 'react';
import { UserProfile } from '@/types';

export type NavTabId = 'dashboard' | 'directory' | 'attendance' | 'leave' | 'payroll' | 'settings' | 'profile';

interface SideNavBarProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  currentUser: UserProfile;
  onSwitchUser: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
}) => {
  const isAlex = currentUser.id === 'usr-alex';

  const navItems = [
    { id: 'dashboard' as NavTabId, label: 'Dashboard', icon: 'dashboard', fill: true },
    { id: 'directory' as NavTabId, label: 'Directory', icon: 'group' },
    { id: 'attendance' as NavTabId, label: 'Time & Attendance', icon: 'schedule' },
    { id: 'leave' as NavTabId, label: 'Leave Management', icon: 'calendar_month' },
    { id: 'payroll' as NavTabId, label: 'Payroll & Docs', icon: 'description' },
    { id: 'settings' as NavTabId, label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside
      id="side-nav-bar"
      className="hidden md:flex bg-[#FFFFFF] border-r border-[#c1c8c3]/40 fixed left-0 top-0 h-full w-[72px] flex-col items-center py-6 gap-4 z-50 select-none shadow-[0_0_15px_rgba(0,0,0,0.02)]"
    >
      {/* Brand Mark Logo */}
      <button
        onClick={() => onSelectTab('dashboard')}
        className="mb-4 w-10 h-10 rounded-xl bg-[#5b7a6b] text-[#ffffff] flex items-center justify-center font-bold text-lg hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95"
        title="Dayflow Home"
        aria-label="Dayflow Home"
      >
        <span className="font-bold tracking-tight">{isAlex ? 'Df' : 'D'}</span>
      </button>

      {/* Navigation Icons Rail */}
      <div className="flex flex-col gap-3 w-full px-2 items-center flex-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <button
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                aria-label={item.label}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#022016] text-[#ffffff] scale-95 shadow-sm'
                    : 'text-[#424844] hover:bg-[#eeeeeb] hover:text-[#1a1c1b] scale-95 active:scale-90'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{
                    fontVariationSettings: isActive && item.fill ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {item.icon}
                </span>
              </button>

              {/* Tooltip */}
              <div className="hidden group-hover:block absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#1a1c1b] text-[#ffffff] text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-md pointer-events-none transition-opacity">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Profile Button */}
      <div className="mt-auto relative group w-full flex justify-center px-2">
        <button
          id="nav-item-profile"
          onClick={() => onSelectTab('profile')}
          aria-label="User Profile"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            currentTab === 'profile'
              ? 'bg-[#022016] text-[#ffffff] scale-95 shadow-sm'
              : 'text-[#424844] hover:bg-[#eeeeeb] hover:text-[#1a1c1b] scale-95 active:scale-90'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{
              fontVariationSettings: currentTab === 'profile' ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            account_circle
          </span>
        </button>
        <div className="hidden group-hover:block absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#1a1c1b] text-[#ffffff] text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-md pointer-events-none">
          {currentUser.name} (Profile)
        </div>
      </div>
    </aside>
  );
};
