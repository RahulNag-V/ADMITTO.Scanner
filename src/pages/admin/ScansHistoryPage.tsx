import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Layers,
  List,
  SlidersHorizontal,
  Shield,
} from 'lucide-react';
import { toBrowserPath } from '../../lib/router';
import { ScanAttempt } from '../../types';
import { scanApi } from '../../lib/api';
import { SkeletonTableRow, TabSkeletonView } from '../../components/common/Skeleton';
import { subscribeToEventSync } from '../../lib/realtimeSync';

interface ScansHistoryPageProps {
  eventId: string;
}

export const ScansHistoryPage: React.FC<ScansHistoryPageProps> = ({ eventId }) => {
  const [scans, setScans] = useState<ScanAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [selectedScannerCategory, setSelectedScannerCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(new Set());
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isScannerFilterOpen, setIsScannerFilterOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Multi-Selection State for Selective Deletion
  const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    mode: 'selected' | 'all';
    count: number;
  }>({ isOpen: false, mode: 'all', count: 0 });

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const scannerFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
      if (scannerFilterRef.current && !scannerFilterRef.current.contains(event.target as Node)) {
        setIsScannerFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!eventId) return;

    loadScans();

    const unsubscribe = subscribeToEventSync(eventId, {
      onScan: (eventData) => {
        setScans((prev) => {
          if (prev.some((s) => s.id === eventData.scan.id)) return prev;
          return [eventData.scan, ...prev];
        });
      },
      onLogsCleared: (payload) => {
        if (payload.scanIds && payload.scanIds.length > 0) {
          const idSet = new Set(payload.scanIds);
          setScans((prev) => prev.filter((s) => !idSet.has(s.id)));
        } else {
          setScans([]);
        }
      },
    });

    return () => unsubscribe();
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
    if (expandedScanIds.size === filteredScans.length) {
      setExpandedScanIds(new Set());
    } else {
      setExpandedScanIds(new Set(filteredScans.map((s) => s.id)));
    }
  };

  const toggleSelectScan = (scanId: string) => {
    setSelectedScanIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredScans.length === 0) return;
    if (selectedScanIds.size === filteredScans.length) {
      setSelectedScanIds(new Set());
    } else {
      setSelectedScanIds(new Set(filteredScans.map((s) => s.id)));
    }
  };

  const handleConfirmClear = async () => {
    try {
      setIsClearing(true);
      const isSelectedMode = confirmModal.mode === 'selected';
      const scanIdsToClear = isSelectedMode ? Array.from<string>(selectedScanIds) : undefined;

      const res = await scanApi.clearLogs(eventId, scanIdsToClear);

      if (isSelectedMode && scanIdsToClear) {
        const idSet = new Set(scanIdsToClear);
        setScans((prev) => prev.filter((s) => !idSet.has(s.id)));
        setSelectedScanIds(new Set());
      } else {
        setScans([]);
        setSelectedScanIds(new Set());
      }

      setStatusMessage({
        type: 'success',
        text: res.message || (isSelectedMode ? 'Selected scan logs cleared successfully.' : 'All scan logs cleared successfully.'),
      });
      setTimeout(() => setStatusMessage(null), 3500);
      setConfirmModal({ isOpen: false, mode: 'all', count: 0 });
    } catch (err: any) {
      console.error('Failed to clear scan logs:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to clear scan logs. Please try again.',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
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

  // Helper to detect if a scanner is an Admin / Organizer
  const isScannerAdmin = (scannerName?: string, reason?: string, scannerId?: string | null) => {
    const name = (scannerName || '').toLowerCase();
    const r = (reason || '').toLowerCase();
    return (
      name.includes('admin') ||
      name.includes('organizer') ||
      r.includes('admin console') ||
      r.includes('manual admission') ||
      r.includes('manual check-in') ||
      !scannerId
    );
  };

  const getScannerDisplayDetails = (scan: ScanAttempt) => {
    const rawName = scan.scanner?.name || (scan as any).scanner_name || (scan.scanner_id ? 'Gate Scanner Terminal' : 'Admin Console');
    const isAdmin = isScannerAdmin(rawName, scan.reason, scan.scanner_id);
    const displayName = isAdmin
      ? (rawName.toLowerCase().includes('admin') ? rawName : 'Admin Console')
      : rawName;
    return { name: displayName, isAdmin };
  };

  // Dynamically extract and categorize all unique scanners with aggregate counts
  const scannerCategories = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        isAdmin: boolean;
        count: number;
        successCount: number;
        duplicateCount: number;
        invalidCount: number;
      }
    >();

    (scans || []).forEach((s) => {
      const { name, isAdmin } = getScannerDisplayDetails(s);
      const existing = map.get(name) || {
        id: name,
        name,
        isAdmin,
        count: 0,
        successCount: 0,
        duplicateCount: 0,
        invalidCount: 0,
      };

      existing.count++;
      if (isSuccessResult(s.result)) existing.successCount++;
      else if (isDuplicateResult(s.result)) existing.duplicateCount++;
      else if (isInvalidResult(s.result)) existing.invalidCount++;

      map.set(name, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      // Pin Admin scanners to top, then sort by highest scan volume
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return b.count - a.count;
    });
  }, [scans]);

  const filteredScans = (scans || []).filter((s) => {
    const studentName = s.student?.name || (s as any).student_name || '';
    const usn = s.student?.usn || (s as any).usn || '';
    const scannedVal = s.scanned_value || '';
    const { name: scannerName } = getScannerDisplayDetails(s);

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

    let matchesScanner = true;
    if (selectedScannerCategory !== 'ALL') {
      matchesScanner = scannerName === selectedScannerCategory;
    }

    return matchesSearch && matchesResult && matchesScanner;
  });

  // Group scans by scanner category
  const groupedByScanner = useMemo(() => {
    const groups: {
      category: {
        id: string;
        name: string;
        isAdmin: boolean;
        count: number;
        successCount: number;
        duplicateCount: number;
        invalidCount: number;
      };
      scans: ScanAttempt[];
    }[] = [];

    const categories =
      selectedScannerCategory === 'ALL'
        ? scannerCategories
        : scannerCategories.filter((c) => c.id === selectedScannerCategory);

    categories.forEach((cat) => {
      const items = filteredScans.filter((s) => {
        const { name } = getScannerDisplayDetails(s);
        return name === cat.id;
      });

      if (items.length > 0 || (search === '' && resultFilter === 'ALL' && selectedScannerCategory === cat.id)) {
        groups.push({
          category: cat,
          scans: items,
        });
      }
    });

    return groups;
  }, [filteredScans, scannerCategories, selectedScannerCategory, search, resultFilter]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

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
          {/* View Mode Toggle: List vs Grouped by Scanner */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.06] border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Unified Chronological List"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Categorized & Grouped by Scanner Name"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Group by Scanner</span>
            </button>
          </div>

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

          {/* Clear Selected Button */}
          {selectedScanIds.size > 0 && (
            <button
              type="button"
              onClick={() => setConfirmModal({ isOpen: true, mode: 'selected', count: selectedScanIds.size })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer animate-in fade-in"
              title="Clear selected scan logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Selected ({selectedScanIds.size})</span>
            </button>
          )}

          {/* All Clear Button */}
          <button
            type="button"
            onClick={() => setConfirmModal({ isOpen: true, mode: 'all', count: scans.length })}
            disabled={scans.length === 0}
            className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 disabled:pointer-events-none text-rose-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Clear all scan history logs for this event"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>All Clear</span>
          </button>
        </div>
      </div>

      {/* Status Message Notification */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

        {/* Scanner Filter Dropdown Menu */}
        <div className="relative shrink-0 z-50" ref={scannerFilterRef}>
          {(() => {
            const currentCat = scannerCategories.find((c) => c.id === selectedScannerCategory);
            const isAll = selectedScannerCategory === 'ALL';
            const totalCount = scans.length;
            const currentLabel = isAll ? 'All Scanners' : (currentCat?.name || selectedScannerCategory);
            const isAdmin = currentCat?.isAdmin;

            return (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsScannerFilterOpen(!isScannerFilterOpen);
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-bold text-white flex items-center justify-between sm:justify-start gap-2.5 transition-all cursor-pointer shadow-md group select-none relative z-50 backdrop-blur-md"
                  aria-haspopup="true"
                  aria-expanded={isScannerFilterOpen}
                >
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                    )}
                    <span className="truncate max-w-[130px] sm:max-w-[170px]">{currentLabel}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                      isAdmin
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    }`}
                  >
                    {isAll ? totalCount : currentCat?.count || 0}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 ${
                      isScannerFilterOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>

                {/* Floating Scanner Filter Panel */}
                {isScannerFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#1a203d]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.95)] z-[100] animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 border-b border-white/15 flex items-center justify-between">
                      <span>Categorize by Scanner</span>
                      <span className="text-slate-400 font-normal">{scannerCategories.length} categories</span>
                    </div>
                    <div className="p-1 space-y-1">
                      {/* All Scanners option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScannerCategory('ALL');
                          setIsScannerFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          selectedScannerCategory === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-200 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                          <span>All Scanners (Combined)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-indigo-500/20 border-indigo-500/40 text-indigo-300">
                            {scans.length}
                          </span>
                          {selectedScannerCategory === 'ALL' && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>

                      {/* Individual Scanner Categories */}
                      {scannerCategories.map((cat) => {
                        const isSelected = selectedScannerCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedScannerCategory(cat.id);
                              setIsScannerFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? cat.isAdmin
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-200 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate max-w-[185px]">
                              {cat.isAdmin ? (
                                <ShieldCheck className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                              ) : (
                                <Smartphone className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                              )}
                              <span className="truncate">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                  isSelected
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : cat.isAdmin
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                    : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                }`}
                              >
                                {cat.count}
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
                    setIsFilterMenuOpen(!isFilterMenuOpen);
                    setIsScannerFilterOpen(false);
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

      {/* Dynamic Scanner Category Pills Bar */}
      {scannerCategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none">
          <button
            type="button"
            onClick={() => setSelectedScannerCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 border transition-all cursor-pointer ${
              selectedScannerCategory === 'ALL'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white/[0.05] border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>All Scanners</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                selectedScannerCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {scans.length}
            </span>
          </button>

          {scannerCategories.map((cat) => {
            const isSelected = selectedScannerCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedScannerCategory(isSelected ? 'ALL' : cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? cat.isAdmin
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                      : 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : cat.isAdmin
                    ? 'bg-purple-500/10 border-purple-500/25 text-purple-300 hover:bg-purple-500/20'
                    : 'bg-white/[0.05] border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.isAdmin ? (
                  <ShieldCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                ) : (
                  <Smartphone className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                )}
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Selection Action Bar */}
      {selectedScanIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 px-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2.5 text-indigo-200">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white">{selectedScanIds.size}</span>
            <span>of {filteredScans.length} scan records selected</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedScanIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => setConfirmModal({ isOpen: true, mode: 'selected', count: selectedScanIds.size })}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Selected ({selectedScanIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Scans Display: Grouped by Scanner vs Standard List View */}
      {viewMode === 'grouped' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-6">
                  <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
                  <div className="space-y-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupedByScanner.length === 0 ? (
            <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-16 text-center shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                No scans recorded yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
                {scans.length === 0
                  ? 'Scan attendee passes from an active gate terminal to see real-time verification telemetry.'
                  : 'No scan records match the current filter criteria.'}
              </p>
              {scans.length === 0 && (
                <a
                  href={toBrowserPath('/scan')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open Scanner Terminal</span>
                </a>
              )}
            </div>
          ) : (
            groupedByScanner.map((group) => {
              const isCollapsed = collapsedGroupIds.has(group.category.id);
              const isGroupAdmin = group.category.isAdmin;

              return (
                <div
                  key={group.category.id}
                  className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl transition-all"
                >
                  {/* Collapsible Scanner Category Card Header */}
                  <div
                    onClick={() => toggleGroupCollapse(group.category.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer border-b border-white/10 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90 text-slate-400' : 'text-indigo-400'
                          }`}
                        />
                      </button>

                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isGroupAdmin
                            ? 'bg-purple-500/20 border-purple-500/35 text-purple-300'
                            : 'bg-indigo-500/20 border-indigo-500/35 text-indigo-300'
                        }`}
                      >
                        {isGroupAdmin ? (
                          <ShieldCheck className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-white text-sm sm:text-base font-['Space_Grotesk']">
                            {group.category.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isGroupAdmin
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                            }`}
                          >
                            {isGroupAdmin ? 'ADMIN CONSOLE' : 'GATE TERMINAL'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {isGroupAdmin
                            ? 'Organizers / Admin scans performed via Console & Camera'
                            : 'Dedicated Gate Access Scanner Terminal'}
                        </p>
                      </div>
                    </div>

                    {/* Scanner Group Telemetry Badges */}
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-white/10 text-white border border-white/15">
                        {group.category.count} total
                      </span>
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {group.category.successCount} verified
                      </span>
                      {group.category.duplicateCount > 0 && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {group.category.duplicateCount} blocked
                        </span>
                      )}
                      {group.category.invalidCount > 0 && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          {group.category.invalidCount} invalid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Table within Group */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                            <th className="py-3 pl-4 pr-1 w-10 text-center"></th>
                            <th className="py-3 px-1 w-8 text-center"></th>
                            <th className="py-3 px-3">Attendee Name</th>
                            <th className="py-3 px-4 text-right pr-6">Result Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {group.scans.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                                No scan attempts match the selected filter criteria for this scanner.
                              </td>
                            </tr>
                          ) : (
                            group.scans.map((scan) => {
                              const isExpanded = expandedScanIds.has(scan.id);
                              const isSelected = selectedScanIds.has(scan.id);
                              const student = scan.student;
                              const studentName = student?.name || (scan as any).student_name;
                              const timestampStr = scan.timestamp || (scan as any).scanned_at;

                              return (
                                <React.Fragment key={scan.id}>
                                  <tr
                                    onClick={() => toggleExpand(scan.id)}
                                    className={`transition-colors cursor-pointer select-none group h-14 ${
                                      isSelected
                                        ? 'bg-rose-500/10 hover:bg-rose-500/15'
                                        : isExpanded
                                        ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                                        : 'hover:bg-white/[0.04]'
                                    }`}
                                  >
                                    <td
                                      className="py-3 pl-4 pr-1 text-center align-middle w-10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => toggleSelectScan(scan.id)}
                                        className="w-5 h-5 rounded-md border border-white/20 hover:border-indigo-400 flex items-center justify-center transition-colors cursor-pointer bg-white/5 mx-auto"
                                        aria-label={isSelected ? 'Deselect scan' : 'Select scan'}
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                                        ) : (
                                          <Square className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
                                        )}
                                      </button>
                                    </td>

                                    <td className="py-3 px-1 text-center align-middle w-8">
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
                                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                                        {formatTimestamp(timestampStr)}
                                      </div>
                                    </td>

                                    <td className="py-3 pr-4 sm:pr-6 text-right align-middle">
                                      {getResultBadge(scan.result)}
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr className="bg-[#080b15] border-t border-b border-indigo-500/20">
                                      <td colSpan={4} className="p-4 sm:p-5">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="font-extrabold text-white text-sm">
                                              Scan Diagnostics — {scan.id.substring(0, 8)}...
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                              {formatTimestamp(timestampStr)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-300">
                                            {scan.reason || 'Verification record processed.'}
                                          </p>
                                          {scan.scanned_value && (
                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-slate-200 break-all select-all">
                                              {scan.scanned_value}
                                            </div>
                                          )}
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
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Scans Table */
        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/15 bg-white/[0.06] backdrop-blur-md text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                {/* Select All Checkbox Column */}
                <th className="py-3.5 pl-4 pr-1 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={filteredScans.length === 0}
                    className="w-5 h-5 rounded-md border border-white/25 hover:border-indigo-400 flex items-center justify-center transition-colors cursor-pointer bg-white/5 disabled:opacity-30 disabled:pointer-events-none mx-auto"
                    title={selectedScanIds.size === filteredScans.length && filteredScans.length > 0 ? 'Deselect all' : 'Select all'}
                  >
                    {selectedScanIds.size > 0 && selectedScanIds.size === filteredScans.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    ) : selectedScanIds.size > 0 ? (
                      <MinusSquare className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-1 w-8 text-center"></th>
                <th className="py-3.5 px-3">Attendee Name</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Scanner / Gate</th>
                <th className="py-3.5 px-4 text-right pr-6">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <SkeletonTableRow key={i} columns={5} />
                  ))}
                </>
              ) : filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
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
                          href={toBrowserPath('/scan')}
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
                  const isSelected = selectedScanIds.has(scan.id);
                  const student = scan.student;
                  const studentName = student?.name || (scan as any).student_name;
                  const { name: scannerStation, isAdmin } = getScannerDisplayDetails(scan);
                  const timestampStr = scan.timestamp || (scan as any).scanned_at;
                  const isSuccess = isSuccessResult(scan.result);
                  const isDuplicate = isDuplicateResult(scan.result);

                  return (
                    <React.Fragment key={scan.id}>
                      {/* Main Collapsed Row */}
                      <tr
                        onClick={() => toggleExpand(scan.id)}
                        className={`transition-colors cursor-pointer select-none group h-14 ${
                          isSelected
                            ? 'bg-rose-500/10 hover:bg-rose-500/15'
                            : isExpanded
                            ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td
                          className="py-3 pl-4 pr-1 text-center align-middle w-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelectScan(scan.id)}
                            className="w-5 h-5 rounded-md border border-white/20 hover:border-indigo-400 flex items-center justify-center transition-colors cursor-pointer bg-white/5 mx-auto"
                            aria-label={isSelected ? 'Deselect scan' : 'Select scan'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Dropdown Chevron Toggle Button */}
                        <td className="py-3 px-1 text-center align-middle w-8">
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

                        {/* Attendee Name + Mobile Scanner Subtitle */}
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

                          {/* Scanner Name Subtitle for Mobile / Quick Context */}
                          <div
                            className={`flex items-center gap-1.5 text-[11px] mt-1 font-medium ${
                              isAdmin ? 'text-purple-300/90' : 'text-indigo-300/80'
                            }`}
                          >
                            {isAdmin ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px] sm:max-w-[260px]">{scannerStation}</span>
                            <span className="text-slate-600 sm:hidden">•</span>
                            <span className="text-slate-400 font-mono text-[10px] sm:hidden">
                              {formatTimestamp(timestampStr)}
                            </span>
                          </div>
                        </td>

                        {/* Dedicated Scanner / Gate Column (Desktop & Tablets) */}
                        <td className="py-3 px-4 align-middle hidden sm:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold w-fit max-w-[220px] ${
                                isAdmin
                                  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                                  : 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300'
                              }`}
                            >
                              {isAdmin ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              )}
                              <span className="truncate">{scannerStation}</span>
                            </div>
                            <span className="text-slate-400 text-[10px] font-mono pl-1">
                              {formatTimestamp(timestampStr)}
                            </span>
                          </div>
                        </td>

                        {/* Result Status */}
                        <td className="py-3 pr-4 sm:pr-6 text-right align-middle">
                          {getResultBadge(scan.result)}
                        </td>
                      </tr>

                      {/* Dropdown Detailed Data Panel */}
                      {isExpanded && (
                        <tr className="bg-[#080b15] border-t border-b border-indigo-500/20">
                          <td colSpan={5} className="p-0">
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

                                {/* 2. Scan Input Medium */}
                                <div className="glass-card rounded-2xl p-4 border border-white/[0.08] space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                                    {scan.scan_type === 'BARCODE' ? (
                                      <Barcode className="w-3.5 h-3.5 text-purple-400" />
                                    ) : (
                                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                                    )}
                                    <span>Scan Input Medium</span>
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center py-2 text-xs">
                                      <span className="text-slate-400">Scan Input Medium</span>
                                      <span className="font-semibold text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                        {scan.scan_type === 'BARCODE' ? (
                                          <>
                                            <Barcode className="w-4 h-4 text-purple-400" />
                                            <span>BARCODE Scan</span>
                                          </>
                                        ) : (
                                          <>
                                            <QrCode className="w-4 h-4 text-indigo-400" />
                                            <span>QR Code Scan</span>
                                          </>
                                        )}
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
                                      <span className={`font-semibold truncate max-w-[170px] ${isAdmin ? 'text-purple-300 font-bold' : 'text-white'}`}>
                                        {scannerStation}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                                      <span className="text-slate-400">Operator Role</span>
                                      <span className="font-semibold text-slate-300">
                                        {isAdmin ? 'Event Administrator' : 'Gate Volunteer / Scanner'}
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
      )}

      {/* Professional Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#181d33] border border-white/20 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white font-['Space_Grotesk']">
                  {confirmModal.mode === 'all' ? 'All Clear — Reset Scan Logs?' : 'Clear Selected Logs?'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {confirmModal.mode === 'all'
                    ? `This will permanently clear all ${confirmModal.count} scan audit records for this event.`
                    : `This will permanently clear ${confirmModal.count} selected scan log record(s).`}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300/90 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Deleting scan history logs removes verification records from the dashboard. This action is irreversible.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setConfirmModal({ isOpen: false, mode: 'all', count: 0 })}
                className="px-4 py-2.5 rounded-xl glass hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClear}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Clear</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

