import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  QrCode,
  Barcode,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  RotateCcw,
  CheckCheck,
  UserCheck,
  Building,
  Filter,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Eye,
  Copy,
  Check,
  User,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { Student } from '../../types';
import { playFeedbackSound } from '../../lib/sound';
import { DigitalEventPassModal } from '../common/DigitalEventPassModal';

interface ScannerRosterTabProps {
  students: Student[];
  onToggleCheckIn?: (studentId: string, currentStatus: boolean) => void;
  onBackToHome?: () => void;
}

export const ScannerRosterTab: React.FC<ScannerRosterTabProps> = ({
  students,
  onToggleCheckIn,
  onBackToHome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CHECKED_IN' | 'PENDING'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Expanded student dropdown set
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedStudentForPass, setSelectedStudentForPass] = useState<Student | null>(null);

  // Unique branches for filter
  const branches = Array.from(
    new Set(students.map((s) => s.branch || 'General'))
  ).sort();

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const query = (searchTerm || '').toLowerCase().trim();
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.usn.toLowerCase().includes(query) ||
      s.qr_code.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.phone_number && s.phone_number.includes(query)) ||
      (s.branch && s.branch.toLowerCase().includes(query));

    const isChecked = Boolean(s.is_checked_in || s.checked_in);
    const matchesStatus =
      filterMode === 'ALL' ||
      (filterMode === 'CHECKED_IN' && isChecked) ||
      (filterMode === 'PENDING' && !isChecked);

    const matchesBranch =
      selectedBranch === 'ALL' || (s.branch || 'General') === selectedBranch;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const checkedInCount = students.filter(
    (s) => s.is_checked_in || s.checked_in
  ).length;
  const pendingCount = Math.max(0, students.length - checkedInCount);

  const toggleExpandStudent = (studentId: string) => {
    playFeedbackSound('click');
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    playFeedbackSound('click');
    if (
      expandedStudentIds.size === filteredStudents.length &&
      filteredStudents.length > 0
    ) {
      setExpandedStudentIds(new Set());
    } else {
      setExpandedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleCopyText = (fieldKey: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    playFeedbackSound('click');
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldKey ? null : curr));
    }, 2000);
  };

  const isAllExpanded =
    filteredStudents.length > 0 &&
    expandedStudentIds.size === filteredStudents.length;

  return (
    <div
      id="scanner-roster-tab"
      className="space-y-4 sm:space-y-5 pb-28 animate-fade-in max-w-4xl mx-auto w-full"
    >
      {/* 1. Header Card with Back to Home Button */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 relative overflow-hidden shadow-2xl bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              {onBackToHome && (
                <button
                  id="roster-back-home-btn"
                  onClick={() => {
                    playFeedbackSound('click');
                    onBackToHome();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-white/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Home</span>
                </button>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Attendee Management</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight">
              Registered Attendees Roster ({students.length})
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Verified attendee list for lookups, token validation & emergency manual check-ins
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{checkedInCount} Checked In</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-white/10 flex items-center gap-1.5 shadow-sm">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{pendingCount} Remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Controls Toolbar */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-xl bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="roster-search-input"
              type="text"
              placeholder="Search through any credentials"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Branch Filter Selector */}
          {branches.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                id="roster-branch-filter"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 cursor-pointer focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  All Departments ({branches.length})
                </option>
                {branches.map((b) => (
                  <option key={b} value={b} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Filter Chips & Expand All Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60 dark:border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilterMode('CHECKED_IN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'CHECKED_IN'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Checked In ({checkedInCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('PENDING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'PENDING'
                  ? 'bg-amber-500 dark:bg-amber-400 text-white dark:text-slate-950 shadow-md shadow-amber-400/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({pendingCount})</span>
            </button>
          </div>

          {/* Toggle Expand / Collapse All */}
          {filteredStudents.length > 0 && (
            <button
              onClick={toggleExpandAll}
              className="self-end sm:self-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              {isAllExpanded ? (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Expand All Details</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Attendee Accordion Cards with Dropdown Details */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 border border-slate-200 dark:border-white/10 text-center space-y-3 shadow-lg bg-white/80 dark:bg-slate-900/60">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {students.length === 0 ? 'No Attendees on Roster' : 'No Attendees Found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {students.length === 0
                ? 'No attendee records have been added to this event yet.'
                : `No matching records found for "${searchTerm || 'current filters'}". Try adjusting your search query or filter.`}
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterMode('ALL');
                  setSelectedBranch('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-bold transition-all cursor-pointer inline-block"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredStudents.map((student, idx) => {
            const isAdmitted = Boolean(student.is_checked_in || student.checked_in);
            const isExpanded = expandedStudentIds.has(student.id);
            const initials = student.name
              ? student.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
              : 'ST';

            return (
              <div
                key={student.id}
                id={`roster-student-${student.id}`}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-md ${
                  isAdmitted
                    ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {/* Accordion Summary Row - Clicking anywhere toggles dropdown */}
                <div
                  onClick={() => toggleExpandStudent(student.id)}
                  className="p-4 sm:p-4.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  {/* Left Side: Chevron + Avatar + Primary Name & USN */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Dropdown Chevron Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandStudent(student.id);
                      }}
                      className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 mt-0.5 sm:mt-0 ${
                        isExpanded
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      title={isExpanded ? 'Collapse attendee details' : 'Expand attendee details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      />
                    </button>

                    {/* Initials Avatar */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                        isAdmitted
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {initials}
                    </div>

                    {/* Attendee Identity & Badges */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate">
                          {student.name}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-mono">
                          #{student.sl_no || idx + 1}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* High-contrast USN Pill */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 text-xs font-mono font-bold tracking-wide">
                          {student.usn}
                        </span>

                        {/* Branch & Year */}
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
                          {student.branch || 'General'}
                          {student.year ? ` • Year ${student.year}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Check-in Status & Quick Action Button */}
                  <div
                    className="flex items-center gap-2.5 self-end sm:self-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAdmitted ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Admitted</span>
                        </span>

                        {onToggleCheckIn && (
                          <button
                            onClick={() => onToggleCheckIn(student.id, true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300 text-slate-600 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            title="Undo check-in status"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      onToggleCheckIn && (
                        <button
                          onClick={() => onToggleCheckIn(student.id, false)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Admit Manual</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Dropdown Details Panel (Smooth Expand Animation) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="border-t border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-[#0c101a] p-4 sm:p-5"
                    >
                      <div className="bg-white dark:bg-[#151926] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                        {/* Header Banner inside Dropdown */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                              DETAILS: {student.name} ({student.usn})
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 dark:text-slate-400">
                              Roster #{student.sl_no || idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedStudentForPass(student)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/25"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>View Digital Event Pass</span>
                            </button>
                          </div>
                        </div>

                        {/* 3-Column Detailed Information Grid (Academic, Digital Pass, Status) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {/* Column 1: Academic & Contact Profile */}
                          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Student Profile</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>Full Name:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {student.name}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>USN / Roll:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                    {student.usn}
                                  </span>
                                  <button
                                    onClick={(e) => handleCopyText(`usn-${student.id}`, student.usn, e)}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 cursor-pointer"
                                    title="Copy USN"
                                  >
                                    {copiedField === `usn-${student.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>Email:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px] truncate max-w-[130px]">
                                    {student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}@college.edu`}
                                  </span>
                                  <button
                                    onClick={(e) =>
                                      handleCopyText(
                                        `email-${student.id}`,
                                        student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}@college.edu`,
                                        e
                                      )
                                    }
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 cursor-pointer"
                                    title="Copy Email"
                                  >
                                    {copiedField === `email-${student.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>Phone:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px]">
                                    {student.phone_number || '+91 9876543210'}
                                  </span>
                                  <button
                                    onClick={(e) =>
                                      handleCopyText(
                                        `phone-${student.id}`,
                                        student.phone_number || '+91 9876543210',
                                        e
                                      )
                                    }
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 cursor-pointer"
                                    title="Copy Phone"
                                  >
                                    {copiedField === `phone-${student.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Pass Credentials & Tokens */}
                          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                              <QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Pass Credentials & Tokens</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                                  <span>QR Token:</span>
                                  <button
                                    onClick={(e) => handleCopyText(`qr-${student.id}`, student.qr_code, e)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                                  >
                                    {copiedField === `qr-${student.id}` ? (
                                      <span className="text-emerald-500 font-bold">Copied!</span>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-black/50 border border-slate-300 dark:border-white/10 font-mono text-[10px] text-slate-800 dark:text-slate-300 truncate">
                                  {student.qr_code}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                                  <span>1D Barcode:</span>
                                  <button
                                    onClick={(e) =>
                                      handleCopyText(`bc-${student.id}`, student.barcode || student.usn, e)
                                    }
                                    className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                                  >
                                    {copiedField === `bc-${student.id}` ? (
                                      <span className="text-emerald-500 font-bold">Copied!</span>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-black/50 border border-slate-300 dark:border-white/10 font-mono text-[10px] text-slate-800 dark:text-slate-300 truncate">
                                  {student.barcode || student.usn}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 3: Attendance Status & Controls */}
                          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Verification Status</span>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                  <span>Status:</span>
                                  {isAdmitted ? (
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Admitted</span>
                                    </span>
                                  ) : (
                                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>Pending Check-In</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                                  <span>Department:</span>
                                  <span className="font-medium text-slate-800 dark:text-slate-300">
                                    {student.branch || 'General'}
                                  </span>
                                </div>

                                {student.checked_in_at && (
                                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                                    <span>Checked In At:</span>
                                    <span className="font-mono text-slate-800 dark:text-slate-300">
                                      {new Date(student.checked_in_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button inside Dropdown */}
                            {onToggleCheckIn && (
                              <div className="pt-2">
                                {isAdmitted ? (
                                  <button
                                    onClick={() => onToggleCheckIn(student.id, true)}
                                    className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Undo Admission Status</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onToggleCheckIn(student.id, false)}
                                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Confirm Manual Check-In</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Digital Event Pass Modal popup */}
      {selectedStudentForPass && (
        <DigitalEventPassModal
          student={selectedStudentForPass}
          onClose={() => setSelectedStudentForPass(null)}
        />
      )}
    </div>
  );
};
