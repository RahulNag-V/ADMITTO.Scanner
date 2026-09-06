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
import { playFeedbackSound } from '../../lib/sound';
import { AppLogo } from '../../components/common/AppLogo';
import { GoogleIcon } from '../../components/common/GoogleIcon';

interface LoginPageProps {
  initialRole?: 'ADMIN' | 'SCANNER';
  returnTo?: string;
  onLoginSuccess: (session: AuthSession, overrideReturnTo?: string) => void;
  onNavigateHome: () => void;
  onNavigateSignUp: () => void;
  onNavigateForgotPassword: () => void;
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
              playFeedbackSound('success');
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
          // Fallback check: could this be a station account created with an email address?
          try {
            const stationFallback = await authApi.login(cleanInput, password, 'SCANNER');
            if (stationFallback.session) {
              saveSession(stationFallback.session);
              playFeedbackSound('success');
              onLoginSuccess(stationFallback.session, '/scan');
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
        playFeedbackSound('success');

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

        const targetDest = returnTo || (effectiveRole === 'SCANNER' ? '/scan' : '/admin');
        onLoginSuccess(session, targetDest);
      } else {
        // Scanner Referral Code Mode: ONLY Referral Code
        const cleanRefCode = scannerReferralCode.trim().toUpperCase();
        if (!cleanRefCode) {
          throw new Error('Please enter your event referral code.');
        }

        // Verify if user is already logged in
        const currentSession = getSession();
        if (!currentSession || !currentSession.user || !currentSession.user.email) {
          // If NOT logged in: save pending code and trigger Login Required popup modal
          sessionStorage.setItem('pending_referral_code', cleanRefCode);
          setLoading(false);
          setShowLoginRequiredModal(true);
          return;
        }

        // User IS logged in: submit persistent request directly to database
        try {
          await scannerAccessApi.requestAccess(cleanRefCode, currentSession.user.name);
        } catch (reqErr: any) {
          // If already requested or cooldown active, proceed to /scan so gatekeeper displays the live status
          if (!reqErr.message?.includes('already') && !reqErr.message?.includes('cooldown')) {
            throw reqErr;
          }
        }

        playFeedbackSound('success');
        onLoginSuccess(currentSession, '/scan');
      }
    } catch (err: any) {
      playFeedbackSound('error');
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
      playFeedbackSound('click');
      await signInWithGoogle(returnTo);
    } catch (err: any) {
      playFeedbackSound('error');
      setError(err.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div
      id="login-page"
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Left: Small Back to Home Button */}
      <button
        type="button"
        id="login-back-to-home-btn"
        onClick={onNavigateHome}
        className="fixed top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-all cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Home</span>
      </button>

      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[350px] h-[250px] bg-purple-500/15 blur-[100px] rounded-full pointer-events-none" />

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
            {returnTo && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-bold font-mono uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {returnTo.startsWith('/admin')
                    ? 'Login Required to Create or Manage Events'
                    : 'Scanner Authorization Required'}
                </span>
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
              {authMode === 'SUPABASE' ? (returnTo?.startsWith('/admin') ? 'Administrator Sign In' : 'Welcome back') : 'Gate Scanner Login'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {authMode === 'SUPABASE'
                ? (returnTo === '/scan' || initialRole === 'SCANNER'
                    ? 'Sign in with your account or scanner station credentials.'
                    : 'Sign in to create, manage, or scan event access.')
                : 'Enter your event referral code to connect.'}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-white/10 backdrop-blur-2xl">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {authMode === 'SUPABASE' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Email or Station Access Code</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email-input"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="name@company.com or GATE-XXXX"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">Password</label>
                  <button
                    type="button"
                    id="login-forgot-password-link"
                    onClick={onNavigateForgotPassword}
                    className="text-[11px] sm:text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0b0c16] px-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest absolute">
                  or continue with
                </span>
              </div>

              <button
                id="google-login-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-white/[0.05] hover:bg-white/[0.1] active:scale-[0.98] border border-white/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <label htmlFor="scanner-referral-input" className="text-xs font-semibold text-slate-300 block">
                  Event Referral Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="scanner-referral-input"
                    type="text"
                    required
                    placeholder="e.g. GTS26-K7P9"
                    value={scannerReferralCode}
                    onChange={(e) => setScannerReferralCode(e.target.value.toUpperCase())}
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-3.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter the referral code provided by your event organizer to connect as a scanner.
                </p>
              </div>

              <button
                id="scanner-referral-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-purple-500/25 border border-purple-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Connect with Referral Code</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-white/10 space-y-3 text-center">
            {authMode === 'SUPABASE' ? (
              <>
                <p className="text-xs sm:text-sm text-slate-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    id="login-to-signup-link"
                    onClick={onNavigateSignUp}
                    className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer ml-1 underline decoration-indigo-400/40 underline-offset-2"
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
                      playFeedbackSound('click');
                    }}
                    className="text-[11px] text-slate-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Looking for Gate Scanner? Enter Referral Code</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SUPABASE');
                  setError(null);
                  playFeedbackSound('click');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>

      {showLoginRequiredModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border border-purple-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl shadow-purple-500/10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Login Required</span>
              </div>
              <h2 className="text-xl font-black text-white font-['Space_Grotesk'] tracking-tight">
                Sign In to Connect Scanner
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                You must be logged in to your ADMITTO account before connecting to an event with referral code{' '}
                <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
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
                  playFeedbackSound('click');
                }}
                className="w-full py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-purple-500/25 border border-purple-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Go to Login & Continue</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLoginRequiredModal(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
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
