import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react';

export interface PopupOptions {
  title?: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface PopupDetail extends PopupOptions {
  isConfirm: boolean;
  message: string;
  resolve: (value: boolean) => void;
}

/**
 * Global helper to trigger a custom popup alert anywhere in the application.
 */
export const showAlert = (message: string, options?: PopupOptions): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    window.dispatchEvent(
      new CustomEvent<PopupDetail>('admitto:popup', {
        detail: {
          isConfirm: false,
          message,
          title: options?.title || (options?.type === 'error' ? 'Error' : options?.type === 'warning' ? 'Warning' : options?.type === 'success' ? 'Success' : 'Notice'),
          type: options?.type || (options?.isDestructive ? 'error' : 'info'),
          confirmText: options?.confirmText || 'Got It',
          isDestructive: options?.isDestructive || false,
          resolve: () => resolve(),
        },
      })
    );
  });
};

/**
 * Global helper to trigger a custom popup confirmation dialog anywhere in the application.
 */
export const showConfirm = (message: string, options?: PopupOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    window.dispatchEvent(
      new CustomEvent<PopupDetail>('admitto:popup', {
        detail: {
          isConfirm: true,
          message,
          title: options?.title || 'Confirmation Required',
          type: options?.type || (options?.isDestructive ? 'error' : 'warning'),
          confirmText: options?.confirmText || (options?.isDestructive ? 'Delete' : 'Confirm'),
          cancelText: options?.cancelText || 'Cancel',
          isDestructive: options?.isDestructive || false,
          resolve: (val: boolean) => resolve(val),
        },
      })
    );
  });
};

/**
 * Premium glassmorphic popup modal that replaces browser alert() and confirm() dialogs.
 */
export const PopupModal: React.FC = () => {
  const [currentPopup, setCurrentPopup] = useState<PopupDetail | null>(null);

  useEffect(() => {
    const handlePopupEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PopupDetail>;
      if (customEvent.detail) {
        setCurrentPopup(customEvent.detail);
      }
    };

    window.addEventListener('admitto:popup', handlePopupEvent);

    // Gracefully route any legacy window.alert calls to the custom popup modal
    const originalAlert = window.alert;
    window.alert = (msg: any) => {
      showAlert(String(msg ?? ''));
    };

    return () => {
      window.removeEventListener('admitto:popup', handlePopupEvent);
      window.alert = originalAlert;
    };
  }, []);

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (currentPopup) {
        currentPopup.resolve(confirmed);
        setCurrentPopup(null);
      }
    },
    [currentPopup]
  );

  useEffect(() => {
    if (!currentPopup) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(false);
      } else if (e.key === 'Enter') {
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPopup, handleClose]);

  if (!currentPopup || typeof document === 'undefined') return null;

  const { isConfirm, message, title, type, confirmText, cancelText, isDestructive } = currentPopup;

  const renderIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Info className="w-5 h-5 text-orange-400" />;
    }
  };

  const getIconContainerStyle = () => {
    switch (type) {
      case 'error':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
      case 'warning':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'success':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-orange-500/15 border-orange-500/30 text-orange-400';
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admitto-popup-title"
      className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => handleClose(false)}
    >
      <div
        className="bg-[#0f131f] border border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_30px_80px_rgba(0,0,0,0.95)] space-y-5 animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 blur-[1px] ${
            type === 'error'
              ? 'bg-gradient-to-r from-transparent via-rose-500 to-transparent'
              : type === 'warning'
              ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent'
              : type === 'success'
              ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
              : 'bg-gradient-to-r from-transparent via-orange-500 to-transparent'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${getIconContainerStyle()}`}>
              {renderIcon()}
            </div>
            <div>
              <h3 id="admitto-popup-title" className="text-base sm:text-lg font-bold text-white font-['Space_Grotesk'] leading-tight">
                {title}
              </h3>
              <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mt-0.5">
                ADMITTO System Alert
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto pr-1 bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
          {message}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          {isConfirm && (
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 hover:text-white font-semibold text-xs transition-all cursor-pointer border border-white/10"
            >
              {cancelText || 'Cancel'}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => handleClose(true)}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5 ${
              isDestructive
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
                : type === 'warning'
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 text-black'
                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
            } ${!isConfirm ? 'w-full' : ''}`}
          >
            <span>{confirmText || 'OK'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
