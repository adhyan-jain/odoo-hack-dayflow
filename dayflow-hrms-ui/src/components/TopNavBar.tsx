import React, { useState } from 'react';
import { UserProfile } from '../types';
import { NavTabId } from './SideNavBar';

interface TopNavBarProps {
  currentTab: NavTabId;
  currentUser: UserProfile;
  onSwitchUser: () => void;
  onSelectTab: (tab: NavTabId) => void;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  unreadCount?: number;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentTab,
  currentUser,
  onSwitchUser,
  onSelectTab,
  onOpenNotifications,
  onOpenHelp,
  onSignOut,
  unreadCount = 2,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return currentUser.role === 'admin' ? 'Dashboard' : 'Dayflow';
      case 'directory':
        return 'Employee Directory';
      case 'attendance':
        return 'Attendance';
      case 'leave':
        return 'Leave Management';
      case 'payroll':
        return 'Payroll';
      case 'profile':
        return 'Dayflow';
      case 'settings':
        return 'Company Settings';
      default:
        return 'Dayflow';
    }
  };

  return (
    <header
      id="top-nav-bar"
      className="bg-transparent flex justify-between items-center w-full px-6 md:px-10 h-20 shrink-0 sticky top-0 z-40 backdrop-blur-md transition-all"
    >
      {/* Title / Role context */}
      <div className="flex items-baseline gap-3">
        <h1 className="font-semibold text-2xl md:text-3xl text-[#1a1c1b] tracking-tight">
          {getPageTitle()}
        </h1>
        {currentTab === 'dashboard' && currentUser.role === 'admin' && (
          <span className="text-[#625e52] text-sm md:text-base font-normal hidden sm:inline">
            Sarah Jenkins (Admin)
          </span>
        )}
      </div>

      {/* Action buttons & Profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Role quick switcher */}
        <button
          onClick={onSwitchUser}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#c1c8c3]/60 text-xs font-medium text-[#424844] hover:bg-[#faf9f7] hover:border-[#5b7a6b] transition-all shadow-sm cursor-pointer"
          title="Switch view between Employee & Admin"
        >
          <span className="material-symbols-outlined text-[16px] text-[#5b7a6b]">
            sync_alt
          </span>
          <span>View as: <strong className="text-[#1a1c1b]">{currentUser.name.split(' ')[0]} ({currentUser.role})</strong></span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          id="btn-notifications"
          onClick={onOpenNotifications}
          className="relative text-[#424844] hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-[#FFFFFF]/80 cursor-pointer"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-[#F0EEE7]" />
          )}
        </button>

        {/* Help icon */}
        <button
          id="btn-help"
          onClick={onOpenHelp}
          className="text-[#424844] hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-[#FFFFFF]/80 cursor-pointer hidden sm:block"
          aria-label="Help and Info"
        >
          <span className="material-symbols-outlined text-[24px]">help</span>
        </button>

        {/* Profile Avatar with drop down */}
        <div className="relative">
          <button
            id="btn-user-menu"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="w-10 h-10 rounded-full overflow-hidden border border-[#c1c8c3] cursor-pointer hover:ring-2 hover:ring-[#5b7a6b]/30 transition-all block focus:outline-none"
            aria-label="User menu"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] rounded-2xl shadow-floating border border-[#c1c8c3]/30 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="p-3 border-b border-[#eeeeeb] flex items-center gap-3">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#c1c8c3]/40"
                    referrerPolicy="no-referrer"
                  />
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-[#1a1c1b] truncate">{currentUser.name}</p>
                    <p className="text-xs text-[#625e52] truncate">{currentUser.title}</p>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      onSelectTab('profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#1a1c1b] hover:bg-[#f4f4f1] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#5b7a6b]">person</span>
                    View Full Profile
                  </button>

                  <button
                    onClick={() => {
                      onSwitchUser();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#1a1c1b] hover:bg-[#f4f4f1] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#5b7a6b]">swap_horiz</span>
                    Switch Persona ({currentUser.role === 'employee' ? 'Sarah (Admin)' : 'Alex (Employee)'})
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#1a1c1b] hover:bg-[#f4f4f1] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#5b7a6b]">settings</span>
                    Settings & System
                  </button>
                </div>

                <div className="pt-1 border-t border-[#eeeeeb]">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
