import React from 'react';
import { QrCode, Shield, Code2, Users, Cpu, Terminal, Sparkles } from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';

export const AboutPage: React.FC = () => {
  return (
    <div id="about-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 apple-momentum-scroll">
      {/* Header */}
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-indigo-300">
            Our Mission & Architecture
          </div>
          <h1 className="text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
            About ADMITTO
          </h1>
          <p className="text-sm text-slate-300">
            Eliminating entrance bottlenecks, ticket fraud, and data corruption in high-volume events.
          </p>
        </div>
      </AppleScrollReveal>

      {/* Story Sections */}
      <AppleScrollStagger staggerDelay={0.09} className="space-y-8 text-sm text-slate-300 leading-relaxed">
        <AppleScrollCard className="glass rounded-3xl p-8 space-y-3 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <span className="text-indigo-400 font-mono">01.</span> The Problem
          </h2>
          <p>
            Event organizers running collegiate summits, hackathons, and conferences face chaotic check-in queues. Existing tools rely on slow web dashboards, manual paper spreadsheets, or client-side validation logic that causes race conditions when multiple volunteers scan the same QR code badge simultaneously.
          </p>
        </AppleScrollCard>

        <AppleScrollCard className="glass rounded-3xl p-8 space-y-3 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <span className="text-indigo-400 font-mono">02.</span> The ADMITTO Solution
          </h2>
          <p>
            ADMITTO was engineered from the ground up to guarantee transactional integrity. By marrying PostgreSQL Row Level Security with an atomic constraint-driven check-in engine, offline idempotent queues, and high-performance camera scanners, ADMITTO ensures that every scan is verified in milliseconds without risk of duplicate entries.
          </p>
        </AppleScrollCard>

        <AppleScrollCard className="glass rounded-3xl p-8 space-y-3 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <span className="text-indigo-400 font-mono">03.</span> Our Vision
          </h2>
          <p>
            To deliver universal, robust access control that runs on standard mobile web browsers without expensive proprietary hardware, empowering organizers around the world to run smooth, secure, and data-backed events.
          </p>
        </AppleScrollCard>
      </AppleScrollStagger>

      {/* Developer Section (Inside About) */}
      <AppleScrollReveal direction="up" distance={30}>
        <div id="developer-section" className="glass-card rounded-3xl p-8 sm:p-10 space-y-6 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                Developer & Core Engineering Team
              </h3>
              <p className="text-xs text-slate-400">
                Architected with TypeScript, PostgreSQL, and React
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            ADMITTO is developed by a dedicated engineering team focused on distributed systems, relational data integrity, and mobile web performance. The system is designed following strict multi-tenant separation principles and zero-trust API contracts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="glass-dark border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Full-Stack Architecture</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Express.js + Vite TypeScript runtime with atomic SQL transactions & RLS policies.
              </p>
            </div>

            <div className="glass-dark border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Client Scanner Subsystem</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Web Audio synthesizer, html5-qrcode camera engine, and persistent offline sync queue.
              </p>
            </div>
          </div>
        </div>
      </AppleScrollReveal>
    </div>
  );
};
