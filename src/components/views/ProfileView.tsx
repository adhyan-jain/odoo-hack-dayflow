import React, { useState } from 'react';
import { UserProfile, SalaryComponentUI } from '@/types';
import type { SalaryComponentInput } from '@/lib/supabase/hrms';
import { useAppContext } from '@/context/AppContext';

type ProfileTabId = 'resume' | 'private' | 'salary' | 'security';
type ProfilePatch = Partial<UserProfile> & { dateOfBirthIso?: string };

interface ProfileViewProps {
  currentUser: UserProfile;
  /** Read-only mode: hides every edit affordance and gates the Salary Info tab to admin/hr. */
  viewOnly?: boolean;
  onEditProfile: () => void;
  onOpenApplyLeave: () => void;
}

const fmtCurrency = (n: number) => `\u20b9${Math.round(n).toLocaleString('en-IN')}`;

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="material-symbols-outlined text-[#5b7a6b] text-[18px] mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] text-[#625e52] font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#1a1c1b] break-words">{value || '\u2014'}</p>
    </div>
  </div>
);

interface FieldRowProps {
  label: string;
  value: string;
  editing: boolean;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, editing, onChange, type = 'text', placeholder }) => (
  <div>
    <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-1.5">{label}</p>
    {editing ? (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl bg-[#f4f4f1] border-0 px-3.5 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
      />
    ) : (
      <p className="text-sm font-medium text-[#1a1c1b] break-words">{value || '\u2014'}</p>
    )}
  </div>
);

const StatBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#faf9f7] rounded-2xl p-4">
    <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">{label}</p>
    <p className="text-lg font-bold text-[#1a1c1b] mt-1">{value}</p>
  </div>
);

