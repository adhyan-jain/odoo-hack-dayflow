import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { bootstrapCompany, companyExists } from '@/lib/supabase/hrms';
import { createClient } from '@/lib/supabase/client';
import { env } from '@/env';

const BYPASS_AUTH = env.NEXT_PUBLIC_BYPASS_AUTH;

interface AuthViewProps {
  mode: 'sign-in' | 'sign-up';
}

function readFileAsBase64(file: File): Promise<{ base64: string; contentType: string }> {
  const { promise, resolve, reject } = Promise.withResolvers<{ base64: string; contentType: string }>();
  const reader = new FileReader();
  reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : '';
    const commaIndex = result.indexOf(',');
    resolve({ base64: result.slice(commaIndex + 1), contentType: file.type || 'image/png' });
  };
  reader.readAsDataURL(file);
  return promise;
}

export const AuthView: React.FC<AuthViewProps> = ({ mode }) => {
  const isSignUp = mode === 'sign-up';
  const router = useRouter();
  const { handleSignIn } = useAppContext();

  // Sign-in fields
  const [identifier, setIdentifier] = useState(BYPASS_AUTH ? 'alex.morgan@dayflow.inc' : '');
  const [password, setPassword] = useState('');

  // Sign-up = company/admin bootstrap fields (wireframe: this is company onboarding,
  // not employee self-registration — employees are created by admin/hr from the
  // Employees page "NEW" button, see POST /api/employees/create).
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectDemo = (persona: 'alex' | 'sarah') => {
    setIdentifier(persona === 'alex' ? 'alex.morgan@dayflow.inc' : 'sarah.jenkins@dayflow.inc');
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await handleSignIn(identifier, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      if (!BYPASS_AUTH) {
        const alreadyExists = await companyExists(createClient());
        if (alreadyExists) {
          setError('A company is already registered. Please sign in instead.');
          setSubmitting(false);
          return;
        }
      }

      let logoBase64: string | undefined;
      let logoContentType: string | undefined;
      if (logoFile) {
        const read = await readFileAsBase64(logoFile);
        logoBase64 = read.base64;
        logoContentType = read.contentType;
      }

      if (BYPASS_AUTH) {
        // Demo mode: no backend to bootstrap against — just drop into the
        // existing mock sign-in so the UI can still be reviewed end to end.
        await handleSignIn(email || 'sarah.jenkins@dayflow.inc', password);
        router.push('/dashboard');
        return;
      }

      await bootstrapCompany({ companyName, fullName, email, password, logoBase64, logoContentType });

      const result = await handleSignIn(email, password);
      if (result.error) {
        setInfo('Company created. Please sign in.');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EEE7] flex items-center justify-center font-sans text-[#1a1c1b] px-4 py-8">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Brand Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-[#5b7a6b] rounded-2xl flex items-center justify-center mb-5 shadow-sm text-white transition-transform hover:scale-105">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              stream
            </span>
          </div>
          <h1 className="text-3xl font-bold text-[#1a1c1b] mb-2 tracking-tight">Dayflow</h1>
          <p className="text-[#424844] text-base">
            {isSignUp ? 'Set up your company workspace' : 'Every workday, perfectly aligned'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#FFFFFF] w-full rounded-[20px] shadow-ambient p-8 flex flex-col gap-6">
          {!isSignUp && BYPASS_AUTH && (
            <div className="flex bg-[#eeeeeb] p-1 rounded-full text-xs font-medium text-[#424844]">
              <button
                type="button"
                onClick={() => handleSelectDemo('alex')}
                className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  identifier.includes('alex') ? 'bg-[#FFFFFF] text-[#022016] font-semibold shadow-sm' : 'hover:text-[#1a1c1b]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a6b]" />
                Alex (Employee)
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('sarah')}
                className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  identifier.includes('sarah') ? 'bg-[#FFFFFF] text-[#022016] font-semibold shadow-sm' : 'hover:text-[#1a1c1b]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a6b]" />
                Sarah (Admin)
              </button>
            </div>
          )}

          {!isSignUp && (
            <form onSubmit={handleSignInSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="identifier">
                  Login ID / Email
                </label>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="OIJODO20220001 or name@company.com"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="password">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset link sent to registered email.');
                    }}
                    className="text-xs font-medium text-[#436153] hover:text-[#5b7a6b] transition-colors"
                  >
                    Forgot?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              {error && <p className="text-xs font-medium text-[#93000a] -mt-2">{error}</p>}

              <button
                id="btn-submit-signin"
                type="submit"
                disabled={submitting}
                className="mt-2 w-full h-12 rounded-full bg-[#5b7a6b] text-[#ffffff] text-sm font-semibold tracking-wide hover:bg-[#5b7a6b]/90 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Please wait…' : 'Sign In'}
              </button>
            </form>
          )}

          {isSignUp && (
            <form onSubmit={handleBootstrapSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="logo">
                  Upload Logo
                </label>
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#424844] file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[#eeeeeb] file:text-[#1a1c1b] hover:file:bg-[#e3e2e0] cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="companyName">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Odoo India"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="fullName">
                  Your Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 rounded-full bg-[#eeeeeb] border-0 px-5 text-base text-[#1a1c1b] placeholder:text-[#424844]/50 focus:ring-2 focus:ring-[#5b7a6b] focus:bg-[#FFFFFF] transition-all outline-none"
                />
              </div>

              {error && <p className="text-xs font-medium text-[#93000a] -mt-2">{error}</p>}
              {info && <p className="text-xs font-medium text-[#436153] -mt-2">{info}</p>}

              <button
                id="btn-submit-signup"
                type="submit"
                disabled={submitting}
                className="mt-2 w-full h-12 rounded-full bg-[#5b7a6b] text-[#ffffff] text-sm font-semibold tracking-wide hover:bg-[#5b7a6b]/90 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Please wait…' : 'Create Company'}
              </button>
            </form>
          )}
        </div>

        {/* Footer Toggle */}
        <div className="mt-8 text-center">
          {isSignUp ? (
            <p className="text-sm text-[#424844]">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold text-[#436153] hover:text-[#5b7a6b] transition-colors">
                Sign In
              </Link>
            </p>
          ) : (
            <p className="text-sm text-[#424844]">
              Setting up a new company?{' '}
              <Link href="/sign-up" className="font-semibold text-[#436153] hover:text-[#5b7a6b] transition-colors">
                Create Company
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
