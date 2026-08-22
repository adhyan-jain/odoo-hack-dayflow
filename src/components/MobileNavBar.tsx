'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavTabId } from './SideNavBar';

interface MobileNavBarProps {
  onSelectTab: (tab: NavTabId) => void;
}

const TABS: { id: NavTabId; label: string; icon: string; href: string; match: (path: string) => boolean }[] = [
  { id: 'employees', label: 'Employees', icon: 'groups', href: '/employees', match: (p) => p === '/employees' || p.startsWith('/employees/') },
  { id: 'attendance', label: 'Attendance', icon: 'schedule', href: '/attendance', match: (p) => p.startsWith('/attendance') },
  { id: 'leave', label: 'Time Off', icon: 'calendar_month', href: '/leave', match: (p) => p.startsWith('/leave') },
  { id: 'profile', label: 'Profile', icon: 'person', href: '/profile', match: (p) => p.startsWith('/profile') },
];

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ onSelectTab }) => {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#eeeeeb] flex justify-around items-center h-16 px-2 z-50 shadow-lg">
      {TABS.map((tab) => {
        const isActive = tab.match(pathname || '');
        return (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              isActive ? 'text-[#5b7a6b]' : 'text-[#727974]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
