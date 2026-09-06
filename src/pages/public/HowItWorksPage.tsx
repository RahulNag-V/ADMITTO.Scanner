import React from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  Users,
  Key,
  Camera,
  CheckCircle2,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';

interface HowItWorksPageProps {
  onOpenStartNow: () => void;
  onNavigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onOpenStartNow, onNavigate }) => {
  const steps = [
    {
      num: '01',
      title: 'Event Creation & Scoped Isolation',
      icon: Database,
      desc: 'The event organizer registers as an Admin. When an event is created, a unique UUID is provisioned with foreign key constraints in Supabase PostgreSQL. Row Level Security policies immediately lock data visibility strictly to this administrator.',
      badge: 'Step 1: Admin Setup',
    },
    {
      num: '02',
      title: 'Attendee Roster Import & Token Generation',
      icon: Users,
      desc: 'Admins upload an attendee CSV file containing columns like USN, Name, Email, Year, Section, and Branch. The parser performs format validation, removes whitespace, and assigns collision-free QR codes and 1D barcodes.',
      badge: 'Step 2: Attendee Management',
    },
    {
      num: '03',
      title: 'Scanner Accounts & Permission Scoping',
      icon: Key,
      desc: 'Admins provision gate terminals with designated access codes (e.g., GATE-NORTH-1). Scanners can be given expiration timestamps or deactivated with a single click. Scanners are strictly scoped to only one event.',
      badge: 'Step 3: Access Delegation',
    },
    {
      num: '04',
      title: 'High-Throughput Mobile & Laser Scanning',
      icon: Camera,
      desc: 'Gate volunteers open /scan on mobile or tablet devices. The integrated optical engine continuously decodes QR and barcodes with sub-50ms server-side processing latency (excluding network transit). Web Audio synthesizer provides instant audio feedback without relying solely on vibration.',
      badge: 'Step 4: Real-time Scanning',
    },
    {
      num: '05',
      title: 'Atomic Concurrency & Duplicate Protection',
      icon: ShieldCheck,
      desc: 'When a token is scanned, our backend checks the unique constraint UNIQUE(event_id, student_id). If 10 scanners scan the same student simultaneously, PostgreSQL executes an atomic transaction: exactly 1 succeeds, and 9 receive DUPLICATE.',
      badge: 'Step 5: Concurrency Safety',
    },
    {
      num: '06',
      title: 'Offline Sync & Real-time Live Feed',
      icon: Zap,
      desc: 'If internet drops at a crowded entrance, the scanner queues entries in LocalStorage with client_scan_id idempotency keys. Once reconnected, batch synchronization commits records against the database unique constraints, surfacing any retroactive duplicate conflicts.',
      badge: 'Step 6: Resilient Sync',
    },
  ];

  return (
    <div id="how-it-works-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 apple-momentum-scroll">
      {/* Header */}
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-indigo-300">
            Operational Lifecycle
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            How ADMITTO Powers Event Access
          </h1>
          <p className="text-base text-slate-300">
            A look under the hood at our zero-queue token validation architecture, from initial CSV import to distributed gate check-in.
          </p>
        </div>
      </AppleScrollReveal>

      {/* Grid of Steps */}
      <AppleScrollStagger staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <AppleScrollCard
              key={idx}
              className="glass rounded-3xl p-7 space-y-5 border border-white/10 hover:border-indigo-400/30 flex flex-col justify-between shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 flex items-center justify-center font-mono font-bold text-lg">
                    {step.num}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider glass-dark px-2.5 py-1 rounded-lg border border-white/10">
                    {step.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </AppleScrollCard>
          );
        })}
      </AppleScrollStagger>

      {/* CTA Box */}
      <AppleScrollReveal direction="up" distance={30}>
        <div className="glass-card rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/10 shadow-2xl">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">
              Get started with ADMITTO
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Create your organizer account, configure your event, and launch your gate scanners in minutes.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenStartNow}
            className="px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm flex items-center gap-2 shadow-lg shadow-white/10 shrink-0 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </AppleScrollReveal>
    </div>
  );
};
