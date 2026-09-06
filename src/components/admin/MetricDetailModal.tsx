import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Smartphone,
  ShieldCheck,
  QrCode,
  Barcode,
  Download,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Filter,
  ArrowRight,
  Sparkles,
  Radio,
  RotateCcw,
  UserCheck,
  Key,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Student, ScannerAccount, EventStats } from '../../types';
import { studentsApi, scannersApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';

export type MetricModalType = 'total' | 'checked_in' | 'pending' | 'scanners';

interface MetricDetailModalProps {
  type: MetricModalType | null;
  onClose: () => void;
  stats: EventStats | null;
  students: Student[];
  scanners: ScannerAccount[];
  eventId: string;
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
  onDataChanged: () => void;
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({
  type,
  onClose,
  stats,
  students,
  scanners,
  eventId,
  onNavigateTab,
  onOpenScanner,
  onDataChanged,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'PENDING'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (type) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [type, onClose]);

  const totalAttendees = stats?.total_attendees ?? students.length;
  const totalCheckedIn = stats?.total_checked_in ?? students.filter((s) => s.is_checked_in || s.checked_in).length;
  const totalRemaining = Math.max(0, totalAttendees - totalCheckedIn);
  const checkinPercentage = totalAttendees > 0 ? Math.round((totalCheckedIn / totalAttendees) * 100) : 0;

  const [localStudents, setLocalStudents] = useState<Student[]>(students);
  const [localScanners, setLocalScanners] = useState<ScannerAccount[]>(scanners);

  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  useEffect(() => {
    setLocalScanners(scanners);
  }, [scanners]);

  // Extract unique branches for filtering
  const branches = useMemo(() => {
    const set = new Set<string>();
    localStudents.forEach((s) => {
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set).sort();
  }, [localStudents]);

  // Filter students based on modal type and active search/filters
  const filteredStudents = useMemo(() => {
    return localStudents.filter((student) => {
      const isChecked = Boolean(student.is_checked_in || student.checked_in);

      // Specific modal type constraints
      if (type === 'checked_in' && !isChecked) return false;
      if (type === 'pending' && isChecked) return false;

      // Status pill filter for Total modal
      if (type === 'total' && selectedStatusFilter === 'CHECKED_IN' && !isChecked) return false;
      if (type === 'total' && selectedStatusFilter === 'PENDING' && isChecked) return false;

      // Branch filter
      if (selectedBranch !== 'ALL' && student.branch !== selectedBranch) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (student.name || '').toLowerCase().includes(q);
        const matchesUsn = (student.usn || '').toLowerCase().includes(q);
        const matchesEmail = (student.email || '').toLowerCase().includes(q);
        const matchesBranch = (student.branch || '').toLowerCase().includes(q);
        const matchesToken = (student.token || '').toLowerCase().includes(q);
        return matchesName || matchesUsn || matchesEmail || matchesBranch || matchesToken;
      }

      return true;
    });
  }, [localStudents, type, searchQuery, selectedBranch, selectedStatusFilter]);

  // Filter scanners based on search query
  const filteredScanners = useMemo(() => {
    if (type !== 'scanners') return [];
    return localScanners.filter((scanner) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchesName = (scanner.name || '').toLowerCase().includes(q);
      const matchesCode = (scanner.access_code || '').toLowerCase().includes(q);
      const matchesEmail = (scanner.email || '').toLowerCase().includes(q);
      return matchesName || matchesCode || matchesEmail;
    });
  }, [localScanners, type, searchQuery]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    playFeedbackSound('click');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Toggle student check-in
  const handleToggleStudentCheckIn = async (student: Student) => {
    const currentStatus = Boolean(student.is_checked_in || student.checked_in);
    const newStatus = !currentStatus;
    try {
      setIsActionLoading(student.id);
      playFeedbackSound('click');
      setLocalStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_checked_in: newStatus, checked_in: newStatus } : s))
      );
      await studentsApi.toggleCheckIn(student.id, newStatus);
      onDataChanged();
    } catch (err) {
      console.error('Failed to toggle student check-in status:', err);
      setLocalStudents(students);
      playFeedbackSound('error');
    } finally {
      setIsActionLoading(null);
    }
  };

  // Toggle scanner status
  const handleToggleScannerStatus = async (scanner: ScannerAccount) => {
    const newStatus = !scanner.is_active;
    try {
      setIsActionLoading(scanner.id);
      playFeedbackSound('click');
      setLocalScanners((prev) =>
        prev.map((s) => (s.id === scanner.id ? { ...s, is_active: newStatus } : s))
      );
      if (eventId) {
        await scannersApi.update(eventId, scanner.id, { is_active: newStatus });
      } else {
        await scannersApi.toggleActive(scanner.id, newStatus);
      }
      onDataChanged();
    } catch (err) {
      console.error('Failed to toggle scanner status:', err);
      setLocalScanners(scanners);
      playFeedbackSound('error');
    } finally {
      setIsActionLoading(null);
    }
  };

  if (!mounted || !type) return null;

  return createPortal(
    <div
      id="metric-detail-portal-wrapper"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-5 overflow-hidden"
    >
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity animate-fade-in"
      />

      {/* 2. Modal Main Card */}
      <div
        className="relative w-full max-w-3xl max-h-[92dvh] h-auto bg-[#0d122b] border border-white/20 rounded-3xl sm:rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 animate-scale-up"
        style={{ animationDuration: '200ms' }}
      >
        {/* Top Gradient Ambient Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />

        {/* Modal Top Bar Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.04]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                type === 'total'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : type === 'checked_in'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : type === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              }`}
            >
              {type === 'total' && <Users className="w-5 h-5" />}
              {type === 'checked_in' && <CheckCircle2 className="w-5 h-5" />}
              {type === 'pending' && <Clock className="w-5 h-5" />}
              {type === 'scanners' && <Smartphone className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white font-['Space_Grotesk'] truncate">
                  {type === 'total' && 'Total Registered Attendees'}
                  {type === 'checked_in' && 'Checked-In Attendees (Admissions)'}
                  {type === 'pending' && 'Pending Attendees Awaiting Arrival'}
                  {type === 'scanners' && 'Operational Gate Scanners'}
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    type === 'total'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : type === 'checked_in'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : type === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}
                >
                  {type === 'total' && `${totalAttendees} Total`}
                  {type === 'checked_in' && `${totalCheckedIn} Admitted (${checkinPercentage}%)`}
                  {type === 'pending' && `${totalRemaining} Pending`}
                  {type === 'scanners' && `${scanners.length} Terminals`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {type === 'total' && 'Attendee registry with USN, branch, and check-in statuses.'}
                {type === 'checked_in' && 'Live confirmed admissions through gate scanners.'}
                {type === 'pending' && 'Expected guests awaiting arrival. Manual check-in available.'}
                {type === 'scanners' && 'Active scanner credentials and operational states.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Sub-Filter Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-white/[0.08] bg-black/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search through any credentials"
              className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sub-Filters for Attendees */}
          {type !== 'scanners' && (
            <div className="flex items-center gap-2 flex-wrap">
              {branches.length > 0 && (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-100 py-1.5">All Branches ({students.length})</option>
                  {branches.map((b) => (
                    <option key={b} value={b} className="bg-slate-900 text-slate-100 py-1.5">
                      {b}
                    </option>
                  ))}
                </select>
              )}

              {type === 'total' && (
                <div className="flex items-center p-0.5 bg-slate-900/90 rounded-xl border border-white/15 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter('ALL')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      selectedStatusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({totalAttendees})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter('CHECKED_IN')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      selectedStatusFilter === 'CHECKED_IN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Admitted ({totalCheckedIn})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter('PENDING')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      selectedStatusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pending ({totalRemaining})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Action for Scanners */}
          {type === 'scanners' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Launch Station</span>
            </button>
          )}
        </div>

        {/* Scrollable Content List */}
        <div className="flex-1 min-h-[220px] max-h-[58vh] overflow-y-auto p-3.5 sm:p-5 space-y-2.5 apple-momentum-scroll">
          {/* SCENARIO 1: SCANNERS LIST */}
          {type === 'scanners' && (
            <div className="space-y-2.5">
              {filteredScanners.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400">No scanner stations found matching your query.</p>
                </div>
              ) : (
                filteredScanners.map((scanner) => (
                  <div
                    key={scanner.id}
                    className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-white font-['Space_Grotesk'] truncate">
                            {scanner.name}
                          </h3>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.2 rounded-full border ${
                              scanner.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {scanner.is_active ? '● OPERATIONAL' : '○ DISABLED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono flex-wrap">
                          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                            <Key className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold text-slate-200">{scanner.access_code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(scanner.access_code, scanner.id)}
                              className="text-slate-400 hover:text-white p-0.5 cursor-pointer ml-0.5"
                              title="Copy Access Code"
                            >
                              {copiedCode === scanner.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {scanner.email && <span className="truncate max-w-[150px]">{scanner.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleScannerStatus(scanner)}
                        disabled={isActionLoading === scanner.id}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                          scanner.is_active
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {scanner.is_active ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenScanner();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-white/15"
                      >
                        <span>Open Station</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SCENARIO 2: ATTENDEES LIST (Total / Checked In / Pending) */}
          {type !== 'scanners' && (
            <div className="space-y-2">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">No attendees found</p>
                    <p className="text-[11px] text-slate-400">
                      {searchQuery
                        ? 'No attendees matching your search criteria.'
                        : type === 'checked_in'
                        ? 'No attendees checked in yet. Start scanning passes to see live entries!'
                        : 'No pending attendees in this selection.'}
                    </p>
                  </div>
                  {type === 'checked_in' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenScanner();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg inline-flex items-center gap-1.5 transition-all cursor-pointer mt-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Open Gate Scanner</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isChecked = Boolean(student.is_checked_in || student.checked_in);
                  return (
                    <div
                      key={student.id}
                      className={`rounded-2xl p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isChecked
                          ? 'bg-emerald-950/25 border-emerald-500/25 hover:border-emerald-500/40'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Attendee Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-[11px] border ${
                            isChecked
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-white/10 text-slate-300'
                          }`}
                        >
                          {student.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white font-['Space_Grotesk'] truncate">
                              {student.name}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${
                                isChecked
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {isChecked ? '✓ ADMITTED' : '○ PENDING'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap font-mono">
                            <span className="font-semibold text-slate-300">{student.usn}</span>
                            {student.branch && (
                              <span className="px-1 py-0.1 bg-white/5 rounded border border-white/10">
                                {student.branch}
                              </span>
                            )}
                            {student.email && <span className="truncate max-w-[140px]">{student.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right Check-in Action */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isChecked && student.checked_in_at && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {new Date(student.checked_in_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleStudentCheckIn(student)}
                          disabled={isActionLoading === student.id}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50 border ${
                            isChecked
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30 text-white shadow-md'
                          }`}
                        >
                          {isChecked ? (
                            <>
                              <RotateCcw className="w-3 h-3" />
                              <span>Undo Check-In</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Check In Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400 font-mono truncate">
            {type === 'scanners' ? `${filteredScanners.length} terminal(s)` : `${filteredStudents.length} attendee(s)`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab(type === 'scanners' ? 'scanners' : 'students');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-white/15"
            >
              <span>{type === 'scanners' ? 'Manage Stations' : 'Full Registry'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-[11px] font-bold shadow-lg transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
