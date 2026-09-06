import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Download,
  ListOrdered,
  QrCode,
  Barcode,
  Clock,
  Filter,
  ShieldAlert,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  User,
  Fingerprint,
  Terminal,
} from 'lucide-react';
import { ScanAttempt } from '../../types';

interface ScannerLogTabProps {
  logs: ScanAttempt[];
  onExportCsv?: () => void;
}

export const ScannerLogTab: React.FC<ScannerLogTabProps> = ({ logs, onExportCsv }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ACCEPTED' | 'DUPLICATE' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const acceptedLogs = logs.filter((l) => l.result === 'success');
  const duplicateLogs = logs.filter((l) => l.result === 'duplicate');
  const rejectedLogs = logs.filter((l) => l.result !== 'success' && l.result !== 'duplicate');

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'ACCEPTED' && log.result === 'success') ||
      (filterType === 'DUPLICATE' && log.result === 'duplicate') ||
      (filterType === 'REJECTED' && log.result !== 'success' && log.result !== 'duplicate');

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      log.scanned_value.toLowerCase().includes(q) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      (log.student &&
        (log.student.name.toLowerCase().includes(q) ||
          log.student.usn.toLowerCase().includes(q) ||
          (log.student.branch && log.student.branch.toLowerCase().includes(q))));

    return matchesFilter && matchesSearch;
  });

  const handleExportDefault = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    // Fallback client CSV export
    const rows = [
      ['Timestamp', 'Result', 'Attendee Name', 'USN', 'Scanned Value', 'Scan Type', 'Reason', 'Scanner Gate'],
      ...logs.map((l) => [
        new Date(l.timestamp).toLocaleString(),
        l.result.toUpperCase(),
        l.student?.name || 'N/A',
        l.student?.usn || 'N/A',
        `"${l.scanned_value}"`,
        l.scan_type,
        `"${l.reason || ''}"`,
        l.scanner?.name || 'Gate Scanner',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admitto-scan-logs-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="scanner-log-tab" className="space-y-6 pb-24 animate-fade-in max-w-4xl mx-auto w-full">
      {/* 1. Header & Summary Stats */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2.5">
              <ListOrdered className="w-5 h-5 text-indigo-400" />
              <span>Real-Time Scan Logs & Verifications</span>
            </h1>
            <p className="text-xs text-slate-400">
              Live chronological stream of accepted admissions, duplicate passback blocks, and rejected tokens
            </p>
          </div>

          <button
            onClick={handleExportDefault}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* 4 Counter Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div
            onClick={() => setFilterType('ALL')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-white/15 border-white/30 text-white shadow-md'
                : 'glass-dark border-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400">Total Scanned</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{logs.length}</div>
          </div>

          <div
            onClick={() => setFilterType('ACCEPTED')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'ACCEPTED'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-white shadow-md'
                : 'glass-dark border-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accepted
            </div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{acceptedLogs.length}</div>
          </div>

          <div
            onClick={() => setFilterType('DUPLICATE')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'DUPLICATE'
                ? 'bg-amber-500/20 border-amber-500/40 text-white shadow-md'
                : 'glass-dark border-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Duplicate
            </div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">{duplicateLogs.length}</div>
          </div>

          <div
            onClick={() => setFilterType('REJECTED')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'REJECTED'
                ? 'bg-rose-500/20 border-rose-500/40 text-white shadow-md'
                : 'glass-dark border-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </div>
            <div className="text-xl font-extrabold text-rose-400 mt-0.5">{rejectedLogs.length}</div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-white/10 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="log-search-input"
              type="text"
              placeholder="Search through any credentials"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 glass-input rounded-2xl text-xs text-white placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'glass-dark text-slate-400 hover:text-white'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterType('ACCEPTED')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ACCEPTED'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'glass-dark text-slate-400 hover:text-white'
              }`}
            >
              Accepted ({acceptedLogs.length})
            </button>
            <button
              onClick={() => setFilterType('DUPLICATE')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'DUPLICATE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'glass-dark text-slate-400 hover:text-white'
              }`}
            >
              Duplicate ({duplicateLogs.length})
            </button>
            <button
              onClick={() => setFilterType('REJECTED')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'REJECTED'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'glass-dark text-slate-400 hover:text-white'
              }`}
            >
              Rejected ({rejectedLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Log Stream Cards */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4 glass-card rounded-3xl border border-white/10 text-slate-400 text-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">
              {logs.length === 0 ? 'No scans recorded yet' : 'No matching scan logs'}
            </div>
            <p className="max-w-xs mx-auto text-[11px] text-slate-400">
              {logs.length === 0
                ? 'Scanned attendee tokens and gate entry records will appear here in real-time.'
                : 'Try clearing your search keyword or switching the result filter.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSuccess = log.result === 'success';
            const isDuplicate = log.result === 'duplicate';
            const isRetroactiveDuplicate =
              isDuplicate &&
              ((log as any).source === 'offline_sync' ||
                (log.reason && log.reason.toLowerCase().includes('offline')) ||
                (log.reason && log.reason.toLowerCase().includes('sync')));
            const isRejected = !isSuccess && !isDuplicate;

            const isExpanded = expandedLogIds.has(log.id);

            return (
              <div
                key={log.id}
                className={`rounded-2xl glass-card border transition-all overflow-hidden ${
                  isSuccess
                    ? 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-950/10'
                    : isRetroactiveDuplicate
                    ? 'border-orange-500/35 hover:border-orange-500/55 bg-orange-950/15'
                    : isDuplicate
                    ? 'border-amber-500/25 hover:border-amber-500/45 bg-amber-950/10'
                    : 'border-rose-500/25 hover:border-rose-500/45 bg-rose-950/10'
                }`}
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Indicator Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSuccess
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRetroactiveDuplicate
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/35'
                          : isDuplicate
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                      {isDuplicate && <AlertTriangle className="w-5 h-5" />}
                      {isRejected && <XCircle className="w-5 h-5" />}
                    </div>

                    {/* Attendee Name & Status Pill */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {log.student ? log.student.name : 'Unregistered Scanned Token'}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border tracking-wider ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : isRetroactiveDuplicate
                            ? 'bg-orange-500/25 text-orange-300 border-orange-500/40'
                            : isDuplicate
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isSuccess
                          ? 'ACCEPTED'
                          : isRetroactiveDuplicate
                          ? 'POST-SYNC DUPLICATE'
                          : isDuplicate
                          ? 'DUPLICATE'
                          : 'REJECTED'}
                      </span>
                    </div>
                  </div>

                    {/* Expand/Collapse Chevron Indicator */}
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-[11px] hidden sm:inline text-slate-500">
                        {isExpanded ? 'Hide' : 'Details'}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isExpanded
                            ? 'bg-white/20 text-white rotate-180'
                            : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Detailed Drawer */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-black/40 border-t border-white/10 space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Attendee Details */}
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                          <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5 mb-2">
                            <User className="w-3.5 h-3.5" />
                            <span>Attendee Information</span>
                          </div>
                          {log.student ? (
                            <>
                              <div className="flex justify-between py-0.5"><span className="text-slate-400">Name:</span> <span className="font-semibold text-white">{log.student.name}</span></div>
                              <div className="flex justify-between py-0.5"><span className="text-slate-400">USN:</span> <span className="font-mono text-indigo-300">{log.student.usn}</span></div>
                              {log.student.branch && <div className="flex justify-between py-0.5"><span className="text-slate-400">Branch:</span> <span className="text-slate-200">{log.student.branch}</span></div>}
                              {log.student.email && <div className="flex justify-between py-0.5"><span className="text-slate-400">Email:</span> <span className="font-mono text-slate-300">{log.student.email}</span></div>}
                              {log.student.phone_number && <div className="flex justify-between py-0.5"><span className="text-slate-400">Phone:</span> <span className="font-mono text-slate-300">{log.student.phone_number}</span></div>}
                            </>
                          ) : (
                            <div className="text-slate-500 text-[11px] italic">No attendee record associated with this token</div>
                          )}
                        </div>

                        {/* Diagnostics & Token */}
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                          <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5 mb-2">
                            <Fingerprint className="w-3.5 h-3.5" />
                            <span>Payload & Diagnostics</span>
                          </div>
                          <div className="text-[11px] text-slate-400">Raw Token:</div>
                          <div className="p-2 rounded bg-black/60 border border-white/10 font-mono text-[11px] text-amber-300 break-all select-all flex items-center justify-between gap-2">
                            <span>{log.scanned_value}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(log.scanned_value, `raw-sc-${log.id}`, e)}
                              className="text-slate-400 hover:text-white cursor-pointer shrink-0"
                            >
                              {copiedKey === `raw-sc-${log.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="flex justify-between py-0.5 text-[11px]"><span className="text-slate-400">Result:</span> <span className="font-mono font-bold text-white uppercase">{log.result}</span></div>
                          <div className="flex justify-between py-0.5 text-[11px]"><span className="text-slate-400">Time:</span> <span className="font-mono text-slate-300">{log.timestamp}</span></div>
                          {isRetroactiveDuplicate && (
                            <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-300 leading-snug">
                              <strong>Post-Sync Conflict:</strong> This scan was saved locally while terminal was offline, but another gate station checked in this attendee online earlier. Rejected during sync to prevent duplicate entry.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
          })
        )}
      </div>
    </div>
  );
};
