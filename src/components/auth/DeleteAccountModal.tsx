import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Trash2, RefreshCw, ShieldAlert } from 'lucide-react';
import { playFeedbackSound } from '../../lib/sound';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  userEmail?: string;
  userName?: string;
  userRole?: 'ADMIN' | 'SCANNER';
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  userEmail = '',
  userName = '',
  userRole = 'ADMIN',
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'DELETE';

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      playFeedbackSound('click');
      await onConfirmDelete();
    } catch (err: any) {
      setError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
      playFeedbackSound('error');
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput('');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="delete-account-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleClose}
        >
          <motion.div
            id="delete-account-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl shadow-red-950/40 relative overflow-hidden my-auto"
          >
            {/* Ambient Red Glow */}
            <div className="absolute -top-24 -right-24 w-52 h-52 bg-red-600/20 rounded-full blur-[90px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title and Scope Details */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Permanent Destruction</span>
              </div>
              <h3 className="text-xl font-black text-white font-['Space_Grotesk']">
                Delete Your Account?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This action is <strong className="text-white">permanent and irreversible</strong>. All your account credentials,
                {userRole === 'ADMIN'
                  ? ' created events, attendee rosters, QR/barcode tokens, scanner terminal accounts, and check-in history'
                  : ' scanner authorizations and verified check-in activity'}{' '}
                will be completely erased from the database.
              </p>
            </div>

            {/* Target Account Pill */}
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Target Identity</div>
              <div className="text-xs font-bold text-zinc-200 truncate">{userName || 'Account'}</div>
              <div className="text-[11px] font-mono text-zinc-400 truncate">{userEmail}</div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 block">
                  To confirm, type <span className="text-red-400 font-mono font-bold">DELETE</span> below:
                </label>
                <input
                  id="delete-account-confirmation-input"
                  type="text"
                  required
                  autoFocus
                  placeholder="Type DELETE to confirm"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-2xl text-sm font-mono font-bold text-white placeholder:text-zinc-600 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmed || isDeleting}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-xs font-bold text-white shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
