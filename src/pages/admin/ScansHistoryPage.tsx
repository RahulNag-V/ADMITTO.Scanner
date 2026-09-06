import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  QrCode,
  Barcode,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  Hash,
  Fingerprint,
  Calendar,
  Terminal,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { ScanAttempt } from '../../types';
import { scanApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { SkeletonTableRow, TabSkeletonView } from '../../components/common/Skeleton';

interface ScansHistoryPageProps {
  eventId: string;
}

export const ScansHistoryPage: React.FC<ScansHistoryPageProps> = ({ eventId }) => {
  const [scans, setScans] = useState<ScanAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (eventId) {
      loadScans();
    }
  }, [eventId]);

  const loadScans = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      const [res] = await Promise.all([
        scanApi.getLogs(eventId),
        !silent ? new Promise((r) => setTimeout(r, 250)) : Promise.resolve(),
      ]);
      setScans(res.scans || res.logs || []);
    } catch (err) {
      console.error('Failed to load scan logs:', err);
      setScans([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
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

  const toggleExpand = (scanId: string) => {
    playFeedbackSound('click');
    setExpandedScanIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    playFeedbackSound('click');
    if (expandedScanIds.size === filteredScans.length) {
      setExpandedScanIds(new Set());
    } else {
      setExpandedScanIds(new Set(filteredScans.map((s) => s.id)));
    }
  };

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playFeedbackSound('click');
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const isSuccessResult = (res: string) => {
    const r = (res || '').toLowerCase();
    return r === 'success' || r === 'idempotent_success';
  };

  const isDuplicateResult = (res: string) => {
    const r = (res || '').toLowerCase();
    return r === 'duplicate' || r === 'duplicate_checkin';
  };

  const isInvalidResult = (res: string) => {
    const r = (res || '').toLowerCase();
    return r === 'invalid' || r === 'invalid_token' || r === 'wrong_event' || r === 'wrong_method' || r === 'scanner_disabled';
  };

  const filteredScans = (scans || []).filter((s) => {
    const studentName = s.student?.name || (s as any).student_name || '';
    const usn = s.student?.usn || (s as any).usn || '';
    const scannedVal = s.scanned_value || '';
    const scannerName = s.scanner?.name || (s as any).scanner_name || '';

    const q = (search || '').trim().toLowerCase();
    const matchesSearch =
      !q ||
      studentName.toLowerCase().includes(q) ||
      usn.toLowerCase().includes(q) ||
      scannedVal.toLowerCase().includes(q) ||
      scannerName.toLowerCase().includes(q);

    let matchesResult = true;
    if (resultFilter === 'SUCCESS') {
      matchesResult = isSuccessResult(s.result);
    } else if (resultFilter === 'DUPLICATE_CHECKIN') {
      matchesResult = isDuplicateResult(s.result);
    } else if (resultFilter === 'INVALID_TOKEN') {
      matchesResult = isInvalidResult(s.result);
    }

    return matchesSearch && matchesResult;
  });

  const getResultBadge = (resultStr: string) => {
    if (isSuccessResult(resultStr)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>CHECK-IN SUCCESS</span>
        </span>
      );
    }
    if (isDuplicateResult(resultStr)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>DUPLICATE BLOCKED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-rose-500/15 border border-rose-500/30 text-rose-400">
        <XCircle className="w-3.5 h-3.5" />
        <span>{resultStr ? resultStr.toUpperCase() : 'INVALID'}</span>
      </span>
    );
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toUTCString();
  };

  if (loading && scans.length === 0) {
    return <TabSkeletonView tabId="scans" />;
  }

  return (
    <div id="scans-history-page" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk']">
            Gate Check-In & Scan Logs
          </h1>
          <p className="text-xs text-slate-400">
            Real-time audit log of all admissions, verified QR scans, and blocked duplicates. Click any row to view full details.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {filteredScans.length > 0 && (
            <button
              onClick={toggleExpandAll}
              className="px-3.5 py-2.5 rounded-xl glass hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              {expandedScanIds.size === filteredScans.length ? (
                <>
                  <ChevronUp className="w-4 h-4 text-indigo-400" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                  <span>Expand All Details</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => loadScans()}
            className="p-2.5 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh logs"
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
        </div>
      </div>

      {/* Filters Bar: Search & Filter side-by-side */}
      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-40 overflow-visible shadow-xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search through any credentials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 font-mono focus:outline-none backdrop-blur-md transition-colors"
          />
        </div>

        {/* Filter Dropdown Menu right beside Search */}
        <div className="relative shrink-0 z-50" ref={filterMenuRef}>
          {(() => {
            const totalCount = (scans || []).length;
            const successCount = (scans || []).filter((s) => isSuccessResult(s.result)).length;
            const duplicateCount = (scans || []).filter((s) => isDuplicateResult(s.result)).length;
            const invalidCount = (scans || []).filter((s) => isInvalidResult(s.result)).length;

            const filterOptions = [
              {
                id: 'ALL',
                label: 'All Scans',
                count: totalCount,
                icon: Filter,
                color: 'text-indigo-400',
                badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
              },
              {
                id: 'SUCCESS',
                label: 'Success Only',
                count: successCount,
                icon: CheckCircle2,
                color: 'text-emerald-400',
                badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
              },
              {
                id: 'DUPLICATE_CHECKIN',
                label: 'Duplicate Blocked',
                count: duplicateCount,
                icon: AlertTriangle,
                color: 'text-amber-400',
                badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
              },
              {
                id: 'INVALID_TOKEN',
                label: 'Invalid Tokens',
                count: invalidCount,
                icon: XCircle,
                color: 'text-rose-400',
                badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
              },
            ];

            const currentOption = filterOptions.find((opt) => opt.id === resultFilter) || filterOptions[0];
            const CurrentIcon = currentOption.icon;

            return (
              <>
                <button
                  type="button"
                  onClick={() => {
                    playFeedbackSound('click');
                    setIsFilterMenuOpen(!isFilterMenuOpen);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-bold text-white flex items-center justify-between sm:justify-start gap-2.5 transition-all cursor-pointer shadow-md group select-none relative z-50 backdrop-blur-md"
                  aria-haspopup="true"
                  aria-expanded={isFilterMenuOpen}
                >
                  <div className="flex items-center gap-2">
                    <CurrentIcon className={`w-4 h-4 ${currentOption.color}`} />
                    <span>{currentOption.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${currentOption.badgeBg}`}>
                    {currentOption.count}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 ${
                      isFilterMenuOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>

                {/* Floating Dropdown Panel */}
                {isFilterMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-[#1a203d]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.95)] z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 border-b border-white/15">
                      Filter by Scan Status
                    </div>
                    <div className="p-1 space-y-1">
                      {filterOptions.map((opt) => {
                        const OptIcon = opt.icon;
                        const isSelected = resultFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playFeedbackSound('click');
                              setResultFilter(opt.id);
                              setIsFilterMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-200 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <OptIcon className={`w-4 h-4 ${isSelected ? 'text-white' : opt.color}`} />
                              <span>{opt.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                  isSelected
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : opt.badgeBg
                                }`}
                              >
                                {opt.count}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/15 bg-white/[0.06] backdrop-blur-md text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 pl-4 pr-2 w-10 text-center"></th>
                <th className="py-3.5 px-4">Attendee Name</th>
                <th className="py-3.5 px-4 text-right pr-6">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <SkeletonTableRow key={i} />
                  ))}
                </>
              ) : filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center">
                    {scans.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-4 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto">
                          <ScanLine className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                            No scans recorded yet
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Scan attendee passes from an active gate terminal to see real-time verification and entry telemetry.
                          </p>
                        </div>
                        <a
                          href="/scan"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Open Scanner Terminal</span>
                        </a>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-6">
                        No scan attempts match the selected filter criteria.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredScans.map((scan) => {
                  const isExpanded = expandedScanIds.has(scan.id);
                  const student = scan.student;
                  const studentName = student?.name || (scan as any).student_name;
                  const scannerStation = scan.scanner?.name || (scan as any).scanner_name || 'Terminal Gate';
                  const timestampStr = scan.timestamp || (scan as any).scanned_at;
                  const isSuccess = isSuccessResult(scan.result);
                  const isDuplicate = isDuplicateResult(scan.result);

                  return (
                    <React.Fragment key={scan.id}>
                      {/* Main Collapsed Row: ONLY Name and Status */}
                      <tr
                        onClick={() => toggleExpand(scan.id)}
                        className={`transition-colors cursor-pointer select-none group h-12 ${
                          isExpanded
                            ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Dropdown Chevron Toggle Button */}
                        <td className="py-3 pl-4 pr-1 text-center align-middle w-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(scan.id);
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 group-hover:text-white transition-colors cursor-pointer"
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-indigo-400' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Only Attendee Name - single line with clean ellipsis */}
                        <td className="py-3 px-3 align-middle">
                          {studentName ? (
                            <div className="font-bold text-white text-sm truncate max-w-[220px] sm:max-w-md">
                              {studentName}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono text-rose-300 font-semibold text-xs truncate">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>Unregistered Token</span>
                            </div>
                          )}
                        </td>

                        {/* Only Result Status */}
                        <td className="py-3 pr-4 sm:pr-6 text-right align-middle">
                          {getResultBadge(scan.result)}
                        </td>
                      </tr>

                      {/* Dropdown Detailed Data Panel */}
                      {isExpanded && (
                        <tr className="bg-[#080b15] border-t border-b border-indigo-500/20">
                          <td colSpan={3} className="p-0">
                            <div className="p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                              
                              {/* Top Banner inside Dropdown */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      isSuccess
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isDuplicate
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}
                                  >
                                    {isSuccess ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : isDuplicate ? (
                                      <AlertTriangle className="w-5 h-5" />
                                    ) : (
                                      <XCircle className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-white text-sm">
                                        Scan Audit Record & Diagnostics
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-500">
                                        ID: {scan.id.substring(0, 8)}...
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      {scan.reason || (isSuccess ? 'Valid access token verified and checked in successfully.' : 'Scan completed.')}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopy(JSON.stringify(scan, null, 2), `json-${scan.id}`, e)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                                    title="Copy raw JSON data"
                                  >
                                    {copiedKey === `json-${scan.id}` ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400 font-semibold">JSON Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Copy JSON</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Detailed Grid: Attendee Profile & Verification Diagnostics */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                
                                {/* 1. Attendee Information Card */}
                                <div className="glass-card rounded-2xl p-4 border border-white/[0.08] space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                                    <User className="w-3.5 h-3.5" />
                                    <span>Attendee Profile</span>
                                  </div>

                                  {student ? (
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                        <span className="text-slate-400">Full Name</span>
                                        <span className="font-semibold text-white">{student.name}</span>
                                      </div>

                                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                        <span className="text-slate-400">USN / Roll No.</span>
                                        <span className="font-mono font-bold text-indigo-300">{student.usn}</span>
                                      </div>

                                      {student.branch && (
                                        <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                          <span className="text-slate-400">Department / Branch</span>
                                          <span className="text-slate-200">{student.branch}</span>
                                        </div>
                                      )}

                                      {(student.year || student.section) && (
                                        <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                          <span className="text-slate-400">Class / Section</span>
                                          <span className="text-slate-200">
                                            {[student.year, student.section ? `Sec ${student.section}` : ''].filter(Boolean).join(' • ')}
                                          </span>
                                        </div>
                                      )}

                                      {student.email && (
                                        <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                          <span className="text-slate-400">Email</span>
                                          <span className="font-mono text-slate-300 truncate max-w-[180px]">{student.email}</span>
                                        </div>
                                      )}

                                      {student.phone_number && (
                                        <div className="flex justify-between items-baseline py-1">
                                          <span className="text-slate-400">Phone</span>
                                          <span className="font-mono text-slate-300">{student.phone_number}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-4 text-center text-slate-500 text-xs italic">
                                      No matched student record. The scanned payload is not linked to any registered attendee in this event.
                                    </div>
                                  )}
                                </div>

                                {/* 2. Scanned Payload & Token Tokens */}
                                <div className="glass-card rounded-2xl p-4 border border-white/[0.08] space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                                    <Fingerprint className="w-3.5 h-3.5" />
                                    <span>Scanned Token & Payload</span>
                                  </div>

                                  <div className="space-y-2.5 text-xs">
                                    <div>
                                      <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                                        <span>Raw Scanned Value</span>
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopy(scan.scanned_value, `raw-${scan.id}`, e)}
                                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                                        >
                                          {copiedKey === `raw-${scan.id}` ? (
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                          <span>{copiedKey === `raw-${scan.id}` ? 'Copied' : 'Copy'}</span>
                                        </button>
                                      </div>
                                      <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-amber-300 break-all select-all">
                                        {scan.scanned_value}
                                      </div>
                                    </div>

                                    {student?.qr_code && (
                                      <div className="flex justify-between items-center py-1 border-b border-white/5 text-[11px]">
                                        <span className="text-slate-400">Registered QR Token</span>
                                        <span className="font-mono text-slate-300 truncate max-w-[170px]">
                                          {student.qr_code}
                                        </span>
                                      </div>
                                    )}

                                    {student?.barcode && (
                                      <div className="flex justify-between items-center py-1 border-b border-white/5 text-[11px]">
                                        <span className="text-slate-400">Registered Barcode</span>
                                        <span className="font-mono text-slate-300">{student.barcode}</span>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center py-1 text-[11px]">
                                      <span className="text-slate-400">Scan Input Medium</span>
                                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                                        {scan.scan_type === 'BARCODE' ? (
                                          <Barcode className="w-3.5 h-3.5 text-purple-400" />
                                        ) : (
                                          <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                                        )}
                                        {scan.scan_type} Scan
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 3. Station, Security & Timing Diagnostics */}
                                <div className="glass-card rounded-2xl p-4 border border-white/[0.08] space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Gate & Audit Diagnostics</span>
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                      <span className="text-slate-400">Gate / Scanner</span>
                                      <span className="font-semibold text-white truncate max-w-[170px]">
                                        {scannerStation}
                                      </span>
                                    </div>

                                    {scan.scanner?.access_code && (
                                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                        <span className="text-slate-400">Access Code</span>
                                        <span className="font-mono text-indigo-300">{scan.scanner.access_code}</span>
                                      </div>
                                    )}

                                    {scan.scanner?.email && (
                                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                        <span className="text-slate-400">Scanner Account</span>
                                        <span className="font-mono text-slate-400 truncate max-w-[170px]">{scan.scanner.email}</span>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                      <span className="text-slate-400">Exact ISO Time</span>
                                      <span className="font-mono text-[11px] text-slate-300 truncate max-w-[170px]">
                                        {timestampStr || 'N/A'}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-baseline py-1">
                                      <span className="text-slate-400">Full UTC Date</span>
                                      <span className="text-slate-300 text-[11px] truncate max-w-[170px]">
                                        {formatFullDate(timestampStr)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

