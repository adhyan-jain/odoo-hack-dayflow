import React from 'react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      title: 'Time off approved',
      desc: 'Sarah Jenkins approved your annual leave request for Nov 12-14.',
      time: '10m ago',
      unread: true,
      icon: 'check_circle',
      iconBg: 'bg-[#c8ead8]/40 text-[#436153]',
    },
    {
      id: 2,
      title: 'Payroll slip ready',
      desc: 'Your October 2023 compensation statement is ready to view & download.',
      time: '2h ago',
      unread: true,
      icon: 'receipt_long',
      iconBg: 'bg-[#e6dfd0] text-[#676256]',
    },
    {
      id: 3,
      title: 'Company All-Hands Meeting',
      desc: 'Monthly townhall scheduled tomorrow at 10:00 AM PST.',
      time: 'Yesterday',
      unread: false,
      icon: 'groups',
      iconBg: 'bg-[#eeeeeb] text-[#424844]',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-[#FFFFFF] rounded-[24px] shadow-floating max-w-md w-full p-6 z-10 animate-in slide-in-from-top-4 duration-200 border border-[#eeeeeb] mt-16">
        <div className="flex items-center justify-between pb-3 border-b border-[#eeeeeb]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
              notifications
            </span>
            <h3 className="text-base font-bold text-[#1a1c1b]">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#424844] hover:bg-[#eeeeeb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl flex items-start gap-3 transition-colors ${
                n.unread ? 'bg-[#faf9f7] border border-[#c1c8c3]/40' : 'hover:bg-[#f4f4f1]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}
              >
                <span className="material-symbols-outlined text-[16px]">{n.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#1a1c1b]">{n.title}</p>
                  <span className="text-[10px] text-[#625e52]">{n.time}</span>
                </div>
                <p className="text-xs text-[#424844] mt-0.5">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-center text-xs font-semibold text-[#436153] hover:bg-[#f4f4f1] rounded-full transition-colors cursor-pointer"
        >
          Mark all as read
        </button>
      </div>
    </div>
  );
};
