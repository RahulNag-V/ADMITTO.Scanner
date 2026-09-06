import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Percent,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Barcode,
  ArrowUpRight,
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { EventStats, ActivityLog, Student, ScannerAccount, EventItem } from '../../types';
import { eventsApi, scanApi, studentsApi, scannersApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { getAttendeeLabels } from '../../lib/attendeeTypes';
import { Skeleton, SkeletonStatCard, TabSkeletonView } from '../../components/common/Skeleton';
import { MetricDetailModal, MetricModalType } from '../../components/admin/MetricDetailModal';

interface DashboardPageProps {
  eventId: string;
  event?: EventItem;
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  eventId,
  event,
  onNavigateTab,
  onOpenScanner,
}) => {
  const [eventDetails, setEventDetails] = useState<EventItem | null>(event || null);
  const { singular, plural } = getAttendeeLabels(eventDetails || undefined);

  const [stats, setStats] = useState<EventStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [scanners, setScanners] = useState<ScannerAccount[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDetailModal, setActiveDetailModal] = useState<MetricModalType | null>(null);

  useEffect(() => {
    if (eventId) {
      loadDashboardData();
      // Auto-refresh stats every 8 seconds for live dashboard experience
      const interval = setInterval(() => {
        loadDashboardData(true);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (silent) setIsRefreshing(true);
      const [statsRes, activityRes, studentsRes, scannersRes, eventRes] = await Promise.allSettled([
        eventsApi.getStats(eventId),
        scanApi.getActivityLogs(eventId),
        studentsApi.list(eventId),
        scannersApi.list(eventId),
        eventsApi.get(eventId),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
      }
      if (activityRes.status === 'fulfilled' && activityRes.value?.logs) {
        setRecentActivity(activityRes.value.logs.slice(0, 8));
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value?.students) {
        setStudents(studentsRes.value.students);
      }
      if (scannersRes.status === 'fulfilled' && scannersRes.value?.scanners) {
        setScanners(scannersRes.value.scanners);
      }
      if (eventRes.status === 'fulfilled' && eventRes.value?.event) {
        setEventDetails(eventRes.value.event);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOpenMetricModal = (type: MetricModalType) => {
    playFeedbackSound('click');
    setActiveDetailModal(type);
  };

  const handleExportCSV = async () => {
    playFeedbackSound('click');
    try {
      await scanApi.downloadCSV(eventId);
    } catch (err) {
      console.error('Export failed, opening direct URL:', err);
      try {
        const url = await scanApi.getExportUrl(eventId);
        window.open(url, '_blank');
      } catch {
        // Ignored
      }
    }
  };

  if (loading && !stats) {
    return <TabSkeletonView tabId="dashboard" />;
  }

  const s = stats || {
    total_events: 1,
    total_attendees: 0,
    total_checked_in: 0,
    total_remaining: 0,
    checkin_percentage: 0,
    active_scanners_count: 0,
    total_scan_attempts: 0,
    duplicates_blocked: 0,
    invalid_attempts: 0,
    qr_scans: 0,
    barcode_scans: 0,
    branch_breakdown: [],
    year_breakdown: [],
  };

  return (
    <div id="admin-dashboard-page" className="space-y-8">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk']">
            Real-Time Event Overview
          </h1>
          <p className="text-xs text-slate-400">
            Live attendance counters, department ratios, and gate validation feed. Click any card to inspect details.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadDashboardData()}
            className="p-2.5 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl glass hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigateTab('students')}
            className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-white/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Import {plural}</span>
          </button>
        </div>
      </div>

      {/* 1. Core Key Metrics Grid - Interactive Drill-Down Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Attendees */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenMetricModal('total')}
          className="glass-card rounded-3xl p-5 space-y-2 glass-card-hover cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-indigo-400/50 shadow-lg select-none"
          title={`Click to inspect all registered ${plural.toLowerCase()}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold group-hover:text-white transition-colors">Total {plural}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk']">
            {s.total_attendees}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
            <span>Registered on roster</span>
            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              View List →
            </span>
          </div>
        </div>

        {/* Card 2: Checked In */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenMetricModal('checked_in')}
          className="glass-card rounded-3xl p-5 space-y-2 glass-card-hover cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-emerald-400/50 shadow-lg select-none"
          title={`Click to inspect admitted ${plural.toLowerCase()} & timeline`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold group-hover:text-emerald-300 transition-colors">{plural} Checked In</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-['Space_Grotesk']">
            {s.total_checked_in}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
            <span>{s.checkin_percentage}% verified admission</span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              Details →
            </span>
          </div>
        </div>

        {/* Card 3: Remaining */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenMetricModal('pending')}
          className="glass-card rounded-3xl p-5 space-y-2 glass-card-hover cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-amber-400/50 shadow-lg select-none"
          title={`Click to inspect remaining pending ${plural.toLowerCase()}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold group-hover:text-amber-300 transition-colors">{plural} Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/30 transition-all">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk']">
            {s.total_remaining}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
            <span>Awaiting gate arrival</span>
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              Check-In →
            </span>
          </div>
        </div>

        {/* Card 4: Active Scanners */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenMetricModal('scanners')}
          className="glass-card rounded-3xl p-5 space-y-2 glass-card-hover cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-purple-400/50 shadow-lg select-none"
          title="Click to inspect operational terminals & access codes"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold group-hover:text-purple-300 transition-colors">Active Gate Scanners</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/30 transition-all">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300 font-['Space_Grotesk']">
            {s.active_scanners_count}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
            <span>Operational terminals</span>
            <span className="text-[10px] font-bold text-purple-400 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              Stations →
            </span>
          </div>
        </div>
      </div>

      {/* 2. Secondary Metrics: Scan Types & Duplicate Protection Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400">QR Code Check-ins</div>
            <div className="text-xl font-bold text-white font-['Space_Grotesk']">{s.qr_scans}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400">Barcode Check-ins</div>
            <div className="text-xl font-bold text-white font-['Space_Grotesk']">{s.barcode_scans}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
            <Barcode className="w-5 h-5" />
          </div>
        </div>

        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400">Duplicates Intercepted</div>
            <div className="text-xl font-bold text-amber-400 font-['Space_Grotesk']">{s.duplicates_blocked}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Branch Distributions & Live Activity Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Branch Breakdown Progress Bars */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Department / Branch Attendance
              </h3>
              <p className="text-xs text-slate-400">Breakdown by registered branches</p>
            </div>
            <span className="text-xs font-mono text-slate-400 glass-pill px-2.5 py-0.5 rounded-md">{s.branch_breakdown.length} Branches</span>
          </div>

          {s.branch_breakdown.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No attendee branch data imported yet.
            </div>
          ) : (
            <div className="space-y-4">
              {s.branch_breakdown.map((b, idx) => {
                const pct = b.total > 0 ? Math.round((b.checked_in / b.total) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{b.branch}</span>
                      <span className="text-slate-400 font-mono">
                        {b.checked_in} / {b.total} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 glass-dark rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Live Recent Check-in Activity Feed */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Live Audit Stream
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No activity recorded yet.
              </div>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl glass-dark border border-white/5 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        log.type === 'checkin_success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.type === 'checkin_duplicate'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200 font-medium">{log.message}</div>
                  <div className="text-[10px] text-slate-400">Actor: {log.actor_name || 'Admin'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drill-Down Interactive Inspection Modal */}
      <MetricDetailModal
        type={activeDetailModal}
        onClose={() => setActiveDetailModal(null)}
        stats={stats}
        students={students}
        scanners={scanners}
        eventId={eventId}
        onNavigateTab={onNavigateTab}
        onOpenScanner={onOpenScanner}
        onDataChanged={() => loadDashboardData(true)}
      />
    </div>
  );
};
