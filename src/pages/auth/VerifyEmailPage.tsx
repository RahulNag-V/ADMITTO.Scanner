import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowLeft, RefreshCw, LogIn, AlertCircle } from 'lucide-react';
import { resendVerificationEmail } from '../../lib/supabaseAuth';
import { playFeedbackSound } from '../../lib/sound';
import { AppLogo } from '../../components/common/AppLogo';

interface VerifyEmailPageProps {
  email: string;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  onChangeEmail?: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  email,
  onNavigateLogin,
  onNavigateHome,
  onChangeEmail,
}) => {
  const [resending, setResending] = useState(false);
  const [resentSuccess, setResentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setError(null);
    setResending(true);
    setResentSuccess(false);

    try {
      await resendVerificationEmail(email);
      playFeedbackSound('success');
      setResentSuccess(true);
      setCooldown(60);

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      playFeedbackSound('error');
      setError(err.message || 'Failed to resend verification link. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      id="verify-email-page"
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Left: Back to Home */}
      <button
        type="button"
        onClick={onNavigateHome}
        className="fixed top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-all cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Home</span>
      </button>

      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[460px] space-y-6 relative z-10 my-auto">
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
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-white/10 backdrop-blur-2xl text-center">
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/10">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
              Verify your email
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              We've sent a verification link to:
            </p>
            <div className="inline-block px-3.5 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 text-indigo-300 font-mono text-xs sm:text-sm font-semibold break-all">
              {email || 'your email'}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              Please check your inbox and click the verification link to activate your ADMITTO account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {resentSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Verification email resent! Please check your spam or inbox.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              id="resend-verification-btn"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              <span>
                {resending
                  ? 'Sending...'
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend verification email'}
              </span>
            </button>

            <button
              type="button"
              id="open-login-btn"
              onClick={onNavigateLogin}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Open Login</span>
            </button>

            {onChangeEmail && (
              <button
                type="button"
                onClick={onChangeEmail}
                className="text-xs text-slate-400 hover:text-indigo-300 transition-colors pt-1 cursor-pointer block mx-auto"
              >
                Entered the wrong email? Change email
              </button>
            )}
          </div>
        </div>

        {/* Bottom Back to Home */}
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
