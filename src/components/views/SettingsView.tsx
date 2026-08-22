import React, { useState } from 'react';
import { UserProfile, CompanySettingsUI, TeamCoverageConfig } from '@/types';
import type { LeaveType } from '@/lib/types';

interface SettingsViewProps {
  currentUser: UserProfile;
  companySettings: CompanySettingsUI | null;
  teamCoverageConfig: TeamCoverageConfig[];
  onUpdateCompanySettings: (patch: Partial<CompanySettingsUI>) => Promise<void>;
  onSaveTeamCoverageConfig: (config: {
    department: string;
    minHeadcountRequired: number;
    appliesToLeaveTypes: LeaveType[];
  }) => Promise<void>;
}

const ALL_LEAVE_TYPES: LeaveType[] = ['paid', 'sick', 'unpaid'];

const leaveTypeLabel: Record<LeaveType, string> = {
  paid: 'Paid',
  sick: 'Sick',
  unpaid: 'Unpaid',
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  companySettings,
  teamCoverageConfig,
  onUpdateCompanySettings,
  onSaveTeamCoverageConfig,
}) => {
  const canManage = currentUser.role !== 'employee';

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [autoApproveSickDays, setAutoApproveSickDays] = useState(false);

  const [companyName, setCompanyName] = useState(companySettings?.name ?? '');
  const [logoUrl, setLogoUrl] = useState(companySettings?.logoUrl ?? '');
  const [savingOrg, setSavingOrg] = useState(false);

  const [prevCompanySettings, setPrevCompanySettings] = useState(companySettings);
  if (companySettings !== prevCompanySettings) {
    setPrevCompanySettings(companySettings);
    setCompanyName(companySettings?.name ?? '');
    setLogoUrl(companySettings?.logoUrl ?? '');
  }

  const orgDirty =
    companyName !== (companySettings?.name ?? '') || logoUrl !== (companySettings?.logoUrl ?? '');

  const handleSaveOrgSettings = async () => {
    setSavingOrg(true);
    try {
      await onUpdateCompanySettings({ name: companyName, logoUrl: logoUrl || null });
    } finally {
      setSavingOrg(false);
    }
  };

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">business</span>
              <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Organization Profile</h3>
            </div>
            {canManage && (
              <button
                onClick={handleSaveOrgSettings}
                disabled={!orgDirty || savingOrg}
                className="text-xs font-semibold text-[#436153] bg-[#c8ead8]/40 hover:bg-[#c8ead8]/70 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-full transition-all cursor-pointer"
              >
                {savingOrg ? 'Saving…' : 'Save'}
              </button>
            )}
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
                disabled={!canManage}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#424844] uppercase tracking-wider block mb-1.5">
                Logo URL
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!canManage}
                placeholder="https://…"
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none disabled:opacity-60"
              />
            </div>
          </div>
          {!canManage && (
            <p className="text-xs text-[#625e52] mt-3">
              Only Admin or HR can update organization information.
            </p>
          )}
        </div>

        {/* Team Coverage */}
        <TeamCoverageSection
          canManage={canManage}
          teamCoverageConfig={teamCoverageConfig}
          onSaveTeamCoverageConfig={onSaveTeamCoverageConfig}
        />

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

interface TeamCoverageSectionProps {
  canManage: boolean;
  teamCoverageConfig: TeamCoverageConfig[];
  onSaveTeamCoverageConfig: (config: {
    department: string;
    minHeadcountRequired: number;
    appliesToLeaveTypes: LeaveType[];
  }) => Promise<void>;
}

interface RowDraft {
  minHeadcountRequired: number;
  appliesToLeaveTypes: LeaveType[];
}

