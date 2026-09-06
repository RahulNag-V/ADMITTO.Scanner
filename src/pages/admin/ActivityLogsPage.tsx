import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Shield, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ActivityLog } from '../../types';
import { scanApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { SkeletonActivityItem, TabSkeletonView } from '../../components/common/Skeleton';

interface ActivityLogsPageProps {
  eventId: string;
}

export const ActivityLogsPage: React.FC<ActivityLogsPageProps> = ({ eventId }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (eventId) {
      loadLogs();
    }
  }, [eventId]);

  const loadLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [res] = await Promise.all([
        scanApi.getActivityLogs(eventId),
        !silent ? new Promise((r) => setTimeout(r, 250)) : Promise.resolve(),
      ]);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredLogs = (logs || []).filter((l) => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return true;
    return (
      (l.message && l.message.toLowerCase().includes(q)) ||
      (l.type && l.type.toLowerCase().includes(q)) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(q))
    );
  });

  if (loading && logs.length === 0) {
    return <TabSkeletonView tabId="activity" />;
  }

  return (
    <div id="activity-logs-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk']">
            Security & Operational Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Chronological record of attendee admissions, scanner activations, and roster operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLogs()}
            className="p-2.5 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <div
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="Audit logs are cryptographically immutable and append-only"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Immutable Audit Log</span>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-2xl p-3 max-w-md shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search through any credentials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none backdrop-blur-md transition-colors"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 space-y-3 shadow-2xl">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <SkeletonActivityItem key={i} />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                {logs.length === 0 ? 'No activity logged yet' : 'No logs match criteria'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {logs.length === 0
                  ? 'Activity will appear here automatically as attendee imports, check-ins, and scanner events occur.'
                  : 'Try adjusting your search terms.'}
              </p>
            </div>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-white/[0.08] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/[0.14] backdrop-blur-md transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/25 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/35">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{log.message}</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Actor: <span className="text-white font-medium">{log.actor_name || 'System / Admin'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/35 px-2.5 py-0.5 rounded text-indigo-200 font-bold">
                  {log.type}
                </span>
                <div className="text-[10px] text-slate-300 mt-1 font-mono">
                  {new Date(log.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
