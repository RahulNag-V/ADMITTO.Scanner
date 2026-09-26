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
  ShieldCheck,
} from 'lucide-react';
import { signUpWithEmail, signInWithGoogle } from '../../lib/supabaseAuth';
import { saveSession, authApi } from '../../lib/api';
import { AuthSession } from '../../types';
import { AppLogo } from '../../components/common/AppLogo';
import { GoogleIcon } from '../../components/common/GoogleIcon';

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth Sign Up / Create Account Handler
  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle(returnTo);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = phone.trim();
    if (cleanPhone && cleanPhone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
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

      // 1. Register with backend API to create active profile and session immediately
      let session: AuthSession | null = null;
      try {
        const regRes = await authApi.register(cleanName, cleanEmail, password, cleanPhone);
        if (regRes?.session) {
          session = regRes.session;
        }
      } catch (apiErr: any) {
        if (apiErr.status === 409 || apiErr.message?.toLowerCase().includes('already exists')) {
          setError('An account with this email already exists. Try signing in instead.');
          setLoading(false);
          return;
        }
      }

      // 2. Also register via Supabase Auth so it is present in Supabase Auth
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
          setError('An account with this email already exists. Try signing in instead.');
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
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden bg-[#10232D] selection:bg-[#FFE3A6] selection:text-[#10232D]"
    >
      {/* Top Left: Back to Home Button */}
      <button
        type="button"
        id="signup-back-to-home-btn"
        onClick={onNavigateHome}
        className="fixed top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 text-xs font-medium text-[#ECEEF0] transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#8A9BA8] group-hover:text-[#ECEEF0] group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Home</span>
      </button>

      {/* Main Container */}
      <div className="w-full max-w-[440px] space-y-6 relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div
            onClick={onNavigateHome}
            className="inline-flex items-center gap-3 cursor-pointer group justify-center"
          >
            <AppLogo size="md" className="group-hover:scale-105" />
            <span className="text-2xl sm:text-3xl font-bold text-[#ECEEF0] tracking-tight">
              ADMITTO
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#ECEEF0] tracking-tight">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-[#8A9BA8]">
              Get started with enterprise digital event access
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#1B303A] rounded-2xl p-6 sm:p-8 space-y-5 border border-[#314A56]">
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-lg bg-[#E255A2]/10 border border-[#E255A2]/30 text-[#E255A2] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E255A2]" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Primary Quick Google Sign-Up Button */}
          <button
            id="google-signup-btn"
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#ECEEF0] bg-[#10232D] hover:bg-[#152834] active:scale-[0.99] border border-[#314A56] transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 group"
          >
            {googleLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#ECEEF0]/30 border-t-[#ECEEF0] rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4" />
                <span>Sign up with Google</span>
              </>
            )}
          </button>

          {/* Elegant Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-[#314A56] w-full" />
            <span className="bg-[#1B303A] px-3 text-[11px] font-mono text-[#8A9BA8] uppercase tracking-wider absolute">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="signup-name-input" className="text-xs font-medium text-[#ECEEF0] block">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-4 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="signup-email-input" className="text-xs font-medium text-[#ECEEF0] block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-4 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="signup-phone-input" className="text-xs font-medium text-[#ECEEF0] flex items-center justify-between">
                <span>Phone Number</span>
                <span className="text-[11px] font-normal text-[#8A9BA8]">Optional</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-phone-input"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-4 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="signup-password-input" className="text-xs font-medium text-[#ECEEF0] block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-10 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8A9BA8] hover:text-[#ECEEF0] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="signup-confirm-password-input" className="text-xs font-medium text-[#ECEEF0] block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-10 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8A9BA8] hover:text-[#ECEEF0] transition-colors cursor-pointer"
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
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#FFE3A6] hover:bg-[#fff0cb] active:scale-[0.99] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#10232D]/30 border-t-[#10232D] rounded-full animate-spin" />
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
          <div className="pt-2 border-t border-[#314A56] text-center">
            <p className="text-xs sm:text-sm text-[#8A9BA8]">
              Already have an account?{' '}
              <button
                type="button"
                id="signup-to-login-link"
                onClick={onNavigateLogin}
                className="font-semibold text-[#FFE3A6] hover:underline transition-colors cursor-pointer ml-1"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Security assurance */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-[#8A9BA8]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FFE3A6]" />
          <span>256-bit encrypted SSL & secure OAuth 2.0 authentication</span>
        </div>

        {/* Bottom Back to Home Button */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs text-[#8A9BA8] hover:text-[#ECEEF0] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

