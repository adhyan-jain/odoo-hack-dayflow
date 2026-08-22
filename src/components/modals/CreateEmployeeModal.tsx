import React, { useState } from 'react';
import { UserRole } from '@/types';
import type { CreateEmployeeInput } from '@/lib/supabase/hrms';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorRole: UserRole;
  onSubmit: (
    input: CreateEmployeeInput
  ) => Promise<{ temporaryPassword: string; loginId: string | null } | { error: string }>;
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  department: '',
  jobTitle: '',
  dateOfJoining: '',
  role: 'employee' as CreateEmployeeInput['role'],
};

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  isOpen,
  onClose,
  creatorRole,
  onSubmit,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ temporaryPassword: string; loginId: string | null } | null>(null);
  const [copied, setCopied] = useState<'password' | 'loginId' | null>(null);

  if (!isOpen) return null;

  const roleOptions: { value: CreateEmployeeInput['role']; label: string }[] =
    creatorRole === 'admin'
      ? [
          { value: 'employee', label: 'Employee' },
          { value: 'hr', label: 'HR' },
          { value: 'admin', label: 'Admin' },
        ]
      : [
          { value: 'employee', label: 'Employee' },
          { value: 'hr', label: 'HR' },
        ];

  const reset = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setResult(null);
    setCopied(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const outcome = await onSubmit({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      department: form.department || undefined,
      jobTitle: form.jobTitle || undefined,
      dateOfJoining: form.dateOfJoining || undefined,
      role: form.role,
    });
    setSubmitting(false);
    if ('error' in outcome) {
      setError(outcome.error);
      return;
    }
    setResult(outcome);
  };

  const handleCopy = (value: string, which: 'password' | 'loginId') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied((prev) => (prev === which ? null : prev)), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={handleClose} />

      {/* Modal Card */}
      <div className="relative bg-[#FFFFFF] rounded-[24px] shadow-floating max-w-lg w-full p-6 md:p-8 z-10 animate-in fade-in zoom-in-95 border border-[#eeeeeb] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#eeeeeb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eeeeeb] text-[#1a1c1b] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">
                {result ? 'Employee Created' : 'New Employee'}
              </h3>
              <p className="text-xs text-[#625e52]">
                {result ? 'Copy these credentials now — shown only once' : 'Provision a new team member'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-[#424844] hover:bg-[#eeeeeb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {result ? (
          <div className="mt-6 space-y-4">
            <div className="p-3 rounded-2xl bg-[#ffdad6]/40 border border-[#ba1a1a]/20 text-xs text-[#ba1a1a] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
              These credentials are shown only once. Copy them and hand them to the new hire securely.
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                Login ID
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-1 h-11 rounded-full bg-[#f4f4f1] px-4 text-sm text-[#1a1c1b] font-mono flex items-center truncate">
                  {result.loginId ?? '—'}
                </span>
                <button
                  type="button"
                  disabled={!result.loginId}
                  onClick={() => result.loginId && handleCopy(result.loginId, 'loginId')}
                  className="shrink-0 h-11 px-4 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copied === 'loginId' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                Temporary Password
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-1 h-11 rounded-full bg-[#f4f4f1] px-4 text-sm text-[#1a1c1b] font-mono flex items-center truncate">
                  {result.temporaryPassword}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(result.temporaryPassword, 'password')}
                  className="shrink-0 h-11 px-4 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer"
                >
                  {copied === 'password' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-full bg-[#1a1c1b] hover:bg-[#424844] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-[#ffdad6]/40 border border-[#ba1a1a]/20 text-xs text-[#ba1a1a]">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                  Job Title
                </label>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))}
                  className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreateEmployeeInput['role'] }))}
                  className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none cursor-pointer"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-full bg-[#1a1c1b] hover:bg-[#424844] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating…' : 'Create Employee'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
