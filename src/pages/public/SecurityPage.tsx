import React from 'react';
import { Shield, Lock, Key, Server, Database, CheckCircle2, AlertTriangle, EyeOff } from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';

export const SecurityPage: React.FC = () => {
  return (
    <div id="security-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 apple-momentum-scroll">
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-emerald-300 border border-emerald-500/25">
            Zero-Trust Security Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Security & Privacy Engineering
          </h1>
          <p className="text-base text-slate-300">
            How ADMITTO enforces strict multi-tenant isolation, cryptographic token integrity, and explicit data destruction policies without false claims.
          </p>
        </div>
      </AppleScrollReveal>

      <AppleScrollStagger staggerDelay={0.09} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Security Pillar 1 */}
        <AppleScrollCard className="glass rounded-3xl p-8 space-y-4 border border-white/10 hover:border-indigo-400/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
            PostgreSQL Row Level Security (RLS)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            All data resides in a single relational PostgreSQL database protected by declarative RLS policies. Even if Admin A tampers with HTTP request parameters to query Admin B’s event ID, the database engine drops the query with zero rows returned.
          </p>
          <div className="glass-dark p-3 rounded-xl border border-white/10 text-[11px] font-mono text-indigo-300">
            CREATE POLICY "Admins own events" ON events USING (auth.uid() = admin_id);
          </div>
        </AppleScrollCard>

        {/* Security Pillar 2 */}
        <AppleScrollCard className="glass rounded-3xl p-8 space-y-4 border border-white/10 hover:border-emerald-400/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
            Server-Authoritative Session Validation
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Client-submitted roles, organizer identifiers, or event permissions are never trusted. All incoming requests extract identity directly from signed Bearer session tokens validated server-side.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Never exposes service role keys to the browser</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Passwords and secret hashes are never returned in API responses</span>
            </li>
          </ul>
        </AppleScrollCard>

        {/* Security Pillar 3 */}
        <AppleScrollCard className="glass rounded-3xl p-8 space-y-4 border border-white/10 hover:border-amber-400/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
            Granular Scanner Authorization Scoping
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Scanner accounts are strictly limited to validating tokens for their single assigned event. Scanners cannot create events, access attendee lists, modify records, or inspect other organizers' events.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instant remote deactivation from admin dashboard</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Automated expiration timestamps for temporary gate staff</span>
            </li>
          </ul>
        </AppleScrollCard>

        {/* Security Pillar 4 */}
        <AppleScrollCard className="glass rounded-3xl p-8 space-y-4 border border-white/10 hover:border-rose-400/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
            Explicit Data Destruction Workflow
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Standard logout never deletes data. Permanent event deletion requires a distinct dual-confirmation process, requiring the organizer to explicitly type the event name or "DELETE" before running cascade deletion on check-ins, scans, and attendee rosters.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Soft-delete archive separation from permanent cascade purge</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Dual-step confirmation prevents accidental data loss</span>
            </li>
          </ul>
        </AppleScrollCard>
      </AppleScrollStagger>
    </div>
  );
};
