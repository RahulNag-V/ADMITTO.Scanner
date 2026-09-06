import React from 'react';
import { AlertTriangle, ShieldAlert, Zap, Radio, Lock } from 'lucide-react';

interface CautionTapeProps {
  className?: string;
}

export const ScrollingCautionTape: React.FC<CautionTapeProps> = ({ className = '' }) => {
  const tapeTextItems = [
    '⚠️ CAUTION // ATOMIC ACCESS PROTOCOL ACTIVE',
    '⚡ ZERO-QUEUE GATE ADMISSION',
    '⛔ DUPLICATE ENTRIES STRICTLY BLOCKED',
    '🔒 256-BIT CRYPTOGRAPHIC TOKEN VERIFICATION',
    '📡 LIVE MULTI-GATE SCANNER FLEET ONLINE',
    '🚀 SUB-50MS OPTICAL RESPONSE TIME',
    '🛡️ POSTGRESQL ROW-LEVEL SECURITY ENFORCED',
    '⚠️ ADMISSION ENCLAVE // AUTHORIZED PASSES ONLY',
  ];

  return (
    <div
      id="scrolling-caution-tape-section"
      className={`relative w-full py-4 overflow-hidden select-none my-2 ${className}`}
    >
      {/* Tape 1: Slanted Left-to-Right Scrolling Hazard Ribbon */}
      <div className="relative -rotate-1 scale-105 sm:scale-100 shadow-xl shadow-amber-500/10">
        <div className="relative w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black py-2 sm:py-2.5 font-black tracking-wider uppercase font-['Space_Grotesk'] text-xs sm:text-sm border-y-2 border-black/80 flex items-center overflow-hidden shadow-2xl">
          
          {/* Animated Hazard Striped Background Accent Overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 20px, transparent 20px, transparent 40px)',
            }}
          />

          {/* Marquee Track 1 */}
          <div className="flex shrink-0 animate-marquee whitespace-nowrap items-center">
            {tapeTextItems.map((text, i) => (
              <span key={`tape1-a-${i}`} className="inline-flex items-center gap-2 mx-4 font-mono font-black">
                <span>{text}</span>
                <span className="text-black/60">•</span>
              </span>
            ))}
          </div>

          {/* Marquee Track 1 Duplicate for Seamless Loop */}
          <div className="flex shrink-0 animate-marquee whitespace-nowrap items-center" aria-hidden="true">
            {tapeTextItems.map((text, i) => (
              <span key={`tape1-b-${i}`} className="inline-flex items-center gap-2 mx-4 font-mono font-black">
                <span>{text}</span>
                <span className="text-black/60">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tape 2: Counter-Slanted Reverse Scrolling Dark Neon Ribbon */}
      <div className="relative rotate-1 -mt-2.5 scale-105 sm:scale-100 opacity-95">
        <div className="relative w-full bg-[#080b18] text-amber-400 py-1.5 sm:py-2 font-mono font-bold tracking-widest uppercase text-[11px] sm:text-xs border-y border-amber-400/30 flex items-center overflow-hidden shadow-xl backdrop-blur-md">
          
          {/* Marquee Track 2 (Reverse Direction) */}
          <div className="flex shrink-0 animate-marquee-reverse whitespace-nowrap items-center">
            {tapeTextItems.map((text, i) => (
              <span key={`tape2-a-${i}`} className="inline-flex items-center gap-2 mx-4 text-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                <span>{text}</span>
                <span className="text-amber-500/40">///</span>
              </span>
            ))}
          </div>

          {/* Marquee Track 2 Duplicate for Seamless Loop */}
          <div className="flex shrink-0 animate-marquee-reverse whitespace-nowrap items-center" aria-hidden="true">
            {tapeTextItems.map((text, i) => (
              <span key={`tape2-b-${i}`} className="inline-flex items-center gap-2 mx-4 text-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                <span>{text}</span>
                <span className="text-amber-500/40">///</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
