import React from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Zap,
  Smartphone,
  Layers,
  Database,
  CheckCircle2,
  FileSpreadsheet,
  RotateCw,
  QrCode,
  Lock,
  BarChart3,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';

interface FeaturesPageProps {
  onOpenStartNow: () => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onOpenStartNow }) => {
  const featureGroups = [
    {
      title: 'Atomic Check-In & Concurrency',
      icon: Zap,
      desc: 'High-throughput token validation engine that prevents duplicate gate entry at the database level.',
      items: [
        'Atomic UNIQUE(event_id, student_id) guarantees single check-in under high concurrency',
        'Sub-100 millisecond response time from camera scan to database commit',
        'Scan attempt audit log recording Success, Duplicate, Invalid, and Cross-Event queries',
        'Distinct QR and 1D standard barcode token validation in unified check-in service',
      ],
    },
    {
      title: 'Multi-Admin PostgreSQL RLS',
      icon: Database,
      desc: 'Robust data isolation for multiple independent organizers sharing a single PostgreSQL cluster.',
      items: [
        'Strict Row Level Security (RLS) ensuring Admin A cannot query or view Admin B’s data',
        'Server-side session authorization derivation — zero trust in client IDs',
        'Event-scoped USN uniqueness (same student can attend distinct events independently)',
        'Cascade event lifecycle management with explicit dual-confirmation data purge',
      ],
    },
    {
      title: 'Distributed Scanner Terminal',
      icon: Smartphone,
      desc: 'Optimized, distraction-free mobile camera interface built for high-speed gate volunteers.',
      items: [
        'Continuous camera scanning using html5-qrcode with autofocus alignment guide',
        'Web Audio API sound synthesis (crisp success chimes, duplicate warnings, error buzzers)',
        'Instant large color-coded visual indicator cards with automatic 2.2s scan resumption',
        'Access code credentials with expiration timestamps and one-click remote deactivation',
      ],
    },
    {
      title: 'Offline Queue & Idempotent Sync',
      icon: WifiOff,
      desc: 'Resilient check-in handling designed for stadiums and underground event halls with spotty connectivity.',
      items: [
        'Automatic network status detection with instantaneous offline fallback queue',
        'Idempotency keys (client_scan_id) preventing duplicate entries on synchronization retries',
        'Batch synchronization committing all offline scans upon connection recovery',
        'Visual sync state badges: Online, Offline, Syncing, and Sync Complete',
      ],
    },
    {
      title: 'Roster Import & Token Generator',
      icon: FileSpreadsheet,
      desc: 'Complete spreadsheet management pipeline with field validation and badge generation.',
      items: [
        'Drag-and-drop CSV importer with column auto-mapping and format verification',
        'Pre-import preview table highlighting invalid USNs and duplicate rows',
        'Collision-free QR token and barcode identifier generation for all attendees',
        'Digital badge and printable token modal for instant distribution',
      ],
    },
    {
      title: 'Real-Time Analytics & CSV Export',
      icon: BarChart3,
      desc: 'Live operational insights for event organizers and security coordinators.',
      items: [
        'Live attendee counters: Total, Checked In, Remaining, and Percentage progress',
        'Department and branch breakdown charts with check-in rates',
        'Real-time recent check-in activity feed updating continuously',
        'Direct CSV export of verified attendee check-in logs with timestamp metadata',
      ],
    },
  ];

  return (
    <div id="features-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 apple-momentum-scroll">
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Core Capabilities</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Engineered for Zero-Failure Gate Access
          </h1>
          <p className="text-base text-slate-300">
            Explore the architectural features that make ADMITTO the preferred access management platform for hackathons, conferences, and institutional summits.
          </p>
        </div>
      </AppleScrollReveal>

      <AppleScrollStagger staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featureGroups.map((grp, idx) => {
          const Icon = grp.icon;
          return (
            <AppleScrollCard
              key={idx}
              className="glass rounded-3xl p-7 space-y-6 flex flex-col justify-between border border-white/10 hover:border-indigo-400/30 shadow-xl"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                  {grp.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {grp.desc}
                </p>
                <div className="pt-2 space-y-2.5">
                  {grp.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AppleScrollCard>
          );
        })}
      </AppleScrollStagger>

      <AppleScrollReveal direction="up" distance={20} className="text-center pt-8">
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenStartNow}
          className="px-8 py-4 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-xl shadow-white/10 cursor-pointer"
        >
          Get Started with ADMITTO
        </motion.button>
      </AppleScrollReveal>
    </div>
  );
};
