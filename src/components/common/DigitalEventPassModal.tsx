import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { Copy, Check, Printer, X, Download } from 'lucide-react';
import { Student } from '../../types';
import { playFeedbackSound } from '../../lib/sound';

interface DigitalEventPassModalProps {
  student: Student | null;
  onClose: () => void;
}

export const DigitalEventPassModal: React.FC<DigitalEventPassModalProps> = ({
  student,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (student) {
      const qrPayload = student.qr_code || student.qr_token || `ADM-${student.usn}`;
      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
        });
    }
  }, [student]);

  if (!student || typeof document === 'undefined') return null;

  const handleCopy = (text?: string) => {
    const val = text || student.qr_code || student.qr_token || student.usn;
    navigator.clipboard.writeText(val);
    setCopied(true);
    playFeedbackSound('click');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    playFeedbackSound('click');
    window.print();
  };

  const tokenValue = student.qr_code || student.qr_token || student.barcode || student.usn;

  return createPortal(
    <AnimatePresence>
      <div
        id="digital-event-pass-modal"
        className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#12141c] border border-white/20 rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-5 shadow-[0_25px_80px_rgba(0,0,0,0.9)] relative z-[100000] my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#f97316] tracking-wider font-mono">
              DIGITAL EVENT PASS
            </span>
            <button
              id="close-pass-modal-btn"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Visual Pass Inner Card */}
          <div className="bg-gradient-to-b from-[#181b28] to-[#10121a] border border-white/[0.08] rounded-3xl p-6 space-y-5 text-center shadow-xl">
            {/* Student Info */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white tracking-tight font-['Space_Grotesk']">
                {student.name}
              </h3>
              <div className="text-xs font-mono font-bold text-[#f97316] tracking-wide">
                {student.usn}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {student.branch || 'General'} • {student.year?.startsWith('Year') ? student.year : `Year ${student.year || '3rd Year'}`}
              </div>
            </div>

            {/* QR Code Frame */}
            <div className="bg-white p-3.5 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-md">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${student.name}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 animate-pulse">Generating QR...</span>
                </div>
              )}
            </div>

            {/* Barcode Strip */}
            <div className="bg-[#0b0d14] border border-white/[0.06] rounded-2xl py-2.5 px-3 text-center">
              <div className="font-mono text-sm tracking-widest text-slate-200 font-bold select-none">
                ||| | | |||| | ||| | ||
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="copy-pass-token-btn"
              onClick={() => handleCopy(tokenValue)}
              className="py-3 px-4 rounded-2xl bg-[#1e2330] hover:bg-[#282f42] text-xs font-bold text-slate-200 flex items-center justify-center gap-2 border border-white/5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copy Token</span>
                </>
              )}
            </button>

            <button
              id="print-pass-badge-btn"
              onClick={handlePrint}
              className="py-3 px-4 rounded-2xl bg-[#f97316] hover:bg-[#ea580c] text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Print Badge</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
