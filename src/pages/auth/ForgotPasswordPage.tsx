import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Lock, Eye, EyeOff, RefreshCw, Send, ShieldCheck, Clock } from 'lucide-react';
import { authApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { AppLogo } from '../../components/common/AppLogo';

interface ForgotPasswordPageProps {
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateLogin,
  onNavigateHome,
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request_code' | 'verify_code' | 'success'>('request_code');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.sendPasswordResetCode(email.trim());
      setCooldown(res.cooldownSeconds || 60);
      setStatusMessage(res.message || `A confidential verification code has been dispatched to ${email.trim()}`);
      playFeedbackSound('success');
      setStep('verify_code');
    } catch (err: any) {
      if (err.remainingSeconds) {
        setCooldown(err.remainingSeconds);
      }
      playFeedbackSound('error');
      setError(err.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the 6-digit verification code sent to your email.');
      playFeedbackSound('error');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      playFeedbackSound('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please verify and re-enter.');
      playFeedbackSound('error');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPasswordWithCode(email.trim(), cleanCode, newPassword);
      playFeedbackSound('success');
      setStep('success');
    } catch (err: any) {
      playFeedbackSound('error');
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="forgot-password-page"
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
              {step === 'verify_code' ? 'Verify Code & Reset Password' : 'Reset your password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {step === 'verify_code'
                ? `Enter the 6-digit verification code sent to ${email}`
                : 'Enter your email to receive a secure 6-digit verification code'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-white/10 backdrop-blur-2xl">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 'success' ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-white">Password Updated Successfully</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your password has been reset securely. You can now log in with your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="forgot-return-login-btn"
                  onClick={onNavigateLogin}
                  className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : step === 'verify_code' ? (
            <form onSubmit={handleResetWithCode} className="space-y-4">
              {statusMessage && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Confidential Delivery Notice (Code is never displayed on screen) */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Confidential Code Dispatched</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      Check Your Inbox
                    </span>
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    A confidential 6-digit code has been sent to <strong className="text-white">{email}</strong>. For your security, this code expires in 15 minutes.
                  </p>
                </div>
              </div>

              {/* Code Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">Verification Code</label>
                  <span className="text-[10px] text-indigo-300 font-mono">6-digit code</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-code-input"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 592817"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-new-password-input"
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Confirm New Password</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-confirm-password-input"
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="reset-password-submit-btn"
                type="submit"
                disabled={loading || !code.trim() || !newPassword}
                className="w-full py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code & Resetting...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep('request_code')}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Change email address
                </button>
                <button
                  type="button"
                  id="forgot-resend-code-btn"
                  disabled={loading || cooldown > 0}
                  onClick={handleSendCode}
                  className="text-xs text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium flex items-center gap-1.5"
                >
                  {cooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span>Resend in {cooldown}s</span>
                    </>
                  ) : (
                    <span>Resend code</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Account Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              <button
                id="send-reset-code-btn"
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Clock className="w-4 h-4 text-indigo-300 animate-pulse" />
                    <span>Wait {cooldown}s to Resend</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                >
                  Remember your password? Sign in
                </button>
              </div>
            </form>
          )}
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
