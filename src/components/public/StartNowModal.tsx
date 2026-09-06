import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Smartphone, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface StartNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'ADMIN' | 'SCANNER') => void;
}

export const StartNowModal: React.FC<StartNowModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="start-now-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="start-now-modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto my-auto glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 relative shadow-2xl custom-scrollbar"
          >
            {/* Glow effect */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/25 rounded-full blur-[90px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10 pt-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk'] leading-tight">
                    Choose Access Portal
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your operational role in ADMITTO
                  </p>
                </div>
              </div>
              <button
                id="close-start-modal-btn"
                onClick={onClose}
                className="p-2 rounded-xl glass text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
              {/* Admin Portal */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id="select-admin-role-card"
                onClick={() => onSelectRole('ADMIN')}
                className="group cursor-pointer rounded-2xl p-4 sm:p-5 glass-dark hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/50 transition-all duration-200 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/10">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Admin Console
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                      Manage events, import attendee lists, issue QR/barcode tokens, invite scanner terminals, and track live check-in charts.
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <span>Admin Login / Setup</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Scanner Portal */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id="select-scanner-role-card"
                onClick={() => onSelectRole('SCANNER')}
                className="group cursor-pointer rounded-2xl p-4 sm:p-5 glass-dark hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/50 transition-all duration-200 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-purple-500/10">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                      Gate Scanner
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                      Fast camera scanner terminal for gate staff. Validates QR & barcodes with offline caching & atomic duplicate prevention.
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-purple-400">
                  <span>Enter Access Code</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </div>

            {/* Production Onboarding Guidance */}
            <div className="glass-dark rounded-2xl p-3.5 sm:p-4 text-xs text-slate-400 space-y-1.5 border border-white/5 relative z-10">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Production Event Launch Workflow</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Register as an organizer to create your event, upload attendee rosters with auto-generated QR/barcode tokens, provision gate terminals, and track live check-in telemetry.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
