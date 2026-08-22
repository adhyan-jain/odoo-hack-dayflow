'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserProfile, CompanySettingsUI } from '@/types';
import { NavTabId } from './SideNavBar';
import { env } from '@/env';

const BYPASS_AUTH = env.NEXT_PUBLIC_BYPASS_AUTH;

interface TopNavBarProps {
  currentUser: UserProfile;
  companySettings: CompanySettingsUI | null;
  onSwitchUser: () => void;
  onSelectTab: (tab: NavTabId) => void;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  unreadCount?: number;
}

const NAV_ITEMS: { id: NavTabId; label: string; href: string; match: (path: string) => boolean }[] = [
  { id: 'employees', label: 'Employees', href: '/employees', match: (p) => p === '/employees' || p.startsWith('/employees/') },
  { id: 'attendance', label: 'Attendance', href: '/attendance', match: (p) => p.startsWith('/attendance') },
  { id: 'leave', label: 'Time Off', href: '/leave', match: (p) => p.startsWith('/leave') },
];

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentUser,
  companySettings,
  onSwitchUser,
  onSelectTab,
  onOpenNotifications,
  onOpenHelp,
  onSignOut,
  unreadCount = 2,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      id="top-nav-bar"
      className="bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#eeeeeb] w-full sticky top-0 z-40 shrink-0"
    >
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between px-6 md:px-10 h-20 gap-4">
        {/* Logo + Primary Nav */}
        <div className="flex items-center gap-6 md:gap-10 min-w-0">
          <Link
            href="/employees"
            onClick={() => onSelectTab('employees')}
            className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
            aria-label="Dayflow Home"
            title="Dayflow Home"
          >
            {companySettings?.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt={companySettings.name || 'Company logo'}
                className="w-10 h-10 rounded-xl object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="w-10 h-10 rounded-xl bg-[#5b7a6b] text-[#ffffff] flex items-center justify-center font-bold text-lg shadow-sm">
                <span className="font-bold tracking-tight">D</span>
              </span>
            )}
            <span className="hidden lg:block font-semibold text-lg text-[#1a1c1b] tracking-tight truncate max-w-[220px]">
              {companySettings?.name || 'Dayflow'}
            </span>
          </Link>

          {/* Flat Top Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname || '');
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#022016] text-[#ffffff] shadow-sm'
                      : 'text-[#424844] hover:bg-[#eeeeeb] hover:text-[#1a1c1b]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action buttons & Profile */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Demo-only persona switcher (mock BYPASS_AUTH mode has no other way to swap Alex/Sarah) */}
          {BYPASS_AUTH && (
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
          )}

          {/* Search Icon */}
          <button
            id="btn-search"
            className="text-[#424844] hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-[#f4f4f1] cursor-pointer hidden sm:block"
            aria-label="Search"
            title="Search"
          >
            <span className="material-symbols-outlined text-[24px]">search</span>
          </button>

          {/* Notifications Icon with Badge */}
          <button
            id="btn-notifications"
            onClick={onOpenNotifications}
            className="relative text-[#424844] hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-[#f4f4f1] cursor-pointer"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-[#FFFFFF]" />
            )}
          </button>

          {/* Help icon */}
          <button
            id="btn-help"
            onClick={onOpenHelp}
            className="text-[#424844] hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-[#f4f4f1] cursor-pointer hidden sm:block"
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
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-[#FFFFFF] rounded-2xl shadow-floating border border-[#c1c8c3]/30 p-2 z-50 animate-in fade-in zoom-in-95">
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
                    <Link
                      href="/profile"
                      onClick={() => {
                        onSelectTab('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-[#1a1c1b] hover:bg-[#f4f4f1] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#5b7a6b]">person</span>
                      My Profile
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => {
                        onSelectTab('settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-[#1a1c1b] hover:bg-[#f4f4f1] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#5b7a6b]">settings</span>
                      Settings
                    </Link>

                    {currentUser.role !== 'employee' && (
                      <Link
                        href="/org"
                        onClick={() => {
                          onSelectTab('org');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[#1a1c1b] hover:bg-[#f4f4f1] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-[#5b7a6b]">account_tree</span>
                        Org Chart
                      </Link>
                    )}
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
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
