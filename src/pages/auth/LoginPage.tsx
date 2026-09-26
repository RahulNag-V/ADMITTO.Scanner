import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  LogIn,
  KeyRound,
  Shield,
  Smartphone,
  Sparkles,
  User,
} from 'lucide-react';
import { signInWithEmail, signInWithGoogle, signOut } from '../../lib/supabaseAuth';
import { authApi, scannerAccessApi, saveSession, getSession } from '../../lib/api';
import { AuthSession, UserRole } from '../../types';
import { AppLogo } from '../../components/common/AppLogo';
import { GoogleIcon } from '../../components/common/GoogleIcon';

interface LoginPageProps {
  initialRole?: 'ADMIN' | 'SCANNER';
  returnTo?: string;
  onLoginSuccess: (session: AuthSession, overrideReturnTo?: string) => void;
  onNavigateHome: () => void;
  onNavigateSignUp: () => void;
  onNavigateForgotPassword?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialRole = 'ADMIN',
  returnTo,
  onLoginSuccess,
  onNavigateHome,
  onNavigateSignUp,
  onNavigateForgotPassword,
}) => {
  // Mode: 'SUPABASE' (default unified login) or 'SCANNER_CODE' (direct referral code login)
  const [authMode, setAuthMode] = useState<'SUPABASE' | 'SCANNER_CODE'>(
    initialRole === 'SCANNER' ? 'SCANNER_CODE' : 'SUPABASE'
  );

  // Form states (Admin / Station)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Scanner referral code state (ONLY referral code is entered)
  const [scannerReferralCode, setScannerReferralCode] = useState(() => {
    return sessionStorage.getItem('pending_referral_code') || '';
  });
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email/Password Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'SUPABASE') {
        const cleanInput = email.trim();
        if (!cleanInput || !password) {
          throw new Error('Please enter both your email/access code and password.');
        }

        // 1. Direct Station Account Check (e.g. GATE-XXXX or non-email identifier)
        if (cleanInput.toUpperCase().startsWith('GATE-') || !cleanInput.includes('@')) {
          try {
            const stationRes = await authApi.login(cleanInput.toUpperCase(), password, 'SCANNER');
            if (stationRes.session) {
              saveSession(stationRes.session);
              onLoginSuccess(stationRes.session, '/scan');
              return;
            }
          } catch (stationErr: any) {
            throw new Error(stationErr.message || 'Invalid scanner station credentials.');
          }
        }

        // 2. Standard Supabase Account Authentication
        let authResult: any = null;
        try {
          authResult = await signInWithEmail(cleanInput, password);
        } catch (supaErr: any) {
          // Fallback check 1: could this be a station account created with an email address?
          try {
            const stationFallback = await authApi.login(cleanInput, password, 'SCANNER');
            if (stationFallback.session) {
              saveSession(stationFallback.session);
              onLoginSuccess(stationFallback.session, '/scan');
              return;
            }
          } catch {
            // Check fallback 2
          }

          // Fallback check 2: backend verified admin account
          try {
            const adminFallback = await authApi.login(cleanInput, password, 'ADMIN');
            if (adminFallback.session) {
              const sanitizedReturnTo = returnTo === '/events' ? '/admin' : returnTo;
              onLoginSuccess(adminFallback.session, sanitizedReturnTo || '/admin');
              return;
            }
          } catch {
            // Re-throw original Supabase error
          }
          throw supaErr;
        }

        if (!authResult?.user) {
          throw new Error('Failed to retrieve user session.');
        }

        // Build initial ADMITTO session
        const fullName =
          authResult.user.user_metadata?.full_name ||
          authResult.user.user_metadata?.name ||
          authResult.user.email?.split('@')[0] ||
          'User';

        let effectiveRole: UserRole = initialRole === 'SCANNER' ? 'SCANNER' : 'ADMIN';
        let effectiveUserId = authResult.user.id;

        // Temporarily save session so authApi.me has token available
        const tempSession: AuthSession = {
          token: authResult.session?.access_token || '',
          user: {
            id: effectiveUserId,
            email: authResult.user.email || cleanInput,
            name: fullName,
            role: effectiveRole,
          },
        };
        saveSession(tempSession);

        // Fetch authoritative profile from backend
        try {
          const meRes = await authApi.me();
          if (meRes?.user) {
            effectiveRole = meRes.user.role;
            effectiveUserId = meRes.user.id;
          }
        } catch (meErr) {
          console.warn('[LoginPage] authApi.me check note:', meErr);
        }

        const session: AuthSession = {
          token: authResult.session?.access_token || '',
          user: {
            id: effectiveUserId,
            email: authResult.user.email || cleanInput,
            name: fullName,
            role: effectiveRole,
          },
        };

        saveSession(session);

        // Check if there was a pending referral code from scanner mode
        const pendingRef = sessionStorage.getItem('pending_referral_code') || scannerReferralCode.trim().toUpperCase();
        if (pendingRef) {
          sessionStorage.removeItem('pending_referral_code');
          try {
            await scannerAccessApi.requestAccess(pendingRef, session.user.name);
          } catch (scanErr: any) {
            console.warn('Auto scanner referral redeem note:', scanErr);
          }
        }

        const sanitizedReturnTo = returnTo === '/events' ? '/admin' : returnTo;
        const targetDest = sanitizedReturnTo || (effectiveRole === 'SCANNER' ? '/scan' : '/admin');
        onLoginSuccess(session, targetDest);
      } else {
        // Scanner Login: ONLY admin-generated email and referral code
        const cleanEmail = email.trim().toLowerCase();
        const cleanRefCode = scannerReferralCode.trim().toUpperCase();

        if (!cleanEmail) {
          throw new Error('Please enter your admin-generated scanner email.');
        }
        if (!cleanRefCode) {
          throw new Error('Please enter your event referral code.');
        }

        const res = await authApi.scannerReferralLogin(cleanEmail, cleanRefCode);
        if (res.session) {
          saveSession(res.session);
          onLoginSuccess(res.session, '/scan');
          return;
        }
        throw new Error('Failed to establish scanner session. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle(returnTo);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div
      id="login-page"
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden bg-[#10232D] selection:bg-[#FFE3A6] selection:text-[#10232D]"
    >
      {/* Top Left: Back to Home Button */}
      <button
        type="button"
        id="login-back-to-home-btn"
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
            {returnTo && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B303A] border border-[#FFE3A6]/30 text-[#FFE3A6] text-[10px] sm:text-[11px] font-semibold font-mono uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                <span>
                  {returnTo.startsWith('/admin')
                    ? 'Login Required to Create or Manage Events'
                    : 'Scanner Authorization Required'}
                </span>
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-[#ECEEF0] tracking-tight">
              {authMode === 'SUPABASE' ? (returnTo?.startsWith('/admin') ? 'Administrator Sign In' : 'Welcome back') : 'Gate Scanner Login'}
            </h1>
            <p className="text-xs sm:text-sm text-[#8A9BA8]">
              {authMode === 'SUPABASE'
                ? (returnTo === '/scan' || initialRole === 'SCANNER'
                    ? 'Sign in with your account or scanner station credentials.'
                    : 'Sign in to create, manage, or scan event access.')
                : 'Enter your admin-generated scanner email and event referral code to connect.'}
            </p>
          </div>
        </div>

        <div className="bg-[#1B303A] rounded-2xl p-6 sm:p-8 space-y-5 border border-[#314A56]">
          {error && (
            <div className="p-3.5 rounded-lg bg-[#E255A2]/10 border border-[#E255A2]/30 text-[#E255A2] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E255A2]" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {authMode === 'SUPABASE' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#ECEEF0] block">Email or Station Access Code</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email-input"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="name@company.com or GATE-XXXX"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-4 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#ECEEF0] block">Password</label>
                  {onNavigateForgotPassword && (
                    <button
                      type="button"
                      id="login-forgot-password-link"
                      onClick={onNavigateForgotPassword}
                      className="text-[11px] sm:text-xs text-[#FFE3A6] hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A9BA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-10 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8A9BA8] hover:text-[#ECEEF0] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#FFE3A6] hover:bg-[#fff0cb] active:scale-[0.99] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#10232D]/30 border-t-[#10232D] rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to ADMITTO</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center pt-2">
                <div className="border-t border-[#314A56] w-full" />
                <span className="bg-[#1B303A] px-3 text-[11px] font-mono text-[#8A9BA8] uppercase tracking-widest absolute">
                  or continue with
                </span>
              </div>

              <button
                id="google-login-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 rounded-lg text-xs sm:text-sm font-semibold text-[#ECEEF0] bg-[#10232D] hover:bg-[#152834] border border-[#314A56] transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#ECEEF0]/30 border-t-[#ECEEF0] rounded-full animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-4 h-4" />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="scanner-email-input" className="text-xs font-medium text-[#ECEEF0] block">
                  Admin-Generated Scanner Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#E4A0B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="scanner-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="e.g. scanner-main-gate@event.admitto.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-4 py-3 text-xs sm:text-sm text-[#ECEEF0] placeholder-[#8A9BA8]/50 focus:outline-none focus:border-[#E4A0B3] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#8A9BA8]">
                  Enter the scanner email created by the event administrator.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="scanner-referral-input" className="text-xs font-medium text-[#ECEEF0] block">
                  Event Referral Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#E4A0B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="scanner-referral-input"
                    type="text"
                    required
                    placeholder="e.g. GTS26-K7P9"
                    value={scannerReferralCode}
                    onChange={(e) => setScannerReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#0C1B23] border border-[#314A56] rounded-lg pl-10 pr-4 py-3 text-xs sm:text-sm text-[#ECEEF0] font-mono placeholder-[#8A9BA8]/50 uppercase tracking-wider focus:outline-none focus:border-[#E4A0B3] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#8A9BA8]">
                  Enter the referral code provided for this event.
                </p>
              </div>

              <button
                id="scanner-referral-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#E4A0B3] hover:bg-[#ebafbf] active:scale-[0.99] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#10232D]/30 border-t-[#10232D] rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Connect to Scanner Terminal</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-[#314A56] space-y-3 text-center">
            {authMode === 'SUPABASE' ? (
              <>
                <p className="text-xs sm:text-sm text-[#8A9BA8]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    id="login-to-signup-link"
                    onClick={onNavigateSignUp}
                    className="font-semibold text-[#FFE3A6] hover:underline transition-colors cursor-pointer ml-1"
                  >
                    Create an account
                  </button>
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('SCANNER_CODE');
                      setError(null);
                    }}
                    className="text-[11px] text-[#8A9BA8] hover:text-[#E4A0B3] transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Looking for Gate Scanner? Sign in with Scanner Email & Referral Code</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SUPABASE');
                  setError(null);
                }}
                className="text-xs text-[#FFE3A6] hover:underline font-medium transition-colors cursor-pointer"
              >
                ← Back to ADMITTO Account Login
              </button>
            )}
          </div>
        </div>

        <div className="text-center pt-2">
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

      {showLoginRequiredModal && (
        <div className="fixed inset-0 z-50 bg-[#10232D]/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1B303A] border border-[#314A56] rounded-2xl p-6 sm:p-7 space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#10232D] border border-[#314A56] flex items-center justify-center text-[#FFE3A6]">
              <Shield className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10232D] border border-[#FFE3A6]/30 text-[#FFE3A6] text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                <span>Login Required</span>
              </div>
              <h2 className="text-xl font-bold text-[#ECEEF0] tracking-tight">
                Sign In to Connect Scanner
              </h2>
              <p className="text-xs text-[#8A9BA8] leading-relaxed max-w-sm mx-auto">
                You must be logged in to your ADMITTO account before connecting to an event with referral code{' '}
                <span className="font-mono font-bold text-[#FFE3A6] bg-[#10232D] px-1.5 py-0.5 rounded border border-[#314A56]">
                  {scannerReferralCode.trim() || 'CODE'}
                </span>
                . Please log in or create an account to proceed.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                id="modal-redirect-to-login-btn"
                onClick={() => {
                  sessionStorage.setItem('pending_referral_code', scannerReferralCode.trim().toUpperCase());
                  setShowLoginRequiredModal(false);
                  setAuthMode('SUPABASE');
                }}
                className="w-full py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#FFE3A6] hover:bg-[#fff0cb] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Go to Login & Continue</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLoginRequiredModal(false)}
                className="w-full py-2.5 rounded-lg text-xs font-medium text-[#8A9BA8] hover:text-[#ECEEF0] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
