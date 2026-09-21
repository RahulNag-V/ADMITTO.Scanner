import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  Building,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AuthSession } from '../../types';
import { authApi } from '../../lib/api';

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
  // Profile Form State
  const [name, setName] = useState(session.user.name || '');
  const [phone, setPhone] = useState(session.user.phone || '');
  const [organization, setOrganization] = useState(session.user.organization || '');
  const [bio, setBio] = useState(session.user.bio || '');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

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
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleClose = () => {
    if (isSavingProfile) return;
    setProfileError(null);
    setProfileSuccess(null);
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
                    Manage your personal information and role details
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

            {/* Content Area - Profile Information */}
            <div className="mt-6 relative z-10">
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
                    Your email is uniquely tied to your temporary authentication credentials and tenant identity.
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
