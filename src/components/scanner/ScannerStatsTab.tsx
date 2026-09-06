import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  QrCode,
  Barcode,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EventStats, Student } from '../../types';

interface ScannerStatsTabProps {
  stats: EventStats | null;
  students: Student[];
  eventName?: string;
  onNavigateToRoster?: () => void;
}

export const ScannerStatsTab: React.FC<ScannerStatsTabProps> = ({
  stats,
  students,
  eventName,
  onNavigateToRoster,
}) => {
  // Compute fallbacks if stats object is still loading
  const totalAttendees = stats?.total_attendees ?? students.length;
  const totalCheckedIn = stats?.total_checked_in ?? students.filter((s) => s.is_checked_in || s.checked_in).length;
  const totalRemaining = Math.max(0, totalAttendees - totalCheckedIn);
  const checkinPercentage = totalAttendees > 0 ? Math.round((totalCheckedIn / totalAttendees) * 100) : 0;

  const duplicatesBlocked = stats?.duplicates_blocked ?? 0;
  const invalidAttempts = stats?.invalid_attempts ?? 0;
  const qrScans = stats?.qr_scans ?? 0;
  const barcodeScans = stats?.barcode_scans ?? 0;

  // Branch breakdown
  const branchMap = new Map<string, { total: number; checked_in: number }>();
  students.forEach((s) => {
    const b = s.branch || 'General';
    const current = branchMap.get(b) || { total: 0, checked_in: 0 };
    current.total += 1;
    if (s.is_checked_in || s.checked_in) {
      current.checked_in += 1;
    }
    branchMap.set(b, current);
  });

  const branchBreakdown = Array.from(branchMap.entries()).map(([branch, counts]) => ({
    branch,
    total: counts.total,
    checked_in: counts.checked_in,
    percentage: counts.total > 0 ? Math.round((counts.checked_in / counts.total) * 100) : 0,
  }));

  return (
    <div id="scanner-stats-tab" className="space-y-6 pb-24 animate-fade-in max-w-4xl mx-auto w-full">
      {/* 1. Header Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Real-Time Telemetry
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk'] mt-2 tracking-tight">
              Event Attendance & Analytics
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Comprehensive gate throughput, admission rates, and department telemetry for {eventName || 'Event'}
            </p>
          </div>

          {/* Big Circular Ring Metric */}
          <div
            onClick={onNavigateToRoster}
            role={onNavigateToRoster ? 'button' : undefined}
            className={`flex items-center gap-3 glass-dark p-3.5 rounded-2xl border border-white/10 shrink-0 ${
              onNavigateToRoster ? 'cursor-pointer hover:border-emerald-500/40 transition-colors' : ''
            }`}
          >
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${checkinPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-extrabold text-white">{checkinPercentage}%</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Admitted</div>
              <div className="text-[11px] text-slate-400">
                {totalCheckedIn} of {totalAttendees} attendees
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Core 3 Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Registered */}
        <div
          onClick={onNavigateToRoster}
          role={onNavigateToRoster ? 'button' : undefined}
          className={`p-4 sm:p-5 rounded-3xl glass-card border border-white/10 space-y-2 shadow-lg transition-all ${
            onNavigateToRoster ? 'cursor-pointer hover:scale-[1.02] hover:border-indigo-400/50 active:scale-[0.98]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Registered</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{totalAttendees}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Total roster size</span>
            {onNavigateToRoster && <span className="text-[10px] font-bold text-indigo-400">View Roster →</span>}
          </div>
        </div>

        {/* Checked In */}
        <div
          onClick={onNavigateToRoster}
          role={onNavigateToRoster ? 'button' : undefined}
          className={`p-4 sm:p-5 rounded-3xl glass-card border border-emerald-500/20 space-y-2 shadow-lg bg-emerald-950/10 transition-all ${
            onNavigateToRoster ? 'cursor-pointer hover:scale-[1.02] hover:border-emerald-400/50 active:scale-[0.98]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">Checked In (Admitted)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{totalCheckedIn}</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${checkinPercentage}%` }}
            />
          </div>
        </div>

        {/* Remaining */}
        <div
          onClick={onNavigateToRoster}
          role={onNavigateToRoster ? 'button' : undefined}
          className={`p-4 sm:p-5 rounded-3xl glass-card border border-amber-500/20 space-y-2 shadow-lg bg-amber-950/10 transition-all ${
            onNavigateToRoster ? 'cursor-pointer hover:scale-[1.02] hover:border-amber-400/50 active:scale-[0.98]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">Remaining (Pending)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{totalRemaining}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{100 - checkinPercentage}% yet to arrive</span>
            {onNavigateToRoster && <span className="text-[10px] font-bold text-amber-400">Inspect →</span>}
          </div>
        </div>
      </div>

      {/* 3. Security & Validation Telemetry */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          <span>Security & Scan Type Distribution</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl glass-dark border border-white/5 space-y-1">
            <div className="text-[11px] text-amber-400 font-semibold">Duplicates Defended</div>
            <div className="text-xl font-bold text-white">{duplicatesBlocked}</div>
            <div className="text-[10px] text-slate-400">Passback attacks stopped</div>
          </div>

          <div className="p-3.5 rounded-2xl glass-dark border border-white/5 space-y-1">
            <div className="text-[11px] text-rose-400 font-semibold">Invalid Scans Blocked</div>
            <div className="text-xl font-bold text-white">{invalidAttempts}</div>
            <div className="text-[10px] text-slate-400">Unknown/alien tokens</div>
          </div>

          <div className="p-3.5 rounded-2xl glass-dark border border-white/5 space-y-1">
            <div className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
              <QrCode className="w-3 h-3" /> QR Validations
            </div>
            <div className="text-xl font-bold text-white">{qrScans}</div>
            <div className="text-[10px] text-slate-400">Camera / Mobile QR</div>
          </div>

          <div className="p-3.5 rounded-2xl glass-dark border border-white/5 space-y-1">
            <div className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
              <Barcode className="w-3 h-3" /> Barcode Scans
            </div>
            <div className="text-xl font-bold text-white">{barcodeScans}</div>
            <div className="text-[10px] text-slate-400">Laser Gun / Badges</div>
          </div>
        </div>
      </div>

      {/* 4. Department / Branch Breakdown */}
      {branchBreakdown.length > 0 && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Attendance by Department / Branch</span>
          </h2>

          <div className="space-y-3 pt-1">
            {branchBreakdown.map((item) => (
              <div key={item.branch} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{item.branch}</span>
                  <span className="text-slate-400">
                    <strong className="text-white">{item.checked_in}</strong> / {item.total} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