const TeamCoverageSection: React.FC<TeamCoverageSectionProps> = ({
  canManage,
  teamCoverageConfig,
  onSaveTeamCoverageConfig,
}) => {
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [savingDept, setSavingDept] = useState<string | null>(null);

  const [newDept, setNewDept] = useState('');
  const [newMinHeadcount, setNewMinHeadcount] = useState(1);
  const [newLeaveTypes, setNewLeaveTypes] = useState<LeaveType[]>(['paid', 'sick', 'unpaid']);
  const [addingNew, setAddingNew] = useState(false);

  const startEdit = (config: TeamCoverageConfig) => {
    setEditingDept(config.department);
    setDraft({
      minHeadcountRequired: config.min_headcount_required,
      appliesToLeaveTypes: [...config.applies_to_leave_types],
    });
  };

  const toggleDraftLeaveType = (type: LeaveType) => {
    if (!draft) return;
    setDraft({
      ...draft,
      appliesToLeaveTypes: draft.appliesToLeaveTypes.includes(type)
        ? draft.appliesToLeaveTypes.filter((t) => t !== type)
        : [...draft.appliesToLeaveTypes, type],
    });
  };

  const toggleNewLeaveType = (type: LeaveType) => {
    setNewLeaveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const saveEdit = async () => {
    if (!editingDept || !draft) return;
    setSavingDept(editingDept);
    try {
      await onSaveTeamCoverageConfig({
        department: editingDept,
        minHeadcountRequired: draft.minHeadcountRequired,
        appliesToLeaveTypes: draft.appliesToLeaveTypes,
      });
      setEditingDept(null);
      setDraft(null);
    } finally {
      setSavingDept(null);
    }
  };

  const saveNew = async () => {
    if (!newDept.trim()) return;
    setAddingNew(true);
    try {
      await onSaveTeamCoverageConfig({
        department: newDept.trim(),
        minHeadcountRequired: newMinHeadcount,
        appliesToLeaveTypes: newLeaveTypes,
      });
      setNewDept('');
      setNewMinHeadcount(1);
      setNewLeaveTypes(['paid', 'sick', 'unpaid']);
    } finally {
      setAddingNew(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow border border-[#eeeeeb]">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">groups</span>
        <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Team Coverage</h3>
      </div>
      <p className="text-xs text-[#625e52] mb-4">
        Minimum headcount required per department before leave requests are auto-flagged as a
        coverage conflict.
      </p>

      {teamCoverageConfig.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#424844] bg-[#faf9f7] rounded-2xl">
          No team coverage rules configured yet.
        </div>
      ) : (
        <div className="space-y-2">
          {teamCoverageConfig.map((config) => {
            const isEditing = editingDept === config.department;
            return (
              <div
                key={config.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#faf9f7] rounded-2xl"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a1c1b]">{config.department}</p>
                  {!isEditing ? (
                    <p className="text-xs text-[#625e52]">
                      Min headcount: {config.min_headcount_required} · Applies to:{' '}
                      {config.applies_to_leave_types.map((t) => leaveTypeLabel[t]).join(', ') || 'None'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <label className="flex items-center gap-2 text-xs text-[#424844]">
                        Min headcount
                        <input
                          type="number"
                          min={0}
                          value={draft?.minHeadcountRequired ?? 0}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, minHeadcountRequired: Number(e.target.value) } : d
                            )
                          }
                          className="w-16 h-8 rounded-full bg-white border border-[#c1c8c3] px-3 text-xs text-[#1a1c1b] outline-none focus:ring-2 focus:ring-[#5b7a6b]"
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        {ALL_LEAVE_TYPES.map((type) => (
                          <label
                            key={type}
                            className="flex items-center gap-1 text-xs text-[#424844] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={draft?.appliesToLeaveTypes.includes(type) ?? false}
                              onChange={() => toggleDraftLeaveType(type)}
                              className="w-4 h-4 accent-[#5b7a6b] rounded cursor-pointer"
                            />
                            {leaveTypeLabel[type]}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={savingDept === config.department}
                          className="text-xs font-semibold text-[#436153] bg-[#c8ead8]/40 hover:bg-[#c8ead8]/70 disabled:opacity-40 px-4 py-1.5 rounded-full transition-all cursor-pointer"
                        >
                          {savingDept === config.department ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingDept(null);
                            setDraft(null);
                          }}
                          className="text-xs font-semibold text-[#625e52] hover:text-[#1a1c1b] px-3 py-1.5 rounded-full transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(config)}
                        className="text-xs font-semibold text-[#5b7a6b] hover:text-[#436153] px-3 py-1.5 rounded-full transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <div className="mt-4 p-4 border border-dashed border-[#c1c8c3] rounded-2xl flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#424844] uppercase tracking-wider block mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full h-10 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#424844] uppercase tracking-wider block mb-1.5">
              Min Headcount
            </label>
            <input
              type="number"
              min={0}
              value={newMinHeadcount}
              onChange={(e) => setNewMinHeadcount(Number(e.target.value))}
              className="w-24 h-10 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {ALL_LEAVE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1 text-xs text-[#424844] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newLeaveTypes.includes(type)}
                  onChange={() => toggleNewLeaveType(type)}
                  className="w-4 h-4 accent-[#5b7a6b] rounded cursor-pointer"
                />
                {leaveTypeLabel[type]}
              </label>
            ))}
          </div>
          <button
            onClick={saveNew}
            disabled={!newDept.trim() || addingNew}
            className="bg-[#5b7a6b] text-[#ffffff] hover:bg-[#436153] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
          >
            {addingNew ? 'Adding…' : 'Add Rule'}
          </button>
        </div>
      )}
    </div>
  );
};
