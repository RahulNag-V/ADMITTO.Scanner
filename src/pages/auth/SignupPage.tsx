import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowLeft,
  AlertCircle,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { signUpWithEmail } from '../../lib/supabaseAuth';
import { saveSession, authApi } from '../../lib/api';
import { AuthSession } from '../../types';
import { AppLogo } from '../../components/common/AppLogo';
import { generateFunTempEmail } from '../../lib/tempEmailGenerator';

interface SignupPageProps {
  returnTo?: string;
  onSignupSuccess: (session: AuthSession) => void;
  onNeedsEmailVerification?: (email: string) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  returnTo,
  onSignupSuccess,
  onNeedsEmailVerification,
  onNavigateLogin,
  onNavigateHome,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Roll / Randomize fun temporary email based on name
  const handleRollFunEmail = (currentName?: string) => {
    const nameToUse = currentName !== undefined ? currentName : fullName;
    const newEmail = generateFunTempEmail(nameToUse, email);
    setEmail(newEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError('Phone number is required to create an admin account.');
      return;
    }
    if (cleanPhone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    if (!email.trim()) {
      setError('Please enter or generate a temporary email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }

    setLoading(true);

    try {
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();

      // 1. Register with backend API to create active profile and session immediately
      let session: AuthSession | null = null;
      try {
        const regRes = await authApi.register(cleanName, cleanEmail, password, cleanPhone);
        if (regRes?.session) {
          session = regRes.session;
        }
      } catch (apiErr: any) {
        if (apiErr.status === 409 || apiErr.message?.toLowerCase().includes('already exists')) {
          setError('An account with this email already exists. Try signing in or generate another temporary email.');
          setLoading(false);
          return;
        }
      }

      // 2. Also register via Supabase Auth so it is in Supabase
      try {
        const res = await signUpWithEmail(cleanName, cleanEmail, password, cleanPhone);
        if (res.user && res.session && !session) {
          session = {
            token: res.session.access_token,
            user: {
              id: res.user.id,
              email: res.user.email || cleanEmail,
              name: cleanName,
              phone: cleanPhone,
              role: 'ADMIN',
            },
          };
        } else if (res.user && !session) {
          session = {
            token: `adm_tok_${res.user.id.replace(/-/g, '')}`,
            user: {
              id: res.user.id,
              email: res.user.email || cleanEmail,
              name: cleanName,
              phone: cleanPhone,
              role: 'ADMIN',
            },
          };
        }
      } catch (sbErr: any) {
        if (sbErr.message?.toLowerCase().includes('already exists')) {
          setError('An account with this email already exists. Try signing in or generate another temporary email.');
          setLoading(false);
          return;
        }
      }

      // 3. Fallback session if neither returned one
      if (!session) {
        session = {
          token: `adm_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          user: {
            id: `usr_${Date.now()}`,
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone,
            role: 'ADMIN',
          },
        };
      }

      // NO EMAIL VERIFICATION: Directly establish session and enter dashboard!
      saveSession(session);
      onSignupSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="signup-page"
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Left: Small Back to Home Button */}
      <button
        type="button"
        id="signup-back-to-home-btn"
        onClick={onNavigateHome}
        className="fixed top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-all cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Home</span>
      </button>

      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[250px] sm:w-[350px] h-[250px] bg-purple-500/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[440px] space-y-6 relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div
            onClick={onNavigateHome}
            className="inline-flex items-center gap-3 cursor-pointer group justify-center"
          >
            <AppLogo size="md" className="group-hover:scale-105 shadow-xl shadow-orange-500/20" />
            <span className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk'] tracking-tight">
              ADMITTO
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">Get started with ADMITTO temporary credentials</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-white/10 backdrop-blur-2xl">
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFullName(val);
                    if (!isEmailManuallyEdited) {
                      const funEmail = generateFunTempEmail(val, email);
                      setEmail(funEmail);
                    }
                  }}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            {/* Phone Number (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Phone Number</span>
                <span className="text-rose-400 text-xs font-bold" title="Required">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-phone-input"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            {/* Temporary Email with Randomize Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Temporary Email</span>
                </label>
                <button
                  type="button"
                  id="generate-fun-email-btn"
                  onClick={() => {
                    setIsEmailManuallyEdited(false);
                    handleRollFunEmail();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Generate a fun, short temporary email based on your name"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>🎲 Randomize Fun Email</span>
                </button>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. ninja.alex42@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailManuallyEdited(true);
                  }}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Short temporary email generated based on your name. Click <strong>Randomize</strong> for fun variations or edit as you like.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Create Account Button */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="pt-2 border-t border-white/10 text-center">
            <p className="text-xs sm:text-sm text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                id="signup-to-login-link"
                onClick={onNavigateLogin}
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer ml-1 underline decoration-indigo-400/40 underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Bottom Back to Home Button */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
