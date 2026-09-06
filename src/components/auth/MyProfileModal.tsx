import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  Building,
  FileText,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Send,
  ArrowLeft,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { AuthSession } from '../../types';
import { authApi } from '../../lib/api';
import { updatePassword as updateSupabasePassword } from '../../lib/supabaseAuth';
import { playFeedbackSound } from '../../lib/sound';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthSession;
  onProfileUpdated: (updatedUser: AuthSession['user']) => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  session,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form State
  const [name, setName] = useState(session.user.name || '');
  const [phone, setPhone] = useState(session.user.phone || '');
  const [organization, setOrganization] = useState(session.user.organization || '');
  const [bio, setBio] = useState(session.user.bio || '');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security / Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Email Reset Code Flow State (if current password is forgotten)
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSentSuccess, setCodeSentSuccess] = useState(false);
  const [isResettingWithCode, setIsResettingWithCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError('Full name is required.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        organization: organization.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      const updatedUser: AuthSession['user'] = {
        ...session.user,
        name: res.user?.name || name.trim(),
        phone: phone.trim() || undefined,
        organization: organization.trim() || undefined,
        bio: bio.trim() || undefined,
      };

      onProfileUpdated(updatedUser);
      setProfileSuccess('Your profile details have been updated successfully.');
      playFeedbackSound('success');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile. Please try again.');
      playFeedbackSound('error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify and re-enter.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // 1. Try local server endpoint
      await authApi.changePassword(currentPassword, newPassword);

      // 2. Also sync to Supabase if connected
      try {
        await updateSupabasePassword(newPassword);
      } catch {
        // Supabase client may not be in active recovery/session, local server holds authority
      }

      setPasswordSuccess('Password has been changed securely. Use your new password on next sign-in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      playFeedbackSound('success');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Could not update password. Please check your current password.');
      playFeedbackSound('error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendResetCode = async () => {
    if (cooldown > 0) return;
    setIsSendingCode(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await authApi.sendPasswordResetCode(session.user.email);
      setCodeSentSuccess(true);
      setCooldown(res.cooldownSeconds || 60);
      setPasswordSuccess(res.message || `A confidential verification code starting with ADMITTO has been dispatched to ${session.user.email}. Please check your inbox.`);
      playFeedbackSound('success');
    } catch (err: any) {
      if (err.remainingSeconds) {
        setCooldown(err.remainingSeconds);
      }
      setPasswordError(err.message || 'Failed to dispatch verification code to your email.');
      playFeedbackSound('error');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const cleanCode = resetCode.trim().toUpperCase();
    if (!cleanCode.startsWith('ADMITTO')) {
      setPasswordError('Verification code must start with "ADMITTO" (e.g. ADMITTO9879).');
      playFeedbackSound('error');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      playFeedbackSound('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify and re-enter.');
      playFeedbackSound('error');
      return;
    }

    setIsResettingWithCode(true);
    try {
      await authApi.resetPasswordWithCode(session.user.email, cleanCode, newPassword);
      try {
        await updateSupabasePassword(newPassword);
      } catch {
        // Fallback
      }

      setPasswordSuccess('Password successfully reset using verification code! Use your new password on next login.');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setCodeSentSuccess(false);
      setIsForgotMode(false);
      playFeedbackSound('success');
      setTimeout(() => setPasswordSuccess(null), 6000);
    } catch (err: any) {
      setPasswordError(err.message || 'Invalid or expired verification code. Please request a new code.');
      playFeedbackSound('error');
    } finally {
      setIsResettingWithCode(false);
    }
  };

  const handleClose = () => {
    if (isSavingProfile || isUpdatingPassword || isResettingWithCode) return;
    setProfileError(null);
    setProfileSuccess(null);
    setPasswordError(null);
    setPasswordSuccess(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="my-profile-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={handleClose}
        >
          <motion.div
            id="my-profile-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-slate-950 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 relative overflow-hidden my-auto"
          >
            {/* Ambient Aurora Glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-5 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                    session.user.role === 'ADMIN'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/25'
                      : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/25'
                  }`}
                >
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">My Profile</h2>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold ${
                        session.user.role === 'ADMIN'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      }`}
                    >
                      {session.user.role === 'ADMIN' ? 'Admin' : 'Scanner Operator'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage your personal information, role details, and security
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="my-profile-close-btn"
                onClick={handleClose}
                className="p-2 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mt-5 p-1 bg-white/[0.04] border border-white/10 rounded-2xl relative z-10">
              <button
                type="button"
                id="profile-tab-btn"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-white text-slate-900 shadow-md shadow-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile Information</span>
              </button>
              <button
                type="button"
                id="security-tab-btn"
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-white text-slate-900 shadow-md shadow-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="mt-6 relative z-10">
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {profileSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Full Name</span>
                    </label>
                    <input
                      id="profile-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                    />
                  </div>

                  {/* Email Address - STRICTLY IMMUTABLE & READ-ONLY */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email Address</span>
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Lock className="w-2.5 h-2.5" />
                        Cannot be changed
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="profile-email-input"
                        type="email"
                        value={session.user.email}
                        disabled
                        readOnly
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-slate-400 text-sm cursor-not-allowed select-none pl-10"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your email is uniquely tied to your authentication credentials and tenant identity.
                    </p>
                  </div>

                  {/* Phone & Organization Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Phone Number</span>
                      </label>
                      <input
                        id="profile-phone-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Organization / Dept</span>
                      </label>
                      <input
                        id="profile-org-input"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. Operations / Security"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Bio / Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>About / Bio</span>
                    </label>
                    <textarea
                      id="profile-bio-input"
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief note or operator description..."
                      className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="save-profile-btn"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-white/10 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4">
                  {passwordSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {/* FORGOT PASSWORD CODE FLOW (When user forgot current password) */}
                  {isForgotMode ? (
                    <form onSubmit={handleResetWithCode} className="space-y-4">
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-indigo-400" />
                            <span>Reset Password via Email Verification Code</span>
                          </span>
                          <button
                            type="button"
                            id="back-to-standard-pass-btn"
                            onClick={() => {
                              setIsForgotMode(false);
                              setPasswordError(null);
                            }}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>Use Current Password</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          We will send a secure verification code formatted like{' '}
                          <span className="font-mono font-bold text-indigo-200 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                            ADMITTO9879
                          </span>{' '}
                          to your email (<span className="text-white font-semibold">{session.user.email}</span>).
                        </p>
                      </div>

                      {/* Send Code Trigger / Resend */}
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-xs text-slate-300">
                          {codeSentSuccess ? (
                            <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verification code sent to {session.user.email}</span>
                            </span>
                          ) : (
                            <span>Click to receive your code on {session.user.email}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          id="send-profile-reset-code-btn"
                          disabled={isSendingCode || cooldown > 0}
                          onClick={handleSendResetCode}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                        >
                          {isSendingCode ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : cooldown > 0 ? (
                            <>
                              <Clock className="w-3 h-3 text-indigo-300 animate-pulse" />
                              <span>Resend in {cooldown}s</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>{codeSentSuccess ? 'Resend Code' : 'Send Code to Email'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Confidential Email Delivery Notice (Code is never displayed on screen) */}
                      {codeSentSuccess && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
                          <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-white flex items-center gap-1.5">
                              <span>Confidential Security Code Sent</span>
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                Check Inbox
                              </span>
                            </p>
                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              We sent your confidential verification code starting with <strong className="text-white font-mono">ADMITTO</strong> to <strong className="text-white">{session.user.email}</strong>. For account privacy, the code is strictly confidential and is only viewable in your email.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Code Input (Must start with ADMITTO) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Verification Code</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Format: ADMITTO + digits
                          </span>
                        </label>
                        <input
                          id="profile-reset-code-input"
                          type="text"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                          placeholder="e.g. ADMITTO9879"
                          required
                          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm font-mono tracking-wider placeholder-slate-500 transition-colors uppercase"
                        />
                      </div>

                      {/* New Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>New Password</span>
                        </label>
                        <div className="relative">
                          <input
                            id="code-new-password-input"
                            type={showNewPass ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Confirm New Password</span>
                        </label>
                        <div className="relative">
                          <input
                            id="code-confirm-password-input"
                            type={showConfirmPass ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your new password"
                            required
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotMode(false);
                            setPasswordError(null);
                          }}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          id="verify-and-reset-password-btn"
                          disabled={isResettingWithCode || !resetCode.trim() || !newPassword}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer"
                        >
                          {isResettingWithCode ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying & Resetting...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Verify Code & Reset Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* STANDARD PASSWORD CHANGE (With Current Password) */
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {/* Current Password */}
                      {session.user.role === 'ADMIN' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                              <span>Current Password</span>
                            </label>
                            <button
                              type="button"
                              id="forgot-current-pass-btn"
                              onClick={() => {
                                setIsForgotMode(true);
                                setPasswordError(null);
                                setPasswordSuccess(null);
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-medium"
                            >
                              Forgot current password?
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              id="current-password-input"
                              type={showCurrentPass ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter your current password"
                              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPass(!showCurrentPass)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* New Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>New Password</span>
                        </label>
                        <div className="relative">
                          <input
                            id="new-password-input"
                            type={showNewPass ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Confirm New Password</span>
                        </label>
                        <div className="relative">
                          <input
                            id="confirm-password-input"
                            type={showConfirmPass ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your new password"
                            required
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/15 focus:border-indigo-500/70 focus:outline-none text-white text-sm placeholder-slate-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          id="update-password-btn"
                          disabled={isUpdatingPassword || !newPassword}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer"
                        >
                          {isUpdatingPassword ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Update Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
