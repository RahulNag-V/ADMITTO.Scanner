import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  QrCode,
  Barcode,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Trash2,
  ExternalLink,
  Printer,
  Copy,
  Check,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronsDownUp,
  Mail,
  Phone,
  GraduationCap,
  Building,
  User,
  ShieldCheck,
  Eye,
  RotateCcw,
  Maximize2,
  Key,
  Lock,
  ArrowRight,
  ArrowLeft,
  Shield,
  Sparkles,
  Save,
} from 'lucide-react';
import { Student, StudentImportRow, QrMode, EventScanConfig, UniquenessValidationResult, EventItem } from '../../types';
import { studentsApi, scanApi, eventsApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { getAttendeeLabels } from '../../lib/attendeeTypes';
import { DigitalEventPassModal } from '../../components/common/DigitalEventPassModal';
import { Skeleton, SkeletonTableRow, TabSkeletonView } from '../../components/common/Skeleton';

const AttendeeQRCodeImage: React.FC<{ value: string; size?: number }> = ({ value, size = 80 }) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(setQrSrc)
      .catch((err) => console.error('Failed to generate QR in dropdown:', err));
  }, [value, size]);

  if (!qrSrc) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-white rounded-lg flex items-center justify-center animate-pulse"
      >
        <QrCode className="w-8 h-8 text-zinc-400" />
      </div>
    );
  }

  return (
    <img
      src={qrSrc}
      alt={`QR Code: ${value}`}
      style={{ width: size, height: size }}
      className="rounded object-contain"
    />
  );
};

