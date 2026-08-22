import React, { useState } from 'react';
import { UserProfile } from '../../types';

interface SettingsViewProps {
  currentUser: UserProfile;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [autoApproveSickDays, setAutoApproveSickDays] = useState(false);
  const [companyName, setCompanyName] = useState('Dayflow Technologies Inc.');
  const [workHours, setWorkHours] = useState('40 hours / week (8h daily)');

  const handleSave = () => {
    alert('Settings preferences updated successfully!');
  };

  return (
    <div id="settings-view" className="px-6 md:px-10 pb-16 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
            Settings &amp; Preferences
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">
            Configure system rules, notification triggers, and organization standards
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#5b7a6b] text-[#ffffff] hover:bg-[#436153] px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
        >
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* Organization Information */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow border border-[#eeeeeb]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">business</span>
            <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Organization Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#424844] uppercase tracking-wider block mb-1.5">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#424844] uppercase tracking-wider block mb-1.5">
                Standard Working Schedule
              </label>
              <input
                type="text"
                value={workHours}
                onChange={(e) => setWorkHours(e.target.value)}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Integrations */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow border border-[#eeeeeb]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
              notifications_active
            </span>
            <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">
              Notification Triggers
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-[#eeeeeb]">
              <div>
                <p className="text-sm font-semibold text-[#1a1c1b]">Email Notifications</p>
                <p className="text-xs text-[#625e52]">
                  Send emails when leave requests are submitted, approved, or rejected.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 accent-[#5b7a6b] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#eeeeeb]">
              <div>
                <p className="text-sm font-semibold text-[#1a1c1b]">Instant Chat / Slack Bot</p>
                <p className="text-xs text-[#625e52]">
                  Broadcast daily check-in reminders and urgent manager action items.
                </p>
              </div>
              <input
                type="checkbox"
                checked={slackAlerts}
                onChange={(e) => setSlackAlerts(e.target.checked)}
                className="w-5 h-5 accent-[#5b7a6b] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-[#1a1c1b]">
                  Auto-Approve 1-Day Sick Leave
                </p>
                <p className="text-xs text-[#625e52]">
                  Automatically approve single-day medical leaves with doctor note upload.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoApproveSickDays}
                onChange={(e) => setAutoApproveSickDays(e.target.checked)}
                className="w-5 h-5 accent-[#5b7a6b] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow border border-[#eeeeeb]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">security</span>
            <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Access &amp; Security</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#faf9f7] rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-[#1a1c1b]">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-[#625e52]">
                Enforce authenticator app verification on all admin logins.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#436153] bg-[#c8ead8]/40 px-3 py-1 rounded-full">
              Enabled (Company Policy)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
