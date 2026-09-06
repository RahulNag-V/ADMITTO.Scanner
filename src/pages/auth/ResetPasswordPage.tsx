import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Key } from 'lucide-react';
import { updatePassword } from '../../lib/supabaseAuth';
import { playFeedbackSound } from '../../lib/sound';
import { AppLogo } from '../../components/common/AppLogo';

interface ResetPasswordPageProps {
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigateLogin,
  onNavigateHome,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [updatedSuccess, setUpdatedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await updatePassword(newPassword);
      playFeedbackSound('success');
      setUpdatedSuccess(true);
    } catch (err: any) {
      playFeedbackSound('error');
      setError(err.message || 'Failed to update password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="reset-password-page"
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
              Set new password
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Create a new secure password for your ADMITTO account
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

          {updatedSuccess ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-white">Password Updated!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
                >
                  Sign In with New Password
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="new-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="confirm-new-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="update-password-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
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