interface StudentsPageProps {
  eventId: string;
  event?: EventItem;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ eventId, event }) => {
  const [eventDetails, setEventDetails] = useState<EventItem | null>(event || null);
  const { singular, plural, primaryKeyLabel, preset } = getAttendeeLabels(eventDetails || undefined);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'PENDING'>('ALL');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Expanded student dropdown details
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudentForBadge, setSelectedStudentForBadge] = useState<Student | null>(null);

  // Single Add Form
  const [singleUsn, setSingleUsn] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleBranch, setSingleBranch] = useState('Computer Science');
  const [singleYear, setSingleYear] = useState('2026');
  const [singleSection, setSingleSection] = useState('A');
  const [isAdding, setIsAdding] = useState(false);

  // 5-Step Attendee Identification & QR Configuration Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [rawSpreadsheetRows, setRawSpreadsheetRows] = useState<Record<string, any>[]>([]);
  const [parsedRows, setParsedRows] = useState<StudentImportRow[]>([]);
  const [primaryKeyField, setPrimaryKeyField] = useState<string>('USN');
  const [secondaryKeyField, setSecondaryKeyField] = useState<string>('');
  const [qrMode, setQrMode] = useState<QrMode>('SECURE_TOKEN');
  const [barcodeField, setBarcodeField] = useState<string>('primary_key');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [uniquenessResult, setUniquenessResult] = useState<UniquenessValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicates?: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Checkbox Selection & Bulk Delete State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadStudents();
    }
  }, [eventId]);

  const toggleSelectStudent = (studentId: string) => {
    playFeedbackSound('click');
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    playFeedbackSound('click');
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const idsToDelete: string[] = Array.from(selectedStudentIds);
      await Promise.all(
        idsToDelete.map((id: string) =>
          studentsApi.delete(eventId, id).catch(() => studentsApi.delete(id))
        )
      );

      setStudents((prev) => prev.filter((s) => !selectedStudentIds.has(s.id)));
      setExpandedStudentIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedStudentIds(new Set());
      setIsBulkDeleteModalOpen(false);
      playFeedbackSound('success');
    } catch (err: any) {
      console.error('Failed to bulk delete attendees:', err);
      playFeedbackSound('error');
      alert(err.message || 'Failed to delete some attendees.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const [res, eventRes] = await Promise.all([
        studentsApi.list(eventId),
        eventsApi.get(eventId).catch(() => null),
        new Promise((r) => setTimeout(r, 250)),
      ]);
      setStudents(res.students);
      if (eventRes?.event) {
        setEventDetails(eventRes.event);
        if (eventRes.event.primary_scan_field) {
          setPrimaryKeyField(eventRes.event.primary_scan_field.toUpperCase());
        }
      }
    } catch (err) {
      console.error('Failed to load attendees:', err);
    } finally {
      setLoading(false);
    }
  };

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
    if (expandedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setExpandedStudentIds(new Set());
    } else {
      setExpandedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleCopyText = (fieldKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    playFeedbackSound('click');
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldKey ? null : curr));
    }, 2000);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUsn || !singleName) return;
    setIsAdding(true);

    try {
      const res = await studentsApi.create({
        event_id: eventId,
        usn: (singleUsn || '').trim().toUpperCase(),
        name: (singleName || '').trim(),
        email: singleEmail?.trim() || undefined,
        phone_number: singlePhone?.trim() || undefined,
        branch: singleBranch,
        year: singleYear,
        section: singleSection,
      });

      if (res.student) {
        playFeedbackSound('success');
        setStudents([res.student, ...students]);
        setIsAddModalOpen(false);
        // Reset
        setSingleUsn('');
        setSingleName('');
        setSingleEmail('');
        setSinglePhone('');
      }
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || 'Failed to add attendee');
    } finally {
      setIsAdding(false);
    }
  };

  const handleManualCheckInToggle = async (student: Student) => {
    try {
      playFeedbackSound('click');
      const newStatus = !student.checked_in;
      const res = await studentsApi.toggleCheckIn(student.id, newStatus);
      if (res.student) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? {
                ...s,
                checked_in: newStatus,
                is_checked_in: newStatus,
                checked_in_at: newStatus ? new Date().toISOString() : undefined,
              }
              : s
          )
        );
        if (newStatus) playFeedbackSound('success');
      }
    } catch (err: any) {
      alert(err.message || 'Check-in state update failed');
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmMsg = `Are you sure you want to delete attendee "${student.name}" (USN: ${student.usn})?\n\nThis will remove their generated pass and any attendance records.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingStudentId(student.id);
    try {
      // Call delete with both eventId and studentId for robust routing
      await studentsApi.delete(eventId, student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setExpandedStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
      playFeedbackSound('click');
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      // Fallback try with single param
      try {
        await studentsApi.delete(student.id);
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        playFeedbackSound('click');
      } catch (fallbackErr: any) {
        alert(fallbackErr.message || err.message || 'Failed to delete attendee record.');
      }
    } finally {
      setDeletingStudentId(null);
    }
  };

  // Spreadsheet & CSV File Processing (Supports .xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    parseSpreadsheet(file);
  };

  const checkDatasetUniqueness = (
    rows: Record<string, any>[],
    primaryKey: string,
    secondaryKey?: string | null
  ): UniquenessValidationResult => {
    if (!rows || rows.length === 0) {
      return {
        is_unique: true,
        total_records: 0,
        unique_values_count: 0,
        duplicate_values: [],
        requires_secondary: false,
        message: 'No attendee records loaded.',
      };
    }

    const getVal = (row: any, key: string): string => {
      if (!key) return '';
      const direct = row[key] ?? row[key.toLowerCase()];
      if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
      const foundKey = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim();
      }
      return '';
    };

    // 1. Check Primary Key Uniqueness
    const primaryCounts = new Map<string, number>();
    for (const r of rows) {
      const pVal = getVal(r, primaryKey).toUpperCase();
      if (!pVal) continue;
      primaryCounts.set(pVal, (primaryCounts.get(pVal) || 0) + 1);
    }

    const duplicates: { value: string; count: number }[] = [];
    for (const [val, count] of primaryCounts.entries()) {
      if (count > 1) {
        duplicates.push({ value: val, count });
      }
    }

    if (duplicates.length === 0) {
      return {
        is_unique: true,
        total_records: rows.length,
        unique_values_count: primaryCounts.size,
        duplicate_values: [],
        requires_secondary: false,
        message: `Verified! All ${rows.length} attendee records have unique "${primaryKey}" values.`,
      };
    }

    if (!secondaryKey) {
      return {
        is_unique: false,
        total_records: rows.length,
        unique_values_count: primaryCounts.size,
        duplicate_values: duplicates.slice(0, 10),
        requires_secondary: true,
        message: `Duplicate primary key detected: "${primaryKey}" contains ${duplicates.length} duplicate values affecting ${duplicates.reduce((acc, d) => acc + d.count, 0)} records. Please select a secondary verification key.`,
      };
    }

    // 2. Validate Composite Key (Primary + Secondary)
    const compositeCounts = new Map<string, number>();
    for (const r of rows) {
      const pVal = getVal(r, primaryKey).toUpperCase();
      const sVal = getVal(r, secondaryKey).toUpperCase();
      const composite = `${pVal}:::${sVal}`;
      compositeCounts.set(composite, (compositeCounts.get(composite) || 0) + 1);
    }

    const compositeDups: { value: string; count: number }[] = [];
    for (const [comp, count] of compositeCounts.entries()) {
      if (count > 1) {
        const [p, s] = comp.split(':::');
        compositeDups.push({ value: `${primaryKey}: ${p} + ${secondaryKey}: ${s}`, count });
      }
    }

    if (compositeDups.length === 0) {
      return {
        is_unique: true,
        total_records: rows.length,
        unique_values_count: compositeCounts.size,
        duplicate_values: [],
        requires_secondary: true,
        message: `Verified! Combining "${primaryKey}" + "${secondaryKey}" uniquely identifies all ${rows.length} attendees.`,
      };
    }

    return {
      is_unique: false,
      total_records: rows.length,
      unique_values_count: compositeCounts.size,
      duplicate_values: compositeDups.slice(0, 10),
      requires_secondary: true,
      message: `Combination of "${primaryKey}" + "${secondaryKey}" still contains ${compositeDups.length} duplicate pairs. Please select a different secondary key.`,
    };
  };

  const parseSpreadsheet = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        alert('The uploaded file contains no spreadsheet sheets.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (rawData.length <= 1) {
        alert('The uploaded spreadsheet contains no data rows.');
        return;
      }

      // Extract original column headers exactly as in the file
      const rawHeaders: string[] = rawData[0]
        .map((h: any) => String(h || '').trim())
        .filter((h: string) => h.length > 0);

      if (rawHeaders.length === 0) {
        alert('Could not detect column headers in the first row.');
        return;
      }

      const rows: Record<string, any>[] = [];
      for (let i = 1; i < rawData.length; i++) {
        const rowArr = rawData[i];
        if (!rowArr || rowArr.every((c: any) => String(c ?? '').trim() === '')) continue;
        const rowObj: Record<string, any> = {};
        for (let j = 0; j < rawHeaders.length; j++) {
          rowObj[rawHeaders[j]] = rowArr[j] !== undefined && rowArr[j] !== null ? String(rowArr[j]).trim() : '';
        }
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        alert('The spreadsheet contains no non-empty attendee data rows.');
        return;
      }

      setDetectedColumns(rawHeaders);
      setRawSpreadsheetRows(rows);

      // Best default key guess
      const guessedPrimary =
        rawHeaders.find((h) => {
          const l = h.toLowerCase();
          return (
            l.includes('usn') ||
            l.includes('id') ||
            l.includes('employee') ||
            l.includes('ticket') ||
            l.includes('roll') ||
            l.includes('reg')
          );
        }) || rawHeaders[0];

      setPrimaryKeyField(guessedPrimary);
      setSecondaryKeyField('');

      // Auto compute initial uniqueness
      const checkRes = checkDatasetUniqueness(rows, guessedPrimary);
      setUniquenessResult(checkRes);

      // Advance to Step 2: Choose Primary Key
      setWizardStep(2);
      playFeedbackSound('click');
    } catch (err: any) {
      console.error('Failed to parse spreadsheet file:', err);
      alert('Failed to parse spreadsheet file: ' + (err.message || 'Invalid format'));
    }
  };

  const handleCommitImport = async () => {
    if (!rawSpreadsheetRows || rawSpreadsheetRows.length === 0) return;
    setIsImporting(true);

    try {
      const getColVal = (row: Record<string, any>, colCandidates: string[], fallback = ''): string => {
        for (const cand of colCandidates) {
          const match = Object.keys(row).find((k) => k.toLowerCase() === cand.toLowerCase());
          if (match && row[match]) return String(row[match]).trim();
        }
        return fallback;
      };

      const preparedAttendees: Partial<Student>[] = rawSpreadsheetRows.map((r, i) => {
        const usnVal = (r[primaryKeyField] || r.usn || `ATT-${i + 1}`).toString().trim();
        const nameVal = getColVal(r, ['name', 'attendee', 'student', 'full name'], 'Attendee');
        const emailVal = getColVal(r, ['email', 'mail', 'email address']);
        const phoneVal = getColVal(r, ['phone', 'mobile', 'contact', 'cell', 'phone number']);
        const branchVal = getColVal(r, ['branch', 'dept', 'department', 'course', 'role'], 'General');
        const yearVal = getColVal(r, ['year', 'class', 'batch'], 'General');
        const sectionVal = getColVal(r, ['section', 'sec', 'division'], 'A');

        return {
          usn: usnVal,
          name: nameVal,
          email: emailVal || undefined,
          phone_number: phoneVal || undefined,
          branch: branchVal,
          year: yearVal,
          section: sectionVal,
          meta: r,
        };
      });

      const scanConfig: EventScanConfig = {
        primary_scan_field: primaryKeyField,
        secondary_scan_field: secondaryKeyField || null,
        qr_mode: qrMode,
        barcode_field: barcodeField,
        available_fields: detectedColumns,
        is_uniqueness_verified: uniquenessResult?.is_unique ?? true,
      };

      const res = await studentsApi.importCsv(eventId, preparedAttendees, scanConfig);
      setImportSummary({ imported: res.imported, duplicates: res.duplicates, errors: res.errors || [] });
      playFeedbackSound('success');
      loadStudents();
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.usn.toLowerCase().includes(search.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone_number && s.phone_number.includes(search)) ||
      (s.branch && s.branch.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'CHECKED_IN'
          ? (s.checked_in || s.is_checked_in)
          : !(s.checked_in || s.is_checked_in);

    return matchesSearch && matchesStatus;
  });

  const allExpanded = filteredStudents.length > 0 && expandedStudentIds.size === filteredStudents.length;

  if (loading && students.length === 0) {
    return <TabSkeletonView tabId="students" />;
  }

  return (
    <div id="students-management-page" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-white font-['Space_Grotesk']">
            {plural} Roster & Token Registry
          </h1>
          <p className="text-xs text-zinc-400">
            Manage {plural.toLowerCase()} registrations, inspect credentials, and generate instant verification passes.
          </p>
        </div>

        {/* Action Buttons: 2 on top (Expand + CSV Import), Add Attendee below */}
        <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
          {/* Top Row: Expand Details + CSV Import */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              id="expand-all-btn"
              onClick={toggleExpandAll}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap backdrop-blur-md"
            >
              {expandedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <>
                  <ChevronsDownUp className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Collapse ({filteredStudents.length})</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Expand Details ({filteredStudents.length})</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsImportModalOpen(true);
                setParsedRows([]);
                setImportSummary(null);
                setCsvFile(null);
              }}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap backdrop-blur-md"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Import {plural}</span>
            </button>
          </div>

          {/* Bottom Row: Add Attendee Primary Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add {singular}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 relative z-30 overflow-visible shadow-xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="attendee-search-input"
            type="text"
            placeholder={`Search by name, ${primaryKeyLabel.toLowerCase()}, email...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.08] border border-white/20 hover:border-white/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-400 backdrop-blur-md transition-colors"
          />
        </div>

        {/* Status and Branch Filters - Grid 2-col on mobile, flex row on desktop */}
        <div className="grid grid-cols-2 gap-2.5 w-full md:w-auto md:flex md:items-center">
          {/* Status Dropdown Menu */}
          <div className="relative w-full md:w-auto md:shrink-0 z-50" ref={statusDropdownRef}>
            {(() => {
              const totalCount = students.length;
              const checkedInCount = students.filter((s) => s.is_checked_in || (s as any).checked_in).length;
              const pendingCount = Math.max(0, totalCount - checkedInCount);

              const statusOptions = [
                {
                  id: 'ALL',
                  label: 'All Status',
                  count: totalCount,
                  icon: Users,
                  color: 'text-zinc-400',
                  badgeBg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                },
                {
                  id: 'CHECKED_IN',
                  label: 'Checked In',
                  count: checkedInCount,
                  icon: CheckCircle2,
                  color: 'text-emerald-400',
                  badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
                },
                {
                  id: 'PENDING',
                  label: 'Pending',
                  count: pendingCount,
                  icon: Clock,
                  color: 'text-amber-400',
                  badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
                },
              ];

              const currentOption = statusOptions.find((opt) => opt.id === statusFilter) || statusOptions[0];
              const CurrentIcon = currentOption.icon;

              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackSound('click');
                      setIsStatusDropdownOpen(!isStatusDropdownOpen);
                    }}
                    className="w-full md:w-auto h-10 px-3 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 border border-white/10 text-xs font-bold text-white flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-md select-none backdrop-blur-md"
                    aria-haspopup="true"
                    aria-expanded={isStatusDropdownOpen}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <CurrentIcon className={`w-3.5 h-3.5 ${currentOption.color} shrink-0`} />
                      <span className="truncate">{currentOption.label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border ${currentOption.badgeBg}`}>
                        {currentOption.count}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180 text-indigo-400' : ''
                          }`}
                      />
                    </div>
                  </button>

                  {/* Floating Status Dropdown Menu */}
                  {isStatusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-56 sm:w-60 bg-[#0c1020]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.95)] z-[100] animate-in fade-in slide-in-from-top-2 duration-150 max-w-[calc(100vw-32px)]">
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                        Filter by Admission Status
                      </div>
                      <div className="p-1 space-y-1">
                        {statusOptions.map((opt) => {
                          const OptIcon = opt.icon;
                          const isSelected = statusFilter === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                playFeedbackSound('click');
                                setStatusFilter(opt.id);
                                setIsStatusDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSelected
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <OptIcon className={`w-4 h-4 ${isSelected ? 'text-white' : opt.color}`} />
                                <span>{opt.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${isSelected
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
      </div>

      {/* Attendee Table */}
      <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/15 bg-white/[0.06] backdrop-blur-md text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="w-14 py-3.5 pl-4 pr-1 text-center"></th>
                <th className="py-3.5 px-4 tracking-wider">ATTENDEE / USN</th>
                <th className="py-3 px-4 pr-4 sm:pr-6 text-right whitespace-nowrap align-middle">
                  <div className="flex flex-col items-end gap-1.5 float-right">
                    {/* Top: Select All Toggle Button */}
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-semibold text-slate-200 hover:text-white inline-flex items-center gap-2 transition-all cursor-pointer select-none shadow-sm"
                      title={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? "Deselect All" : "Select All"}
                    >
                      <span className="font-['Space_Grotesk'] text-[11px] uppercase tracking-wider font-bold">Select</span>
                      <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                          ? 'bg-rose-500 border-rose-400 text-white shadow-sm shadow-rose-500/50'
                          : 'border-white/30 bg-white/5'
                      }`}>
                        {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 && (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        )}
                      </span>
                    </button>

                    {/* Below: Small Delete Button (Appears below SELECT only when items are checked) */}
                    <AnimatePresence>
                      {selectedStudentIds.size > 0 && (
                        <motion.button
                          key="delete-selected-below-btn"
                          id="table-header-delete-selected-btn"
                          type="button"
                          initial={{ opacity: 0, y: -4, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.92 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playFeedbackSound('click');
                            setIsBulkDeleteModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 hover:text-white text-[10px] font-bold inline-flex items-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-95 transition-all cursor-pointer select-none"
                          title={`Delete ${selectedStudentIds.size} selected attendee(s)`}
                        >
                          <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="font-['Space_Grotesk'] whitespace-nowrap">
                            Delete ({selectedStudentIds.size})
                          </span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <SkeletonTableRow key={i} />
                  ))}
                </>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center">
                    {students.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-4 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                            No attendees registered yet
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Import your attendee roster via CSV or Excel (XLSX/XLS) spreadsheet or add attendees manually to generate QR & barcode tokens.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 pt-1">
                          <button
                            onClick={() => {
                              setIsImportModalOpen(true);
                              setParsedRows([]);
                              setImportSummary(null);
                              setCsvFile(null);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Import {plural}</span>
                          </button>
                          <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add {singular}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-6">
                        No {plural.toLowerCase()} match your search or filter criteria.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isExpanded = expandedStudentIds.has(s.id);
                  const isCheckedIn = !!(s.checked_in || s.is_checked_in);
                  const isSelected = selectedStudentIds.has(s.id);

                  return (
                    <React.Fragment key={s.id}>
                      {/* Main Summary Row - Attendee, USN, and Checkbox on Right */}
                      <tr
                        onClick={() => toggleExpandStudent(s.id)}
                        className={`hover:bg-white/[0.08] transition-colors cursor-pointer ${
                          isSelected ? 'bg-rose-500/10' : isExpanded ? 'bg-white/[0.06]' : ''
                        }`}
                      >
                        {/* Dropdown Chevron toggle */}
                        <td className="py-4 pl-4 pr-1 text-center align-middle w-14">
                          <button
                            id={`dropdown-toggle-${s.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandStudent(s.id);
                            }}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${isExpanded
                              ? 'bg-white/20 border border-white/30 text-white shadow-md'
                              : 'text-zinc-400 hover:text-white hover:bg-white/10'
                              }`}
                            title={isExpanded ? 'Collapse details' : 'Expand student details'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-orange-400' : ''
                                }`}
                            />
                          </button>
                        </td>

                        {/* Name & Last 3 Digits of USN Stacked Consistently */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-white text-sm sm:text-base tracking-tight leading-tight">
                              {s.name}
                            </span>
                            {s.usn && (
                              <span className="inline-flex items-center justify-center bg-amber-500/20 text-amber-300 border border-amber-500/35 px-2 py-0.5 rounded-lg text-xs font-mono font-bold tracking-wider shadow-sm">
                                {s.usn.slice(-3)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Checkbox Selection on the Right with Light Red Selected State */}
                        <td className="py-4 pr-4 sm:pr-6 pl-2 text-right align-middle w-24">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectStudent(s.id);
                            }}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ml-auto select-none ${
                              isSelected
                                ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/35'
                                : 'bg-white/[0.08] hover:bg-white/[0.18] border-white/20 text-transparent'
                            }`}
                            title={`Select ${s.name}`}
                            aria-label={`Select ${s.name}`}
                          >
                            <Check className={`w-4 h-4 transition-transform ${isSelected ? 'scale-100 text-white stroke-[3]' : 'scale-0'}`} />
                          </button>
                        </td>
                      </tr>

                      {/* Detailed Information Accordion View */}
                      {isExpanded && (
                        <tr className="bg-white/[0.03]">
                          <td colSpan={3} className="p-3 sm:p-5">
                            <div className="bg-[#1c2340]/65 border border-white/20 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                              {/* Header Banner inside Dropdown */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/15 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-lg border border-orange-500/30">
                                    DETAILS: {s.name} ({s.usn})
                                  </span>
                                  <span className="text-zinc-500">•</span>
                                  <span className="text-zinc-300">Roster Serial #{s.sl_no || idx + 1}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedStudentForBadge(s)}
                                    className="px-3 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-orange-500/30"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Full Digital Event Pass</span>
                                  </button>
                                </div>
                              </div>

                              {/* 3-Column Detailed Information Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Card 1: Academic & Contact Profile */}
                                <div className="bg-white/[0.08] border border-white/15 backdrop-blur-md rounded-xl p-3.5 space-y-2.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                                    <User className="w-3.5 h-3.5 text-orange-400" />
                                    <span>{singular} Profile</span>
                                  </div>

                                  <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between text-zinc-400">
                                      <span>Full Name:</span>
                                      <span className="font-semibold text-white">{s.name}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-zinc-400">
                                      <span>{primaryKeyLabel}:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-mono text-orange-400 font-semibold">{s.usn}</span>
                                        <button
                                          onClick={() => handleCopyText(`usn-${s.id}`, s.usn)}
                                          className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                                          title="Copy USN"
                                        >
                                          {copiedField === `usn-${s.id}` ? (
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-zinc-400">
                                      <span>Email:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-zinc-300 truncate max-w-[130px]">
                                          {s.email || 'Not provided'}
                                        </span>
                                        {s.email && (
                                          <button
                                            onClick={() => handleCopyText(`email-${s.id}`, s.email!)}
                                            className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                                            title="Copy Email"
                                          >
                                            {copiedField === `email-${s.id}` ? (
                                              <Check className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-zinc-400">
                                      <span>Phone:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-zinc-300">{s.phone_number || '+91 Not specified'}</span>
                                        {s.phone_number && (
                                          <button
                                            onClick={() => handleCopyText(`phone-${s.id}`, s.phone_number!)}
                                            className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                                            title="Copy Phone"
                                          >
                                            {copiedField === `phone-${s.id}` ? (
                                              <Check className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-zinc-400">
                                      <span>Department:</span>
                                      <span className="text-zinc-200 font-medium">{s.branch || 'General'}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-zinc-400">
                                      <span>Year & Section:</span>
                                      <span className="text-zinc-200 font-medium">
                                        {s.year || '4th Year'} • Sec {s.section || 'A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card 2: Digital Pass & QR Code */}
                                <div className="bg-white/[0.08] border border-white/15 backdrop-blur-md rounded-xl p-3.5 flex flex-col justify-between items-center text-center space-y-3">
                                  <div className="w-full flex items-center justify-between text-xs font-bold text-zinc-300">
                                    <div className="flex items-center gap-1.5">
                                      <QrCode className="w-3.5 h-3.5 text-orange-400" />
                                      <span>Digital Pass & QR</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-zinc-400 font-normal">
                                      {s.usn}
                                    </span>
                                  </div>

                                  {/* Clean Pass Placeholder Tile */}
                                  <div
                                    onClick={() => setSelectedStudentForBadge(s)}
                                    className="w-full p-4 rounded-2xl bg-white/[0.05] border border-white/10 hover:border-orange-500/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group shadow-inner"
                                    title="Click to view full screen QR code pass"
                                  >
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-400 group-hover:scale-110 group-hover:bg-orange-500/25 transition-all shadow-md">
                                      <QrCode className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                                        Admission QR Pass
                                      </div>
                                      <div className="text-[10px] text-zinc-400 font-mono">
                                        Click to load high-res QR code
                                      </div>
                                    </div>
                                  </div>

                                  {/* Fullscreen QR Code View Button */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForBadge(s)}
                                    className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer select-none"
                                  >
                                    <QrCode className="w-4 h-4" />
                                    <span>View Fullscreen QR Pass</span>
                                    <Maximize2 className="w-3.5 h-3.5 ml-auto opacity-80" />
                                  </button>
                                </div>

                                {/* Card 3: Admission Status & Direct Controls */}
                                <div className="bg-white/[0.08] border border-white/15 backdrop-blur-md rounded-xl p-3.5 space-y-3">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                                    <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                                    <span>Admission & Record</span>
                                  </div>

                                  <div className="space-y-2 text-[11px]">
                                    <div className="p-2 rounded-xl bg-white/[0.05] border border-white/10 space-y-1">
                                      <div className="text-zinc-300 text-[10px]">Current Status:</div>
                                      <div className="flex items-center gap-1.5">
                                        {isCheckedIn ? (
                                          <span className="font-bold text-emerald-300 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Admitted (Verified at Gate)
                                          </span>
                                        ) : (
                                          <span className="font-bold text-zinc-300 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Admission
                                          </span>
                                        )}
                                      </div>
                                      {isCheckedIn && s.checked_in_at && (
                                        <div className="text-[10px] text-zinc-400 font-mono pt-0.5">
                                          Checked in at: {new Date(s.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons in Dropdown */}
                                    <div className="space-y-2 pt-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleManualCheckInToggle(s);
                                        }}
                                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isCheckedIn
                                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                                          }`}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>{isCheckedIn ? 'Revoke Admission' : 'Admit / Manual Check In'}</span>
                                      </button>
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

      {/* Single Add Modal via React Portal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151822] border border-zinc-700 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Add Single {singular}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">{primaryKeyLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={preset.primaryKeyPlaceholder || `Enter ${primaryKeyLabel}`}
                  value={singleUsn}
                  onChange={(e) => setSingleUsn(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">{singular} Full Name</label>
                <input
                  type="text"
                  required
                  placeholder={`Full Name of ${singular}`}
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="attendee@domain.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Department</label>
                  <input
                    type="text"
                    value={singleBranch}
                    onChange={(e) => setSingleBranch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Year</label>
                  <input
                    type="text"
                    value={singleYear}
                    onChange={(e) => setSingleYear(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Section</label>
                  <input
                    type="text"
                    value={singleSection}
                    onChange={(e) => setSingleSection(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  {isAdding ? 'Adding...' : `Save ${singular}`}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 5-Step Attendee Identification & QR Configuration Wizard Modal via React Portal */}
      {isImportModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151822] border border-zinc-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                    Attendee Import & Scan Key Configuration
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Step {wizardStep} of 5 — {
                      wizardStep === 1 ? 'Upload File' :
                      wizardStep === 2 ? 'Choose Primary Scanning Key' :
                      wizardStep === 3 ? 'Uniqueness & Duplicate Validation' :
                      wizardStep === 4 ? 'QR Code & Barcode Setup' :
                      'Review & Save Configuration'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setWizardStep(1);
                  setCsvFile(null);
                  setRawSpreadsheetRows([]);
                  setImportSummary(null);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer p-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Step Progress Tracker */}
            {!importSummary && (
              <div className="grid grid-cols-5 gap-1.5 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 text-[11px] font-medium">
                {[
                  { step: 1, label: 'Upload' },
                  { step: 2, label: 'Primary Key' },
                  { step: 3, label: 'Validation' },
                  { step: 4, label: 'QR & Barcode' },
                  { step: 5, label: 'Review' },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`py-1.5 text-center rounded-xl transition-all ${
                      wizardStep === s.step
                        ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30'
                        : wizardStep > s.step
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-zinc-500'
                    }`}
                  >
                    {s.step}. {s.label}
                  </div>
                ))}
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 1: UPLOAD ATTENDEE FILE (CSV / XLSX / XLS) */}
            {/* ======================================================== */}
            {wizardStep === 1 && !importSummary && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-orange-500 rounded-3xl p-8 text-center cursor-pointer space-y-3 bg-zinc-950/40 hover:bg-orange-500/5 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">Click or drag & drop CSV or Excel file here</div>
                    <div className="text-xs text-zinc-400">
                      Supports <span className="text-orange-400 font-mono">.csv</span>, <span className="text-orange-400 font-mono">.xlsx</span>, and <span className="text-orange-400 font-mono">.xls</span> spreadsheet files
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                    Columns are detected automatically from your file headers (e.g. USN, Employee ID, Name, Email, Role, Department).
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: CONFIGURE PRIMARY SCANNING KEY */}
            {/* ======================================================== */}
            {wizardStep === 2 && !importSummary && (
              <div className="space-y-5">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-1">
                  <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Configure Attendee Identification</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Your attendee data ({rawSpreadsheetRows.length} records) has been loaded. Choose the field that should be used as the <strong className="text-white">PRIMARY SCANNING KEY</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Primary Scanning Key:</span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      Detected {detectedColumns.length} columns
                    </span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detectedColumns.map((col) => {
                      const isSelected = primaryKeyField === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            playFeedbackSound('click');
                            setPrimaryKeyField(col);
                            const res = checkDatasetUniqueness(rawSpreadsheetRows, col, secondaryKeyField);
                            setUniquenessResult(res);
                          }}
                          className={`p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-orange-500/20 border-orange-500 text-white shadow-md shadow-orange-500/20 ring-1 ring-orange-500/40'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs truncate text-white">{col}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-1 font-mono">
                            Sample: {String(rawSpreadsheetRows[0]?.[col] || '-')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column Selection Advisory */}
                {['name', 'attendee', 'student', 'branch', 'dept', 'department', 'role'].some(k => primaryKeyField.toLowerCase().includes(k)) && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-300">
                      <strong>Notice:</strong> Fields like <em>{primaryKeyField}</em> often contain duplicate values across large rosters. If duplicates are found in the next step, a secondary verification key will be required.
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = checkDatasetUniqueness(rawSpreadsheetRows, primaryKeyField, secondaryKeyField);
                      setUniquenessResult(res);
                      setWizardStep(3);
                      playFeedbackSound('click');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Validate Uniqueness</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: UNIQUENESS VALIDATION & DUPLICATE RESOLUTION */}
            {/* ======================================================== */}
            {wizardStep === 3 && !importSummary && (
              <div className="space-y-5">
                {/* Result Card: Unique vs Duplicates */}
                {uniquenessResult?.is_unique && !uniquenessResult?.requires_secondary ? (
                  <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4.5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Dataset Uniqueness Verified (100% Unique)</span>
                    </div>
                    <p className="text-xs text-emerald-200/90">
                      {uniquenessResult.message} Every attendee can be uniquely and accurately identified using <strong className="text-white font-mono">{primaryKeyField}</strong>.
                    </p>
                  </div>
                ) : uniquenessResult?.is_unique && uniquenessResult?.requires_secondary ? (
                  <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4.5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Composite Key Verified (100% Unique)</span>
                    </div>
                    <p className="text-xs text-emerald-200/90">
                      Combining <strong className="text-white font-mono">{primaryKeyField}</strong> + <strong className="text-white font-mono">{secondaryKeyField}</strong> successfully resolves all duplicate ambiguities across {rawSpreadsheetRows.length} attendees.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4.5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Duplicate Primary Key Detected</span>
                    </div>
                    <p className="text-xs text-amber-200/90">
                      The selected primary key <strong className="text-white font-mono">{primaryKeyField}</strong> contains duplicates. Please select a <strong className="text-white">Secondary Verification Key</strong> to distinguish matching attendees.
                    </p>

                    {/* Duplicates List */}
                    {uniquenessResult?.duplicate_values && uniquenessResult.duplicate_values.length > 0 && (
                      <div className="bg-black/40 rounded-xl p-3 border border-amber-500/20 max-h-32 overflow-y-auto space-y-1 text-xs font-mono">
                        <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-1">
                          Sample Duplicate Values ({uniquenessResult.duplicate_values.length}):
                        </div>
                        {uniquenessResult.duplicate_values.map((dup, i) => (
                          <div key={i} className="flex items-center justify-between text-zinc-300 py-0.5">
                            <span className="truncate">{dup.value}</span>
                            <span className="text-amber-400 font-bold shrink-0">{dup.count} attendees</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Secondary Key Selector */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>
                      Secondary Verification Key {uniquenessResult?.requires_secondary ? '(Required)' : '(Optional)'}:
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Prompted during check-in if ambiguous
                    </span>
                  </label>

                  <select
                    value={secondaryKeyField}
                    onChange={(e) => {
                      const newSec = e.target.value;
                      setSecondaryKeyField(newSec);
                      const res = checkDatasetUniqueness(rawSpreadsheetRows, primaryKeyField, newSec || null);
                      setUniquenessResult(res);
                      playFeedbackSound('click');
                    }}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none cursor-pointer ${
                      uniquenessResult?.requires_secondary && !secondaryKeyField
                        ? 'border-amber-500 ring-1 ring-amber-500/50'
                        : 'border-zinc-700 focus:border-orange-500'
                    }`}
                  >
                    <option value="" className="bg-zinc-900 text-zinc-100 py-2">None / Not Required</option>
                    {detectedColumns
                      .filter((c) => c !== primaryKeyField)
                      .map((c) => (
                        <option key={c} value={c} className="bg-zinc-900 text-zinc-100 py-2">
                          {c} (Sample: {String(rawSpreadsheetRows[0]?.[c] || '-')})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={!uniquenessResult?.is_unique}
                    onClick={() => {
                      setWizardStep(4);
                      playFeedbackSound('click');
                    }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer ${
                      uniquenessResult?.is_unique
                        ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/25'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span>Continue to QR & Barcode Setup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4: QR CODE & BARCODE DATA CONFIGURATION */}
            {/* ======================================================== */}
            {wizardStep === 4 && !importSummary && (
              <div className="space-y-5">
                {/* QR Code Configuration Section */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-orange-400" />
                    <span>QR Code Data Format</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Option 1: Secure Attendee Token (Default) */}
                    <div
                      onClick={() => {
                        setQrMode('SECURE_TOKEN');
                        playFeedbackSound('click');
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        qrMode === 'SECURE_TOKEN'
                          ? 'bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40 shadow-md'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-white">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Secure Attendee Token (Recommended)</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Privacy Safe
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Generates a cryptographically random, non-guessable secure token. Attendee personal details stay safely in the server database.
                      </p>
                    </div>

                    {/* Option 2: Full Attendee Data */}
                    <div
                      onClick={() => {
                        setIsPrivacyModalOpen(true);
                        playFeedbackSound('click');
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        qrMode === 'FULL_DATA'
                          ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40 shadow-md'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-white">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Full Attendee Data</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Data Embedded
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Embeds attendee personal data (name, email, department, primary key) directly inside the QR payload JSON.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barcode Configuration Section */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-orange-400" />
                    <span>Barcode Data Target</span>
                  </div>

                  <select
                    value={barcodeField}
                    onChange={(e) => {
                      setBarcodeField(e.target.value);
                      playFeedbackSound('click');
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="primary_key" className="bg-zinc-900 text-zinc-100 py-2">
                      {primaryKeyField.trim().toLowerCase() === 'primary key' || primaryKeyField.trim().toLowerCase() === 'primary_key'
                        ? 'Primary Scanning Key'
                        : `Primary Scanning Key (${primaryKeyField})`}
                    </option>
                    {secondaryKeyField && (
                      <option value="secondary_key" className="bg-zinc-900 text-zinc-100 py-2">
                        {secondaryKeyField.trim().toLowerCase() === 'secondary key' || secondaryKeyField.trim().toLowerCase() === 'secondary_key'
                          ? 'Secondary Verification Key'
                          : `Secondary Verification Key (${secondaryKeyField})`}
                      </option>
                    )}
                    <option value="token" className="bg-zinc-900 text-zinc-100 py-2">Secure Unique Barcode Token</option>
                    {detectedColumns
                      .filter(
                        (col) =>
                          col.toLowerCase() !== primaryKeyField.toLowerCase() &&
                          (!secondaryKeyField || col.toLowerCase() !== secondaryKeyField.toLowerCase()) &&
                          col.toLowerCase() !== 'primary key' &&
                          col.toLowerCase() !== 'primary_key'
                      )
                      .map((col) => (
                        <option key={col} value={col} className="bg-zinc-900 text-zinc-100 py-2">
                          Column: {col}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardStep(5);
                      playFeedbackSound('click');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Review Configuration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 5: REVIEW & SAVE CONFIGURATION */}
            {/* ======================================================== */}
            {wizardStep === 5 && !importSummary && (
              <div className="space-y-5">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Configuration Summary
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Validated 100% Unique
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-zinc-500 text-[10px] uppercase">Primary Scanning Key</div>
                      <div className="font-bold text-orange-400 font-mono">{primaryKeyField}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-500 text-[10px] uppercase">Secondary Verification</div>
                      <div className="font-bold text-white font-mono">{secondaryKeyField || 'None (Single Key)'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-500 text-[10px] uppercase">QR Code Mode</div>
                      <div className="font-bold text-white font-mono">
                        {qrMode === 'SECURE_TOKEN' ? 'Secure Attendee Token' : 'Full Attendee Data (Embedded)'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-500 text-[10px] uppercase">Barcode Target</div>
                      <div className="font-bold text-white font-mono">{barcodeField}</div>
                    </div>
                  </div>
                </div>

                {/* Attendee Roster Preview Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-300">
                    Attendee Preview ({rawSpreadsheetRows.length} records ready to import):
                  </div>
                  <div className="border border-zinc-800 rounded-2xl max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-zinc-900 text-zinc-400 sticky top-0">
                        <tr>
                          <th className="p-2.5">{primaryKeyField} (Primary)</th>
                          <th className="p-2.5">Name</th>
                          {secondaryKeyField && <th className="p-2.5">{secondaryKeyField} (Sec)</th>}
                          <th className="p-2.5">Department</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {rawSpreadsheetRows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30">
                            <td className="p-2.5 font-mono text-orange-400 font-bold">
                              {r[primaryKeyField] || r.usn || '-'}
                            </td>
                            <td className="p-2.5 text-white">{r.name || r.Name || 'Attendee'}</td>
                            {secondaryKeyField && (
                              <td className="p-2.5 text-zinc-300 font-mono">{r[secondaryKeyField] || '-'}</td>
                            )}
                            <td className="p-2.5 text-zinc-400">{r.branch || r.department || r.dept || 'General'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    disabled={isImporting}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-2"
                  >
                    <Save className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                    <span>{isImporting ? 'Importing & Generating Tokens...' : `Save Configuration & Commit ${rawSpreadsheetRows.length} Attendees`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* IMPORT SUCCESS RESULT */}
            {/* ======================================================== */}
            {importSummary && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-4 animate-scale-in">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-white font-['Space_Grotesk']">
                    Import & Identification Setup Complete!
                  </h4>
                  <p className="text-xs text-emerald-300 max-w-md mx-auto">
                    Successfully imported <strong className="text-white">{importSummary.imported}</strong> attendees with primary scanning key <strong className="text-white font-mono">{primaryKeyField}</strong> and generated tokens.
                  </p>
                  {importSummary.duplicates && importSummary.duplicates > 0 ? (
                    <p className="text-[11px] text-zinc-400">
                      Skipped {importSummary.duplicates} pre-existing attendee records.
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setWizardStep(1);
                    setCsvFile(null);
                    setRawSpreadsheetRows([]);
                    setImportSummary(null);
                  }}
                  className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/25 transition-all"
                >
                  Return to Attendee Roster
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* QR Privacy Warning Modal */}
      {isPrivacyModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100001] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#151822] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                QR Privacy Warning
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                This option places attendee personal information (including name, email, department, and custom fields) directly inside the QR code data payload.
              </p>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Anyone who can photograph or decode the QR code will be able to read all embedded information. For sensitive events, the <strong>Secure Attendee Token</strong> mode is strongly recommended.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setQrMode('SECURE_TOKEN');
                  playFeedbackSound('click');
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
              >
                Cancel & Keep Secure Token
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setQrMode('FULL_DATA');
                  playFeedbackSound('click');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                I Understand — Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Second Verification Confirmation Modal for Checked Students via React Portal */}
      {isBulkDeleteModalOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#151a2e] border border-rose-500/40 backdrop-blur-3xl rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] relative z-[100000]"
            >
              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/35 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
                    Confirm Attendee Deletion
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Please review the <span className="text-rose-400 font-bold">{selectedStudentIds.size}</span> selected student(s) below. This action will permanently remove their access tokens and pass credentials.
                  </p>
                </div>
              </div>

              {/* List of Checked Students - USN and Name Only */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center justify-between px-1">
                  <span>Selected Attendees ({selectedStudentIds.size})</span>
                  <span className="text-amber-400">USN / Roll</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 p-3 rounded-2xl bg-black/40 border border-white/10 custom-scrollbar">
                  {students
                    .filter((s) => selectedStudentIds.has(s.id))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs hover:bg-white/[0.08] transition-colors"
                      >
                        <span className="font-bold text-white text-sm truncate pr-2">{s.name}</span>
                        <span className="font-mono text-amber-300 bg-amber-500/20 border border-amber-500/35 px-2.5 py-1 rounded-lg font-bold text-xs shrink-0">
                          {s.usn}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isBulkDeleting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer select-none"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 select-none"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isBulkDeleting
                      ? 'Deleting Attendees...'
                      : `Confirm & Delete (${selectedStudentIds.size})`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Digital Attendee Badge Modal */}
      <DigitalEventPassModal
        student={selectedStudentForBadge}
        onClose={() => setSelectedStudentForBadge(null)}
      />
    </div>
  );
};
