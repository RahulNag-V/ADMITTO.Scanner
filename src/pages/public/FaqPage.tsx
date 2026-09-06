import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, CheckCircle2, QrCode, Shield, Database } from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger } from '../../components/common/AppleScrollReveal';

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is ADMITTO and who is it built for?',
      a: 'ADMITTO is a digital event access and token validation platform designed for conference organizers, university coordinators, and hackathon teams who need fast, collision-free attendee gate check-in with atomic duplicate protection.',
    },
    {
      q: 'How does ADMITTO prevent duplicate scans when multiple staff scan simultaneously?',
      a: 'ADMITTO uses PostgreSQL UNIQUE(event_id, student_id) constraints inside an atomic database stored transaction. Even if multiple gate staff scan the same QR code badge within the same millisecond, the database permits exactly one success and immediately records duplicate scan attempts in the security log.',
    },
    {
      q: 'How does offline scanning work if our venue loses Wi-Fi?',
      a: 'The scanner automatically switches to offline mode, queues scans in local persistent storage, and tags each with a client_scan_id idempotency key. When connectivity returns, batch synchronization pushes all scans to the server where atomic database constraints reconcile uniqueness, flagging any post-sync duplicate conflicts.',
    },
    {
      q: 'Can one student attend multiple events?',
      a: 'Yes. USN and identifier uniqueness is strictly scoped per event (UNIQUE(event_id, usn)). The same student or USN can exist across different events owned by different admins without conflict.',
    },
    {
      q: 'Can Admin A access Admin B’s events or scan data?',
      a: 'No. ADMITTO implements PostgreSQL Row Level Security (RLS). Every query execution enforces ownership checks derived from the server-authenticated session. Cross-admin access is impossible even if client request parameters are tampered with.',
    },
    {
      q: 'What happens when I click "Logout & Delete Event Data"?',
      a: 'Normal logout simply ends your active session and preserves all event data. "Logout & Delete Event Data" is a separate destructive action that requires two explicit confirmations and typing the event name or "DELETE" before permanently cascading deletion across attendees, tokens, scanners, and check-in history.',
    },
    {
      q: 'What barcode and QR formats are supported?',
      a: 'ADMITTO validates 2D QR codes and standard 1D linear barcodes (Code 128, Code 39, EAN, UPC). Scanners can operate in either mode via camera or external laser barcode guns.',
    },
  ];

  return (
    <div id="faq-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 apple-momentum-scroll">
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-indigo-300">
            Frequently Asked Questions
          </div>
          <h1 className="text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
            Everything You Need to Know
          </h1>
          <p className="text-sm text-slate-300">
            Clear, factual answers regarding token validation, multi-admin isolation, and scanner operations.
          </p>
        </div>
      </AppleScrollReveal>

      <AppleScrollStagger staggerDelay={0.06} className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div
              key={idx}
              className="glass rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 shadow-lg hover:border-indigo-400/30"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 text-white font-bold text-base hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AppleScrollStagger>
    </div>
  );
};
