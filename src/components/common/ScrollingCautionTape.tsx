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
      className={`relative w-full py-2 overflow-hidden select-none ${className}`}
    >
      {/* Tape 1: Forward Marquee Ribbon (Cream Yellow on Dark Navy) */}
      <div className="relative z-10 w-full overflow-hidden">
        <div className="relative w-full bg-[#FFE3A6] text-[#10232D] py-2 sm:py-2.5 font-bold tracking-wider uppercase font-mono text-xs sm:text-sm border-y border-[#314A56] flex items-center overflow-hidden">
          
          {/* Marquee Track 1 */}
          <div className="flex shrink-0 animate-marquee whitespace-nowrap items-center">
            {tapeTextItems.map((text, i) => (
              <span key={`tape1-a-${i}`} className="inline-flex items-center gap-2 mx-4 font-mono font-bold leading-none">
                <span>{text}</span>
                <span className="text-[#10232D]/40 font-bold">•</span>
              </span>
            ))}
          </div>

          {/* Marquee Track 1 Duplicate for Seamless Loop */}
          <div className="flex shrink-0 animate-marquee whitespace-nowrap items-center" aria-hidden="true">
            {tapeTextItems.map((text, i) => (
              <span key={`tape1-b-${i}`} className="inline-flex items-center gap-2 mx-4 font-mono font-bold leading-none">
                <span>{text}</span>
                <span className="text-[#10232D]/40 font-bold">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tape 2: Reverse Marquee Ribbon (Dark Teal on Cream Accent) */}
      <div className="relative z-10 w-full overflow-hidden mt-1.5 sm:mt-2">
        <div className="relative w-full bg-[#1B303A] text-[#FFE3A6] py-2 sm:py-2.5 font-mono font-semibold tracking-widest uppercase text-[11px] sm:text-xs border-y border-[#314A56] flex items-center overflow-hidden">
          
          {/* Marquee Track 2 (Reverse Direction) */}
          <div className="flex shrink-0 animate-marquee-reverse whitespace-nowrap items-center">
            {tapeTextItems.map((text, i) => (
              <span key={`tape2-a-${i}`} className="inline-flex items-center gap-2 mx-4 text-[#FFE3A6] leading-none">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                <span>{text}</span>
                <span className="text-[#FFE3A6]/40 font-bold">///</span>
              </span>
            ))}
          </div>

          {/* Marquee Track 2 Duplicate for Seamless Loop */}
          <div className="flex shrink-0 animate-marquee-reverse whitespace-nowrap items-center" aria-hidden="true">
            {tapeTextItems.map((text, i) => (
              <span key={`tape2-b-${i}`} className="inline-flex items-center gap-2 mx-4 text-[#FFE3A6] leading-none">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                <span>{text}</span>
                <span className="text-[#FFE3A6]/40 font-bold">///</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
