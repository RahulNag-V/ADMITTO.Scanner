import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Database,
  Trash2,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Server,
  Lock,
} from 'lucide-react';
import { AuthSession, EventItem } from '../../types';
import { eventsApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';

interface AdminSettingsPageProps {
  session: AuthSession;
  eventId: string;
  onLogout: () => void;
  onDeleteAccount?: () => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  session,
  eventId,
  onLogout,
  onDeleteAccount,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePermanentPurge = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    setIsDeleting(true);

    try {
      await eventsApi.delete(eventId);
      playFeedbackSound('click');
      alert('Event and associated check-in records were permanently deleted.');
      window.location.reload();
    } catch (err: any) {
      alert(`Error purging event: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-4 max-w-4xl mx-auto">
      {/* 1. Account & Database Health */}
      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
              Database Connectivity & Cloud Engine
            </h2>
            <p className="text-xs text-zinc-300">
              ADMITTO runs on dual-engine synchronization (PostgreSQL Remote Cluster with Automatic In-Memory Cache).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-white/[0.08] border border-white/15 space-y-1 backdrop-blur-md">
            <div className="text-zinc-300">Database Engine</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PostgreSQL Cluster</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.08] border border-white/15 space-y-1 backdrop-blur-md">
            <div className="text-zinc-300">Active RLS Security</div>
            <div className="font-bold text-indigo-400">Multi-Tenant Isolation</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.08] border border-white/15 space-y-1 backdrop-blur-md">
            <div className="text-zinc-300">Admin Session Scope</div>
            <div className="font-bold text-orange-400 font-mono truncate">
              {session.user.id.substring(0, 12)}...
            </div>
          </div>
        </div>
      </div>

      {/* 2. Normal Session Management */}
      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
              Account & Session Management
            </h3>
            <p className="text-xs text-zinc-300">
              Manage your active administrator session or permanently delete your account.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onLogout}
              className="px-4 py-2.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] border border-white/20 text-zinc-100 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
            {onDeleteAccount && (
              <button
                onClick={onDeleteAccount}
                className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Destructive Data Purge Zone */}
      <div className="bg-rose-950/30 border border-rose-500/35 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-300 font-['Space_Grotesk']">
              Permanent Event Data Destruction
            </h3>
            <p className="text-xs text-zinc-200 leading-relaxed">
              Permanently purges this event, all registered attendee rosters, QR/barcode tokens, scanner terminal accounts, and check-in audit history with cascade deletion. This action cannot be reversed.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => {
              setIsDeleteModalOpen(true);
              setDeleteConfirmationText('');
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Logout & Delete Event Data</span>
          </button>
        </div>
      </div>

      {/* Destruction Dual-Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#151822] border border-rose-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold font-['Space_Grotesk']">
                Confirm Cascade Data Purge
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              You are about to permanently delete this event and all associated records from the PostgreSQL database.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">
                To confirm permanent deletion, type <strong className="text-white font-mono">DELETE</strong> below:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText !== 'DELETE' || isDeleting}
                onClick={handlePermanentPurge}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Purge & Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
