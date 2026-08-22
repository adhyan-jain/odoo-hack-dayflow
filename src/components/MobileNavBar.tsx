import React from 'react';
import { NavTabId } from './SideNavBar';

interface MobileNavBarProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard' as NavTabId, label: 'Home', icon: 'dashboard' },
    { id: 'directory' as NavTabId, label: 'Team', icon: 'group' },
    { id: 'attendance' as NavTabId, label: 'Time', icon: 'schedule' },
    { id: 'leave' as NavTabId, label: 'Leave', icon: 'calendar_month' },
    { id: 'payroll' as NavTabId, label: 'Payroll', icon: 'payments' },
    { id: 'profile' as NavTabId, label: 'Profile', icon: 'person' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#eeeeeb] flex justify-around items-center h-16 px-2 z-50 shadow-lg">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
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
          </button>
        );
      })}
    </nav>
  );
};
