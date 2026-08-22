import React, { useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { UserRole } from '@/types';

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

interface AuthViewProps {
  mode: 'sign-in' | 'sign-up';
}

export const AuthView: React.FC<AuthViewProps> = ({ mode }) => {
  const isSignUp = mode === 'sign-up';
  const { handleSignIn, handleSignUp } = useAppContext();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(BYPASS_AUTH ? 'alex.morgan@dayflow.inc' : '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectDemo = (persona: 'alex' | 'sarah') => {
    setEmail(persona === 'alex' ? 'alex.morgan@dayflow.inc' : 'sarah.jenkins@dayflow.inc');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const result = isSignUp ? await handleSignUp({ email, password, fullName, role }) : await handleSignIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (isSignUp && !BYPASS_AUTH) {
      setInfo('Account created. Check your email to confirm, then sign in.');
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
          <p className="text-[#424844] text-base">Every workday, perfectly aligned</p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#FFFFFF] w-full rounded-[20px] shadow-ambient p-8 flex flex-col gap-6">
          {/* Demo persona quick selector — only meaningful while NEXT_PUBLIC_BYPASS_AUTH=true */}
          {BYPASS_AUTH && !isSignUp && (
            <div className="flex bg-[#eeeeeb] p-1 rounded-full text-xs font-medium text-[#424844]">
              <button
                type="button"
                onClick={() => handleSelectDemo('alex')}
                className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  email.includes('alex') ? 'bg-[#FFFFFF] text-[#022016] font-semibold shadow-sm' : 'hover:text-[#1a1c1b]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a6b]" />
                Alex (Employee)
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('sarah')}
                className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  email.includes('sarah') ? 'bg-[#FFFFFF] text-[#022016] font-semibold shadow-sm' : 'hover:text-[#1a1c1b]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a6b]" />
                Sarah (Admin)
              </button>
            </div>
          )}

          {/* Role picker on real sign-up — defaults to Employee; nobody self-elevates by accident. */}
          {isSignUp && !BYPASS_AUTH && (
            <div className="flex bg-[#eeeeeb] p-1 rounded-full text-xs font-medium text-[#424844]">
              <button
                type="button"
                onClick={() => setRole('employee')}
                className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'employee' ? 'bg-[#FFFFFF] text-[#022016] font-semibold shadow-sm' : 'hover:text-[#1a1c1b]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a6b]" />
                Employee
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'admin' ? 'bg-[#FFFFFF] text-[#022016] font-semibold shadow-sm' : 'hover:text-[#1a1c1b]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a6b]" />
                HR Admin
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="fullName">
                  Full Name
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
            )}

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
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-[#1a1c1b] tracking-wide" htmlFor="password">
                  Password
                </label>
                {!isSignUp && (
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
                )}
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
            {info && <p className="text-xs font-medium text-[#436153] -mt-2">{info}</p>}

            <button
              id="btn-submit-signin"
              type="submit"
              disabled={submitting}
              className="mt-2 w-full h-12 rounded-full bg-[#5b7a6b] text-[#ffffff] text-sm font-semibold tracking-wide hover:bg-[#5b7a6b]/90 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer Toggle */}
        <div className="mt-8 text-center">
          <p className="text-base text-[#424844]">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="text-[#436153] font-semibold hover:text-[#5b7a6b] transition-colors ml-1.5 cursor-pointer underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
