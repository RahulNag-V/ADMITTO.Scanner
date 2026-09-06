import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { AppLogo } from '../common/AppLogo';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateLogin: () => void;
  onNavigateSignUp: () => void;
  targetFeatureName?: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  onNavigateLogin,
  onNavigateSignUp,
  targetFeatureName = 'this feature',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="auth-required-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            id="auth-required-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border border-white/15 relative overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <Lock className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Text */}
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk']">
                Sign in required
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                You are currently browsing as a guest. Please sign in or create an account to access{' '}
                <span className="font-semibold text-indigo-300">{targetFeatureName}</span>.
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                id="auth-required-login-btn"
                onClick={() => {
                  onClose();
                  onNavigateLogin();
                }}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                id="auth-required-signup-btn"
                onClick={() => {
                  onClose();
                  onNavigateSignUp();
                }}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create an Account</span>
              </button>
            </div>

            {/* Cancel / Keep Browsing */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Continue browsing as guest
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