const EditToggleButtons: React.FC<{
  editing: boolean;
  saving?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}> = ({ editing, saving, onEdit, onCancel, onSave }) =>
  editing ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 rounded-full bg-[#1a1c1b] text-white text-xs font-semibold hover:bg-[#424844] transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
      >
        {saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={onEdit}
      className="px-4 py-2 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer flex items-center gap-1.5"
    >
      <span className="material-symbols-outlined text-[14px]">edit</span>
      Edit
    </button>
  );

// ---------------------------------------------------------------------------
// Resume tab — about / skills / certifications / interests, editable inline.
// ---------------------------------------------------------------------------
interface ResumeTabProps {
  profile: UserProfile;
  editable: boolean;
  onSave: (patch: ProfilePatch) => void;
  onUploadResume: (file: File) => Promise<void>;
  onGetResumeSignedUrl: (path: string) => Promise<string>;
  onRemoveResume: () => Promise<void>;
}

const ResumeTab: React.FC<ResumeTabProps> = ({ profile, editable, onSave, onUploadResume, onGetResumeSignedUrl, onRemoveResume }) => {
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState(profile.about);
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [certifications, setCertifications] = useState<string[]>(profile.certifications);
  const [interests, setInterests] = useState(profile.interests);
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');

  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setAbout(profile.about);
    setSkills(profile.skills);
    setCertifications(profile.certifications);
    setInterests(profile.interests);
    setEditing(false);
  }

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills([...skills, trimmed]);
    setSkillInput('');
  };

  const addCert = () => {
    const trimmed = certInput.trim();
    if (trimmed) setCertifications([...certifications, trimmed]);
    setCertInput('');
  };

  const handleCancel = () => {
    setAbout(profile.about);
    setSkills(profile.skills);
    setCertifications(profile.certifications);
    setInterests(profile.interests);
    setSkillInput('');
    setCertInput('');
    setEditing(false);
  };

  const handleSave = () => {
    onSave({ about, skills, certifications, interests });
    setEditing(false);
  };

  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingResume(true);
    setResumeError(null);
    try {
      await onUploadResume(file);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Failed to upload resume. Please try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleViewResume = async () => {
    if (!profile.resumePath) return;
    setResumeError(null);
    try {
      const url = await onGetResumeSignedUrl(profile.resumePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Failed to open resume.');
    }
  };

  const handleRemoveResumeClick = async () => {
    if (!window.confirm('Remove your uploaded resume?')) return;
    setUploadingResume(true);
    setResumeError(null);
    try {
      await onRemoveResume();
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Failed to remove resume. Please try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Resume</h3>
        {editable && (
          <EditToggleButtons editing={editing} onEdit={() => setEditing(true)} onCancel={handleCancel} onSave={handleSave} />
        )}
      </div>

      <div>
        <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-2">Resume File</p>
        {profile.resumePath ? (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-[#faf9f7] rounded-2xl border border-[#eeeeeb]">
            <span className="material-symbols-outlined text-[#5b7a6b] text-[22px] shrink-0">description</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1a1c1b] truncate">
                {profile.resumePath.split('/').pop()}
              </p>
              <p className="text-xs text-[#625e52]">Stored in object storage</p>
            </div>
            <button
              type="button"
              onClick={handleViewResume}
              className="px-3 py-1.5 rounded-full bg-[#eeeeeb] text-xs font-semibold text-[#1a1c1b] hover:bg-[#e3e2e0] cursor-pointer shrink-0"
            >
              View
            </button>
            {editable && (
              <>
                <label className="px-3 py-1.5 rounded-full bg-[#eeeeeb] text-xs font-semibold text-[#1a1c1b] hover:bg-[#e3e2e0] cursor-pointer shrink-0">
                  {uploadingResume ? 'Uploading…' : 'Replace'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleResumeFileChange}
                    disabled={uploadingResume}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveResumeClick}
                  disabled={uploadingResume}
                  className="px-3 py-1.5 rounded-full bg-[#f9dedc] text-xs font-semibold text-[#ba1a1a] hover:bg-[#f4c9c6] cursor-pointer shrink-0 disabled:opacity-50"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ) : editable ? (
          <label className="flex items-center gap-3 w-full rounded-2xl border border-dashed border-[#c1c8c3] bg-[#f4f4f1] text-[#625e52] hover:bg-[#eeeeeb] px-4 py-3 text-sm cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            <span>{uploadingResume ? 'Uploading…' : 'Upload your resume (PDF, DOC, DOCX)'}</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleResumeFileChange}
              disabled={uploadingResume}
            />
          </label>
        ) : (
          <p className="text-sm text-[#625e52]">No resume uploaded yet.</p>
        )}
        {resumeError && <p className="text-xs text-[#ba1a1a] mt-2">{resumeError}</p>}
      </div>

      <div>
        <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-2">About</p>
        {editing ? (
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            placeholder="Tell your team about yourself…"
            className="w-full rounded-2xl bg-[#f4f4f1] border-0 p-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-[#424844] leading-relaxed">{about || 'No summary provided yet.'}</p>
        )}
      </div>

      <div>
        <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-2">Skills</p>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, i) => (
            <span
              key={`${skill}-${i}`}
              className="inline-flex items-center gap-1.5 bg-[#eeeeeb] text-[#424844] px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              {skill}
              {editing && (
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}
                  className="text-[#625e52] hover:text-[#ba1a1a] cursor-pointer"
                  aria-label={`Remove ${skill}`}
                >
                  <span className="material-symbols-outlined text-[14px] block">close</span>
                </button>
              )}
            </span>
          ))}
          {skills.length === 0 && !editing && <p className="text-sm text-[#625e52]">No skills added yet.</p>}
        </div>
        {editing && (
          <div className="flex gap-2 mt-3">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill…"
              className="flex-1 h-10 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 h-10 rounded-full bg-[#eeeeeb] text-[#1a1c1b] text-xs font-semibold hover:bg-[#e3e2e0] cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Skills
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-2">Certifications</p>
        <div className="flex flex-col gap-2">
          {certifications.map((cert, i) => (
            <div key={`${cert}-${i}`} className="flex items-center justify-between gap-3 p-2.5 bg-[#faf9f7] rounded-xl">
              <span className="text-sm text-[#1a1c1b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5b7a6b] text-[16px]">workspace_premium</span>
                {cert}
              </span>
              {editing && (
                <button
                  type="button"
                  onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))}
                  className="text-[#625e52] hover:text-[#ba1a1a] cursor-pointer"
                  aria-label={`Remove ${cert}`}
                >
                  <span className="material-symbols-outlined text-[16px] block">close</span>
                </button>
              )}
            </div>
          ))}
          {certifications.length === 0 && !editing && <p className="text-sm text-[#625e52]">No certifications added yet.</p>}
        </div>
        {editing && (
          <div className="flex gap-2 mt-3">
            <input
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCert();
                }
              }}
              placeholder="Add a certification…"
              className="flex-1 h-10 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
            <button
              type="button"
              onClick={addCert}
              className="px-4 h-10 rounded-full bg-[#eeeeeb] text-[#1a1c1b] text-xs font-semibold hover:bg-[#e3e2e0] cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-2">
          What I Love About My Job &amp; My Interests
        </p>
        {editing ? (
          <textarea
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            rows={3}
            placeholder="Share what you love about your job, your hobbies, and interests…"
            className="w-full rounded-2xl bg-[#f4f4f1] border-0 p-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-[#424844] leading-relaxed">{interests || 'Nothing shared yet.'}</p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Private Info tab — DOB / gender / marital status / nationality / personal
// contact / bank details, editable inline.
// ---------------------------------------------------------------------------
interface PrivateInfoTabProps {
  profile: UserProfile;
  editable: boolean;
  onSave: (patch: ProfilePatch) => void;
}

const PrivateInfoTab: React.FC<PrivateInfoTabProps> = ({ profile, editable, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [dobIso, setDobIso] = useState('');
  const [gender, setGender] = useState(profile.gender);
  const [maritalStatus, setMaritalStatus] = useState(profile.maritalStatus);
  const [nationality, setNationality] = useState(profile.nationality);
  const [personalEmail, setPersonalEmail] = useState(profile.personalEmail);
  const [residingAddress, setResidingAddress] = useState(profile.residingAddress);
  const [bankName, setBankName] = useState(profile.bankName);
  const [bankAccountNo, setBankAccountNo] = useState(profile.bankAccountNo);
  const [ifscCode, setIfscCode] = useState(profile.ifscCode);
  const [uanNo, setUanNo] = useState(profile.uanNo);
  const [panNo, setPanNo] = useState(profile.panNo);

  const [prevProfile2, setPrevProfile2] = useState(profile);
  if (profile !== prevProfile2) {
    setPrevProfile2(profile);
    setDobIso('');
    setGender(profile.gender);
    setMaritalStatus(profile.maritalStatus);
    setNationality(profile.nationality);
    setPersonalEmail(profile.personalEmail);
    setResidingAddress(profile.residingAddress);
    setBankName(profile.bankName);
    setBankAccountNo(profile.bankAccountNo);
    setIfscCode(profile.ifscCode);
    setUanNo(profile.uanNo);
    setPanNo(profile.panNo);
    setEditing(false);
  }

  const handleCancel = () => {
    setDobIso('');
    setGender(profile.gender);
    setMaritalStatus(profile.maritalStatus);
    setNationality(profile.nationality);
    setPersonalEmail(profile.personalEmail);
    setResidingAddress(profile.residingAddress);
    setBankName(profile.bankName);
    setBankAccountNo(profile.bankAccountNo);
    setIfscCode(profile.ifscCode);
    setUanNo(profile.uanNo);
    setPanNo(profile.panNo);
    setEditing(false);
  };

  const handleSave = () => {
    const patch: ProfilePatch = {
      gender,
      maritalStatus,
      nationality,
      personalEmail,
      residingAddress,
      bankName,
      bankAccountNo,
      ifscCode,
      uanNo,
      panNo,
    };
    if (dobIso) patch.dateOfBirthIso = dobIso;
    onSave(patch);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Private Info</h3>
        {editable && (
          <EditToggleButtons editing={editing} onEdit={() => setEditing(true)} onCancel={handleCancel} onSave={handleSave} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider mb-1.5">Date of Birth</p>
          {editing ? (
            <input
              type="date"
              value={dobIso}
              onChange={(e) => setDobIso(e.target.value)}
              className="w-full h-10 rounded-xl bg-[#f4f4f1] border-0 px-3.5 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          ) : (
            <p className="text-sm font-medium text-[#1a1c1b]">{profile.dateOfBirth}</p>
          )}
        </div>
        <FieldRow label="Gender" value={gender} editing={editing} onChange={setGender} />
        <FieldRow label="Marital Status" value={maritalStatus} editing={editing} onChange={setMaritalStatus} />
        <FieldRow label="Nationality" value={nationality} editing={editing} onChange={setNationality} />
        <FieldRow label="Personal Email" value={personalEmail} editing={editing} onChange={setPersonalEmail} type="email" />
        <FieldRow label="Residing Address" value={residingAddress} editing={editing} onChange={setResidingAddress} />
        <FieldRow label="Employee Code" value={profile.employeeId} editing={false} />
        <FieldRow label="Date of Joining" value={profile.joinDate} editing={false} />
      </div>

      <div>
        <p className="text-sm font-bold text-[#1a1c1b] mb-4">Bank Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <FieldRow label="Bank Name" value={bankName} editing={editing} onChange={setBankName} />
          <FieldRow label="Account Number" value={bankAccountNo} editing={editing} onChange={setBankAccountNo} />
          <FieldRow label="IFSC Code" value={ifscCode} editing={editing} onChange={setIfscCode} />
          <FieldRow label="UAN No." value={uanNo} editing={editing} onChange={setUanNo} />
          <FieldRow label="PAN No." value={panNo} editing={editing} onChange={setPanNo} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Salary Info tab — component breakdown, PF/tax, month/year toggle,
// compensation visibility, admin/hr edit mode.
// ---------------------------------------------------------------------------
interface SalaryInfoTabProps {
  profile: UserProfile;
  canManage: boolean;
  onToggleVisibility: (visible: boolean) => Promise<void>;
  onReviseSalary: (
    patch: { basicSalary: number; workingDaysPerWeek: number; standardDailyHours: number; breakMinutes: number },
    components: SalaryComponentInput[]
  ) => Promise<void>;
}

const stripComponent = (c: SalaryComponentUI): SalaryComponentInput => ({
  name: c.name,
  category: c.category,
  computationType: c.computationType,
  value: c.value,
});

const SalaryInfoTab: React.FC<SalaryInfoTabProps> = ({ profile, canManage, onToggleVisibility, onReviseSalary }) => {
  const { salary } = profile;
  const [wageView, setWageView] = useState<'month' | 'year'>('month');
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basicSalary, setBasicSalary] = useState(salary.base);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(salary.workingDaysPerWeek);
  const [standardDailyHours, setStandardDailyHours] = useState(8);
  const [breakMinutes, setBreakMinutes] = useState(salary.breakMinutes);
  const [components, setComponents] = useState<SalaryComponentInput[]>(salary.components.map(stripComponent));

  const [prevSalary, setPrevSalary] = useState(salary);
  if (salary !== prevSalary) {
    setPrevSalary(salary);
    setBasicSalary(salary.base);
    setWorkingDaysPerWeek(salary.workingDaysPerWeek);
    setBreakMinutes(salary.breakMinutes);
    setStandardDailyHours(8);
    setComponents(salary.components.map(stripComponent));
    setEditing(false);
    setError(null);
  }

  const cancelEditing = () => {
    setBasicSalary(salary.base);
    setWorkingDaysPerWeek(salary.workingDaysPerWeek);
    setBreakMinutes(salary.breakMinutes);
    setStandardDailyHours(8);
    setComponents(salary.components.map(stripComponent));
    setEditing(false);
    setError(null);
  };

  const updateComponent = (idx: number, patch: Partial<SalaryComponentInput>) => {
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };
  const addComponent = () =>
    setComponents((prev) => [...prev, { name: '', category: 'earning', computationType: 'fixed', value: 0 }]);
  const removeComponent = (idx: number) => setComponents((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onReviseSalary({ basicSalary, workingDaysPerWeek, standardDailyHours, breakMinutes }, components);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save salary changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityChange = async (checked: boolean) => {
    setVisibilitySaving(true);
    try {
      await onToggleVisibility(checked);
    } finally {
      setVisibilitySaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Salary Info</h3>
        {canManage &&
          (editing ? (
            <EditToggleButtons editing saving={saving} onEdit={() => {}} onCancel={cancelEditing} onSave={handleSave} />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Edit Salary
            </button>
          ))}
      </div>

      {salary.netOnly && (
        <div className="p-4 bg-[#e6dfd0]/40 rounded-xl flex items-center gap-2.5 text-[#676256] text-xs">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span>Restricted view. Full breakdown is visible to HR &amp; Admin only.</span>
        </div>
      )}

      <div className="flex items-center gap-1 bg-[#f4f4f1] p-1 rounded-full w-fit">
        <button
          type="button"
          onClick={() => setWageView('month')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            wageView === 'month' ? 'bg-white text-[#1a1c1b] shadow-sm' : 'text-[#625e52] hover:text-[#1a1c1b]'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setWageView('year')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            wageView === 'year' ? 'bg-white text-[#1a1c1b] shadow-sm' : 'text-[#625e52] hover:text-[#1a1c1b]'
          }`}
        >
          Yearly
        </button>
      </div>

      <div className="bg-[#faf9f7] rounded-2xl p-5">
        <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
          Net {wageView === 'month' ? 'Monthly' : 'Yearly'} Pay
        </p>
        <p className="text-2xl font-bold text-[#1a1c1b] mt-0.5">
          {fmtCurrency(wageView === 'month' ? salary.netMonthly : salary.netYearly)}
        </p>
      </div>

      {!salary.netOnly && (
        <>
          <div>
            <h4 className="text-sm font-bold text-[#1a1c1b] mb-3">Component Breakdown</h4>
            <div className="overflow-x-auto rounded-2xl border border-[#eeeeeb]">
              <table className="w-full text-sm">
                <thead className="bg-[#faf9f7] text-[#625e52] text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Component</th>
                    <th className="text-left px-4 py-3 font-semibold">Category</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-right px-4 py-3 font-semibold">Value</th>
                    <th className="text-right px-4 py-3 font-semibold">Monthly \u20b9</th>
                    {editing && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {editing
                    ? components.map((c, i) => (
                        <tr key={i} className="border-t border-[#eeeeeb]">
                          <td className="px-3 py-2">
                            <input
                              value={c.name}
                              onChange={(e) => updateComponent(i, { name: e.target.value })}
                              placeholder="Component name"
                              className="w-full h-9 rounded-lg bg-[#f4f4f1] border-0 px-2.5 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={c.category}
                              onChange={(e) => updateComponent(i, { category: e.target.value as SalaryComponentUI['category'] })}
                              className="w-full h-9 rounded-lg bg-[#f4f4f1] border-0 px-2 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none cursor-pointer"
                            >
                              <option value="earning">Earning</option>
                              <option value="employer_contribution">Employer Contribution</option>
                              <option value="deduction">Deduction</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={c.computationType}
                              onChange={(e) =>
                                updateComponent(i, { computationType: e.target.value as SalaryComponentUI['computationType'] })
                              }
                              className="w-full h-9 rounded-lg bg-[#f4f4f1] border-0 px-2 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none cursor-pointer"
                            >
                              <option value="fixed">Fixed \u20b9/mo</option>
                              <option value="percent">% of Basic</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={c.value}
                              onChange={(e) => updateComponent(i, { value: Number(e.target.value) })}
                              className="w-24 h-9 rounded-lg bg-[#f4f4f1] border-0 px-2.5 text-sm text-right focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-[#625e52]">&mdash;</td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeComponent(i)}
                              className="text-[#ba1a1a] hover:bg-[#ba1a1a]/10 rounded-full p-1.5 cursor-pointer"
                              aria-label="Remove component"
                            >
                              <span className="material-symbols-outlined text-[18px] block">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    : salary.components.map((c) => (
                        <tr key={c.id} className="border-t border-[#eeeeeb]">
                          <td className="px-4 py-2.5 font-medium text-[#1a1c1b]">{c.name}</td>
                          <td className="px-4 py-2.5 text-[#625e52] capitalize">{c.category.replace('_', ' ')}</td>
                          <td className="px-4 py-2.5 text-[#625e52] capitalize">{c.computationType}</td>
                          <td className="px-4 py-2.5 text-right text-[#1a1c1b]">
                            {c.computationType === 'percent' ? `${c.value}%` : fmtCurrency(c.value)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[#1a1c1b]">{fmtCurrency(c.monthlyAmount)}</td>
                        </tr>
                      ))}
                  {!editing && salary.components.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-[#625e52]">
                        No salary components configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {editing && (
              <button
                type="button"
                onClick={addComponent}
                className="mt-3 px-4 py-2 rounded-full border border-dashed border-[#c1c8c3] hover:border-[#5b7a6b] text-xs font-semibold text-[#424844] hover:text-[#5b7a6b] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Component
              </button>
            )}
          </div>

          {editing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#faf9f7] rounded-2xl p-4">
              <div>
                <label className="text-[10px] text-[#625e52] font-semibold uppercase tracking-wider block mb-1">
                  Basic Salary (\u20b9/mo)
                </label>
                <input
                  type="number"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full h-9 rounded-lg bg-white border border-[#eeeeeb] px-2.5 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#625e52] font-semibold uppercase tracking-wider block mb-1">
                  Working Days / Week
                </label>
                <input
                  type="number"
                  value={workingDaysPerWeek}
                  onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value))}
                  className="w-full h-9 rounded-lg bg-white border border-[#eeeeeb] px-2.5 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#625e52] font-semibold uppercase tracking-wider block mb-1">
                  Standard Daily Hours
                </label>
                <input
                  type="number"
                  value={standardDailyHours}
                  onChange={(e) => setStandardDailyHours(Number(e.target.value))}
                  className="w-full h-9 rounded-lg bg-white border border-[#eeeeeb] px-2.5 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#625e52] font-semibold uppercase tracking-wider block mb-1">
                  Break (minutes)
                </label>
                <input
                  type="number"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full h-9 rounded-lg bg-white border border-[#eeeeeb] px-2.5 text-sm focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="PF (Employee)" value={fmtCurrency(salary.pfEmployee)} />
            <StatBlock label="PF (Employer)" value={fmtCurrency(salary.pfEmployer)} />
            <StatBlock label="Professional Tax" value={fmtCurrency(salary.professionalTax)} />
            <StatBlock label="Working Days / Week" value={`${salary.workingDaysPerWeek} days \u00b7 ${salary.breakMinutes}m break`} />
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#faf9f7] rounded-2xl">
            <input
              type="checkbox"
              checked={profile.compensationVisibility}
              disabled={!canManage || visibilitySaving}
              onChange={(e) => handleVisibilityChange(e.target.checked)}
              className="w-5 h-5 accent-[#5b7a6b] rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div>
              <p className="text-sm font-semibold text-[#1a1c1b]">Manager Visibility</p>
              <p className="text-xs text-[#625e52]">
                When enabled, this employee&apos;s direct manager can see the full salary breakdown, not just the net total.
              </p>
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-[#ba1a1a]">{error}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Security tab — change password.
// ---------------------------------------------------------------------------
interface SecurityTabProps {
  mustChangePassword: boolean;
  onChangePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const SecurityTab: React.FC<SecurityTabProps> = ({ mustChangePassword, onChangePassword }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await onChangePassword(password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(true);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Security</h3>

      {mustChangePassword && (
        <div className="p-4 rounded-2xl bg-[#ba1a1a]/[0.06] border border-[#ba1a1a]/20 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">warning</span>
          <div>
            <p className="text-sm font-semibold text-[#ba1a1a]">Password change required</p>
            <p className="text-xs text-[#625e52] mt-0.5">
              Your account was created with a temporary password. Set a new password below before continuing.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">New Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
          />
        </div>
        {error && <p className="text-sm text-[#ba1a1a]">{error}</p>}
        {success && <p className="text-sm text-[#436153]">Password updated successfully.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-[#1a1c1b] hover:bg-[#424844] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, viewOnly = false, onEditProfile, onOpenApplyLeave }) => {
  void onOpenApplyLeave;

  const {
    currentUser: viewer,
    companySettings,
    handleEditProfileSave,
    handleUploadResume,
    handleGetResumeSignedUrl,
    handleRemoveResume,
    handleUpdateCompensationVisibility,
    handleReviseSalary,
    handleChangePassword,
  } = useAppContext();

  const isSelf = viewer.id === currentUser.id;
  const canManage = viewer.role !== 'employee';
  const canEditOwnDetails = isSelf && !viewOnly;
  const showSalaryTab = canManage || (isSelf && !currentUser.salary.netOnly);
  const showSecurityTab = isSelf && !viewOnly;
  const showMustChangeBanner = isSelf && currentUser.mustChangePassword;

  const tabs: { id: ProfileTabId; label: string }[] = [
    { id: 'resume', label: 'Resume' },
    { id: 'private', label: 'Private Info' },
  ];
  if (showSalaryTab) tabs.push({ id: 'salary', label: 'Salary Info' });
  if (showSecurityTab) tabs.push({ id: 'security', label: 'Security' });

  const defaultTab: ProfileTabId = showMustChangeBanner && showSecurityTab ? 'security' : 'resume';
  const [activeTab, setActiveTab] = useState<ProfileTabId>(defaultTab);

  const [prevUserId, setPrevUserId] = useState(currentUser.id);
  if (currentUser.id !== prevUserId) {
    setPrevUserId(currentUser.id);
    setActiveTab(defaultTab);
  }

  const effectiveTab: ProfileTabId = tabs.some((t) => t.id === activeTab) ? activeTab : 'resume';

  return (
    <div id="profile-view" className="px-4 md:px-10 pb-16 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
      {showMustChangeBanner && effectiveTab !== 'security' && (
        <div className="bg-[#ba1a1a]/[0.06] border border-[#ba1a1a]/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[22px]">warning</span>
            <div>
              <p className="text-sm font-semibold text-[#ba1a1a]">You&apos;re using a temporary password</p>
              <p className="text-xs text-[#625e52]">Head to Security to set your own password.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className="px-4 py-2 rounded-full bg-[#ba1a1a] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shrink-0"
          >
            Change Password
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left info panel */}
        <aside className="w-full lg:w-[300px] shrink-0 bg-[#FFFFFF] rounded-[24px] p-6 bento-shadow border border-[#eeeeeb] flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#eeeeeb] shadow-sm shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c1b] tracking-tight">{currentUser.name}</h2>
              <p className="text-[#424844] text-sm font-medium mt-0.5">{currentUser.title}</p>
            </div>
            {canEditOwnDetails && (
              <button
                id="btn-edit-profile"
                onClick={onEditProfile}
                className="px-5 py-2.5 rounded-full bg-[#1a1c1b] text-[#ffffff] hover:bg-[#424844] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit Profile
              </button>
            )}
          </div>

          <div className="border-t border-[#eeeeeb] pt-5 flex flex-col gap-4">
            <InfoRow icon="badge" label="Login ID" value={currentUser.loginId ?? '\u2014'} />
            <InfoRow icon="mail" label="Email" value={currentUser.email} />
            <InfoRow icon="call" label="Mobile" value={currentUser.phone} />
            <InfoRow icon="apartment" label="Company" value={companySettings?.name ?? 'Dayflow'} />
            <InfoRow icon="corporate_fare" label="Department" value={currentUser.department} />
            <InfoRow icon="supervisor_account" label="Manager" value={currentUser.manager.name} />
            <InfoRow icon="work" label="Job Position" value={currentUser.title} />
          </div>
        </aside>

        {/* Tabs */}
        <div className="flex-1 min-w-0 w-full bg-[#FFFFFF] rounded-[24px] bento-shadow border border-[#eeeeeb] overflow-hidden flex flex-col">
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#eeeeeb] overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  effectiveTab === tab.id ? 'text-[#1a1c1b]' : 'text-[#625e52] hover:text-[#1a1c1b]'
                }`}
              >
                {tab.label}
                {effectiveTab === tab.id && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#5b7a6b] rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {effectiveTab === 'resume' && (
              <ResumeTab
                profile={currentUser}
                editable={canEditOwnDetails}
                onSave={handleEditProfileSave}
                onUploadResume={handleUploadResume}
                onGetResumeSignedUrl={handleGetResumeSignedUrl}
                onRemoveResume={handleRemoveResume}
              />
            )}
            {effectiveTab === 'private' && (
              <PrivateInfoTab profile={currentUser} editable={canEditOwnDetails} onSave={handleEditProfileSave} />
            )}
            {effectiveTab === 'salary' && showSalaryTab && (
              <SalaryInfoTab
                profile={currentUser}
                canManage={canManage}
                onToggleVisibility={(visible) => handleUpdateCompensationVisibility(currentUser.id, visible)}
                onReviseSalary={(patch, components) => handleReviseSalary(currentUser.id, patch, components)}
              />
            )}
            {effectiveTab === 'security' && showSecurityTab && (
              <SecurityTab mustChangePassword={currentUser.mustChangePassword} onChangePassword={handleChangePassword} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
