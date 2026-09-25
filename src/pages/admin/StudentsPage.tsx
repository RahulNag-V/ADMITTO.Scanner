import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  UserPlus,
  Layers,
  Sliders,
  ArrowUp,
  ArrowDown,
  Database,
  Type,
  Hash,
  Calendar,
  ListFilter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  Student,
  StudentImportRow,
  QrMode,
  EventScanConfig,
  UniquenessValidationResult,
  EventItem,
  ColumnConfig,
  ColumnType,
  BarcodeConfig,
  BarcodeExtractionMode,
  BarcodeExtractionPosition,
} from '../../types';
import {
  DEFAULT_COLUMNS,
  detectSchemaFromRows,
  validateRecordAgainstSchema,
  mapFormToStudent,
  formatCellValue,
  saveLocalSchema,
  loadLocalSchema,
} from '../../lib/attendeeSchema';
import { extractBarcodeIdentifier, validateAttendeeBarcodeExtraction } from '../../lib/barcodeValidator';
import { studentsApi, scanApi, eventsApi } from '../../lib/api';
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
  const { singular, plural, primaryKeyLabel, preset, groupingLabel, subGroupingLabel, divisionLabel } = getAttendeeLabels(eventDetails || undefined);

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

  // Dynamic Schema & Columns Management
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [uploadedDatasetName, setUploadedDatasetName] = useState<string | null>(null);
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const [editingColumns, setEditingColumns] = useState<ColumnConfig[]>([]);
  const [customizeError, setCustomizeError] = useState<string | null>(null);

  // Dynamic Add Form State
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [batchAddedCount, setBatchAddedCount] = useState(0);
  const [lastAddedAttendee, setLastAddedAttendee] = useState<{ name: string; usn: string } | null>(null);
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
  const [barcodeExtractionMode, setBarcodeExtractionMode] = useState<BarcodeExtractionMode>('custom');
  const [barcodeExtractionPosition, setBarcodeExtractionPosition] = useState<BarcodeExtractionPosition>('end');
  const [barcodeCharCount, setBarcodeCharCount] = useState<number>(5);
  const [barcodeFixedPrefix, setBarcodeFixedPrefix] = useState<string>('');
  const [barcodeFixedSuffix, setBarcodeFixedSuffix] = useState<string>('');
  const [showAdvancedBarcode, setShowAdvancedBarcode] = useState<boolean>(false);

  // Active target key for barcode generation
  const activeBarcodeTargetKey = (barcodeField === 'primary_key' || barcodeField === 'usn')
    ? primaryKeyField
    : (barcodeField === 'secondary_key' ? (secondaryKeyField || primaryKeyField) : barcodeField);

  // Sample ID from real uploaded dataset or fallback
  const sampleOriginalId = (() => {
    if (rawSpreadsheetRows && rawSpreadsheetRows.length > 0) {
      const match = rawSpreadsheetRows.find((r) => {
        const val = r[activeBarcodeTargetKey] || (activeBarcodeTargetKey.toLowerCase() === 'usn' ? r.usn : '');
        return val !== undefined && val !== null && String(val).trim().length > 0;
      });
      if (match) {
        const val = match[activeBarcodeTargetKey] || (activeBarcodeTargetKey.toLowerCase() === 'usn' ? match.usn : '');
        return String(val).trim();
      }
    }
    return '1BH24CS051';
  })();

  // Maximum ID length across the dataset for the selected field
  const maxBarcodeIdLength = (() => {
    if (rawSpreadsheetRows && rawSpreadsheetRows.length > 0) {
      let maxLen = 0;
      for (const r of rawSpreadsheetRows) {
        const val = String(r[activeBarcodeTargetKey] || (activeBarcodeTargetKey.toLowerCase() === 'usn' ? r.usn : '') || '').trim();
        if (val.length > maxLen) maxLen = val.length;
      }
      return Math.max(3, maxLen || sampleOriginalId.length);
    }
    return Math.max(3, sampleOriginalId.length);
  })();

  // Character count validation error
  const barcodeCharCountError = (() => {
    if (barcodeExtractionMode === 'full_id') return null;
    if (barcodeCharCount < 3) {
      return 'Minimum barcode length is 3 characters.';
    }
    if (barcodeCharCount > maxBarcodeIdLength) {
      return `Character count cannot exceed the selected ID length (${maxBarcodeIdLength}).`;
    }
    return null;
  })();

  // Live Extracted Barcode Identifier for sample
  const sampleExtractedBarcode = extractBarcodeIdentifier(sampleOriginalId, {
    extraction_mode: barcodeExtractionMode,
    extraction_position: barcodeExtractionPosition,
    character_count: barcodeCharCount,
    full_id: barcodeExtractionMode === 'full_id',
    fixed_prefix: barcodeFixedPrefix.trim() || null,
    fixed_suffix: barcodeFixedSuffix.trim() || null,
  });

  // Comprehensive transformation and validation of real uploaded rows
  const transformedUploadData = useMemo(() => {
    const config: BarcodeConfig = {
      enabled: true,
      identifier_field: activeBarcodeTargetKey,
      extraction_mode: barcodeExtractionMode,
      extraction_position: barcodeExtractionPosition,
      character_count: barcodeCharCount,
      full_id: barcodeExtractionMode === 'full_id',
      fixed_prefix: barcodeFixedPrefix.trim() || null,
      fixed_suffix: barcodeFixedSuffix.trim() || null,
      mode: barcodeExtractionMode === 'full_id' ? 'full' : (barcodeExtractionPosition === 'front' ? 'prefix' : 'suffix'),
      value: barcodeExtractionMode === 'full_id' ? '' : (barcodeFixedPrefix.trim() || barcodeFixedSuffix.trim() || ''),
      case_sensitive: false,
    };

    if (!rawSpreadsheetRows || rawSpreadsheetRows.length === 0) {
      return {
        rows: [],
        totalProcessed: 0,
        validCount: 0,
        conflictsCount: 0,
        errorsCount: 0,
        errorRecords: [] as { rowNumber: number; originalId: string; reason: string }[],
        conflicts: [] as { value: string; count: number; rows: number[] }[],
        isReady: true,
        config,
      };
    }

    const rows: {
      rowNumber: number;
      originalId: string;
      generatedBarcode: string;
      name: string;
      department: string;
      isValid: boolean;
      error?: string;
      raw: Record<string, any>;
    }[] = [];

    const errorRecords: { rowNumber: number; originalId: string; reason: string }[] = [];
    const countMap = new Map<string, { count: number; rows: number[] }>();

    for (let i = 0; i < rawSpreadsheetRows.length; i++) {
      const r = rawSpreadsheetRows[i];
      const rawVal = String(
        r[activeBarcodeTargetKey] !== undefined && r[activeBarcodeTargetKey] !== null
          ? r[activeBarcodeTargetKey]
          : ((activeBarcodeTargetKey.toLowerCase() === 'usn' ? r.usn : '') || r[primaryKeyField] || '')
      ).trim();

      const nameVal = String(r.name || r.attendee || r.student || r['Full Name'] || r['full name'] || 'Attendee').trim();
      const deptVal = String(r.branch || r.department || r.dept || r.course || 'General').trim();

      const validation = validateAttendeeBarcodeExtraction(rawVal, config);

      if (!validation.valid) {
        errorRecords.push({
          rowNumber: i + 1,
          originalId: rawVal || '(Empty)',
          reason: validation.error || 'Invalid ID value for extraction.',
        });
        rows.push({
          rowNumber: i + 1,
          originalId: rawVal,
          generatedBarcode: '',
          name: nameVal,
          department: deptVal,
          isValid: false,
          error: validation.error,
          raw: r,
        });
      } else {
        const normKey = validation.barcode.toUpperCase();
        const existing = countMap.get(normKey);
        if (existing) {
          existing.count++;
          existing.rows.push(i + 1);
        } else {
          countMap.set(normKey, { count: 1, rows: [i + 1] });
        }

        rows.push({
          rowNumber: i + 1,
          originalId: rawVal,
          generatedBarcode: validation.barcode,
          name: nameVal,
          department: deptVal,
          isValid: true,
          raw: r,
        });
      }
    }

    const conflicts: { value: string; count: number; rows: number[] }[] = [];
    countMap.forEach((entry, value) => {
      if (entry.count > 1) {
        conflicts.push({ value, count: entry.count, rows: entry.rows });
      }
    });

    const conflictsCount = conflicts.reduce((sum, c) => sum + c.count, 0);
    const errorsCount = errorRecords.length;
    const validCount = rows.filter((r) => r.isValid && !conflicts.some((c) => c.value === r.generatedBarcode.toUpperCase())).length;
    const isReady = errorsCount === 0 && conflicts.length === 0 && !barcodeCharCountError;

    return {
      rows,
      totalProcessed: rawSpreadsheetRows.length,
      validCount,
      conflictsCount,
      errorsCount,
      errorRecords,
      conflicts,
      isReady,
      config,
    };
  }, [
    rawSpreadsheetRows,
    activeBarcodeTargetKey,
    primaryKeyField,
    barcodeExtractionMode,
    barcodeExtractionPosition,
    barcodeCharCount,
    barcodeFixedPrefix,
    barcodeFixedSuffix,
    barcodeCharCountError,
  ]);

  // Backward-compatible alias for barcode uniqueness check
  const barcodeUniquenessCheck = {
    isUnique: transformedUploadData.conflicts.length === 0,
    totalChecked: transformedUploadData.totalProcessed,
    conflicts: transformedUploadData.conflicts,
  };
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [uniquenessResult, setUniquenessResult] = useState<UniquenessValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    percent: number;
    current: number;
    total: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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
    } catch (err: any) {
      console.error('Failed to bulk delete attendees:', err);
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

      const localCached = loadLocalSchema(eventId);

      if (eventRes?.event) {
        setEventDetails(eventRes.event);
        if (eventRes.event.primary_scan_field) {
          setPrimaryKeyField(eventRes.event.primary_scan_field.toUpperCase());
        }

        const scanCfg = eventRes.event.scan_config;
        if (scanCfg?.column_configs && scanCfg.column_configs.length > 0) {
          setColumns(scanCfg.column_configs);
          if (scanCfg.dataset_name) {
            setUploadedDatasetName(scanCfg.dataset_name);
          } else if (res.students.length > 0) {
            setUploadedDatasetName('Uploaded Dataset');
          }
        } else if (scanCfg?.available_fields && scanCfg.available_fields.length > 0) {
          const derived: ColumnConfig[] = scanCfg.available_fields.map((field, idx) => ({
            id: `col_loaded_${idx}`,
            name: field,
            type: field.toLowerCase().includes('email')
              ? 'email'
              : field.toLowerCase().includes('date')
              ? 'date'
              : field.toLowerCase().includes('age')
              ? 'number'
              : 'text',
            required: idx === 0 || field.toLowerCase().includes('name') || field.toLowerCase().includes('usn'),
          }));
          setColumns(derived);
          if (scanCfg.dataset_name) setUploadedDatasetName(scanCfg.dataset_name);
          else if (res.students.length > 0) setUploadedDatasetName('Uploaded Dataset');
        } else if (localCached?.columns && localCached.columns.length > 0) {
          setColumns(localCached.columns);
          if (localCached.datasetName) setUploadedDatasetName(localCached.datasetName);
          else if (res.students.length > 0) setUploadedDatasetName('Uploaded Dataset');
        } else if (res.students.length > 0) {
          // Derive schema from existing students
          const first = res.students[0];
          const detectedNames: string[] = [];
          if (first.meta && Object.keys(first.meta).length > 0) {
            detectedNames.push(...Object.keys(first.meta));
          } else {
            if (first.name) detectedNames.push('Name');
            if (first.usn) detectedNames.push('USN');
            if (first.email) detectedNames.push('Email');
            if (first.branch && first.branch !== 'General') detectedNames.push('Department');
            if (first.year && first.year !== 'General') detectedNames.push('Year');
            if (first.section && first.section !== 'A') detectedNames.push('Section');
          }
          if (detectedNames.length > 0) {
            const derived: ColumnConfig[] = detectedNames.map((name, idx) => ({
              id: `col_st_${idx}`,
              name,
              type: name.toLowerCase().includes('email')
                ? 'email'
                : name.toLowerCase().includes('date')
                ? 'date'
                : name.toLowerCase().includes('age')
                ? 'number'
                : 'text',
              required: idx === 0 || name.toLowerCase().includes('name') || name.toLowerCase().includes('usn'),
            }));
            setColumns(derived);
            setUploadedDatasetName('Uploaded Dataset');
          } else {
            setColumns(DEFAULT_COLUMNS);
          }
        } else {
          setColumns(DEFAULT_COLUMNS);
          setUploadedDatasetName(null);
        }
      } else if (localCached?.columns && localCached.columns.length > 0) {
        setColumns(localCached.columns);
        if (localCached.datasetName) setUploadedDatasetName(localCached.datasetName);
        else if (res.students.length > 0) setUploadedDatasetName('Uploaded Dataset');
      } else if (res.students.length > 0) {
        setUploadedDatasetName('Uploaded Dataset');
      } else {
        setColumns(DEFAULT_COLUMNS);
        setUploadedDatasetName(null);
      }
    } catch (err) {
      console.error('Failed to load attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandStudent = (studentId: string) => {
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
    if (expandedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setExpandedStudentIds(new Set());
    } else {
      setExpandedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleCopyText = (fieldKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldKey ? null : curr));
    }, 2000);
  };

  const openCustomizeColumnsModal = () => {
    setEditingColumns(JSON.parse(JSON.stringify(columns)));
    setCustomizeError(null);
    setIsCustomizeColumnsOpen(true);
  };

  const handleAddColumnToEditing = (name = '', type: ColumnType = 'text') => {
    const id = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const colName = name.trim() || `New Column ${editingColumns.length + 1}`;
    setEditingColumns((prev) => [
      ...prev,
      { id, name: colName, type, required: false },
    ]);
  };

  const handleRemoveColumnFromEditing = (id: string) => {
    if (editingColumns.length <= 1) {
      alert('You must retain at least one column.');
      return;
    }
    setEditingColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRenameColumnInEditing = (id: string, newName: string) => {
    setEditingColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const handleChangeTypeInEditing = (id: string, newType: ColumnType) => {
    setEditingColumns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              type: newType,
              options:
                newType === 'dropdown'
                  ? c.options && c.options.length > 0
                    ? c.options
                    : ['Option 1', 'Option 2']
                  : undefined,
            }
          : c
      )
    );
  };

  const handleToggleRequiredInEditing = (id: string) => {
    setEditingColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, required: !c.required } : c))
    );
  };

  const handleMoveColumnInEditing = (index: number, direction: 'up' | 'down') => {
    setEditingColumns((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleApplyCustomizeColumns = async () => {
    const trimmed = editingColumns.map((c) => ({ ...c, name: c.name.trim() }));
    if (trimmed.some((c) => !c.name)) {
      setCustomizeError('Column names cannot be empty.');
      return;
    }

    const nameCounts = new Map<string, number>();
    for (const c of trimmed) {
      const lower = c.name.toLowerCase();
      nameCounts.set(lower, (nameCounts.get(lower) || 0) + 1);
      if (nameCounts.get(lower)! > 1) {
        setCustomizeError(`Duplicate column name detected: "${c.name}". Column names must be unique.`);
        return;
      }
    }

    setColumns(trimmed);
    setIsCustomizeColumnsOpen(false);
    saveLocalSchema(eventId, trimmed, uploadedDatasetName || undefined);

    try {
      await eventsApi.updateScanConfig(eventId, {
        primary_scan_field: primaryKeyField || 'usn',
        qr_mode: qrMode || 'SECURE_TOKEN',
        barcode_field: barcodeField || 'usn',
        available_fields: trimmed.map((c) => c.name),
        column_configs: trimmed,
        dataset_name: uploadedDatasetName || undefined,
      });
    } catch (e) {
      console.warn('Could not sync customized columns to server:', e);
    }
  };

  const handleCreateStudent = async (e?: React.FormEvent, continueAdding = false) => {
    if (e) e.preventDefault();

    const validation = validateRecordAgainstSchema(formValues, columns);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      const firstErr = Object.values(validation.errors)[0];
      alert(`Validation error: ${firstErr}`);
      return;
    }
    setFormErrors({});
    setIsAdding(true);

    try {
      const studentPayload = mapFormToStudent(formValues, columns, students.length, eventId);
      const res = await studentsApi.create(studentPayload);

      if (res.student) {
        setStudents((prev) => [res.student, ...prev]);

        if (!uploadedDatasetName) {
          const dsName = 'Custom Records';
          setUploadedDatasetName(dsName);
          saveLocalSchema(eventId, columns, dsName);
          eventsApi
            .updateScanConfig(eventId, {
              primary_scan_field: primaryKeyField || 'usn',
              qr_mode: qrMode || 'SECURE_TOKEN',
              barcode_field: barcodeField || 'usn',
              available_fields: columns.map((c) => c.name),
              column_configs: columns,
              dataset_name: dsName,
            })
            .catch(console.warn);
        }

        if (continueAdding) {
          setBatchAddedCount((prev) => prev + 1);
          setLastAddedAttendee({ name: res.student.name, usn: res.student.usn });
          setFormValues({});
        } else {
          setIsAddModalOpen(false);
          setBatchAddedCount(0);
          setLastAddedAttendee(null);
          setFormValues({});
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add record');
    } finally {
      setIsAdding(false);
    }
  };

  const handleManualCheckInToggle = async (student: Student) => {
    try {
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
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      // Fallback try with single param
      try {
        await studentsApi.delete(student.id);
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
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

      const detected = detectSchemaFromRows(rawHeaders, rows);
      setColumns(detected);
      const dsName = file.name;
      setUploadedDatasetName(dsName);
      saveLocalSchema(eventId, detected, dsName);

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
    } catch (err: any) {
      console.error('Failed to parse spreadsheet file:', err);
      alert('Failed to parse spreadsheet file: ' + (err.message || 'Invalid format'));
    }
  };

  const handleCommitImport = async () => {
    if (!rawSpreadsheetRows || rawSpreadsheetRows.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    setImportProgress({
      stage: 'Preparing attendee records...',
      percent: 15,
      current: 0,
      total: rawSpreadsheetRows.length,
    });

    try {
      const getColVal = (row: Record<string, any>, colCandidates: string[], fallback = ''): string => {
        for (const cand of colCandidates) {
          const match = Object.keys(row).find((k) => k.toLowerCase() === cand.toLowerCase());
          if (match && row[match]) return String(row[match]).trim();
        }
        return fallback;
      };

      const preparedAttendees: Partial<Student>[] = transformedUploadData.rows.map((row) => {
        const r = row.raw;
        const usnVal = (r[primaryKeyField] || r.usn || row.originalId).toString().trim();
        const nameVal = getColVal(r, ['name', 'attendee', 'student', 'full name'], row.name || 'Attendee');
        const emailVal = getColVal(r, ['email', 'mail', 'email address']);
        const phoneVal = getColVal(r, ['phone', 'mobile', 'contact', 'cell', 'phone number']);
        const branchVal = getColVal(r, ['branch', 'dept', 'department', 'course', 'role'], row.department || 'General');
        const yearVal = getColVal(r, ['year', 'class', 'batch'], 'General');
        const sectionVal = getColVal(r, ['section', 'sec', 'division'], 'A');

        return {
          usn: usnVal,
          name: nameVal,
          email: emailVal || undefined,
          phone_number: phoneVal || undefined,
          branch: branchVal,
          department: branchVal,
          year: yearVal,
          section: sectionVal,
          barcode: row.generatedBarcode,
          meta: r,
        };
      });

      const scanConfig: EventScanConfig = {
        primary_scan_field: primaryKeyField,
        secondary_scan_field: secondaryKeyField || null,
        qr_mode: qrMode,
        barcode_field: activeBarcodeTargetKey,
        barcode_config: transformedUploadData.config,
        available_fields: columns.map((c) => c.name),
        column_configs: columns,
        dataset_name: csvFile?.name || 'Uploaded Dataset',
        is_uniqueness_verified: transformedUploadData.isReady,
      };

      setImportProgress({
        stage: 'Generating 128-bit cryptographic tokens & barcodes...',
        percent: 45,
        current: Math.floor(rawSpreadsheetRows.length * 0.4),
        total: rawSpreadsheetRows.length,
      });

      // Batching for reliability and progressive UI updates
      const BATCH_SIZE = 150;
      let totalImported = 0;
      let totalDuplicates = 0;
      const allErrors: string[] = [];

      if (preparedAttendees.length <= BATCH_SIZE) {
        setImportProgress({
          stage: 'Syncing roster and scan configuration...',
          percent: 75,
          current: preparedAttendees.length,
          total: preparedAttendees.length,
        });
        const res = await studentsApi.importCsv(eventId, preparedAttendees, scanConfig);
        totalImported = res.imported;
        totalDuplicates = res.duplicates;
        if (res.errors) allErrors.push(...res.errors);
      } else {
        const totalBatches = Math.ceil(preparedAttendees.length / BATCH_SIZE);
        for (let b = 0; b < totalBatches; b++) {
          const chunk = preparedAttendees.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
          const currentProcessed = Math.min((b + 1) * BATCH_SIZE, preparedAttendees.length);
          const currentPercent = Math.round(50 + ((b + 1) / totalBatches) * 45);

          setImportProgress({
            stage: `Importing batch ${b + 1} of ${totalBatches} (${currentProcessed}/${preparedAttendees.length})...`,
            percent: currentPercent,
            current: currentProcessed,
            total: preparedAttendees.length,
          });

          const res = await studentsApi.importCsv(
            eventId,
            chunk,
            b === 0 ? scanConfig : undefined
          );
          totalImported += res.imported;
          totalDuplicates += res.duplicates;
          if (res.errors) allErrors.push(...res.errors);
        }
      }

      setImportProgress({
        stage: 'Finalizing attendee passes...',
        percent: 100,
        current: rawSpreadsheetRows.length,
        total: rawSpreadsheetRows.length,
      });

      setImportSummary({ imported: totalImported, duplicates: totalDuplicates, errors: allErrors });
      saveLocalSchema(eventId, columns, scanConfig.dataset_name);
      await loadStudents();
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportError(err.message || 'Import failed. Please verify your connection or try again.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
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

        {/* Action Buttons: Expand, Columns, Import, and Add New Data */}
        <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
          {/* Top Row: Expand Details, Manage Columns, CSV Import */}
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            <button
              id="expand-all-btn"
              onClick={toggleExpandAll}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap backdrop-blur-md"
            >
              {expandedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <>
                  <ChevronsDownUp className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Expand</span>
                </>
              )}
            </button>

            <button
              onClick={openCustomizeColumnsModal}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap backdrop-blur-md"
              title="Customize data columns and input types"
            >
              <Sliders className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Columns</span>
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
              <span>Import</span>
            </button>
          </div>

          {/* Bottom Row: Add New Data Primary Button */}
          <button
            onClick={() => {
              setFormValues({});
              setFormErrors({});
              setIsAddModalOpen(true);
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Data</span>
          </button>
        </div>
      </div>

      {/* Uploaded Dataset Schema Banner (When data HAS been uploaded) */}
      {students.length > 0 && (
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/15 backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
                <span>Uploaded Dataset:</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-xs font-bold text-orange-300 font-mono">
                {uploadedDatasetName || `${singular} Roster`}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                ({students.length} record{students.length === 1 ? '' : 's'})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-zinc-400 font-medium">Detected Columns:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {columns.map((c, i) => (
                  <React.Fragment key={c.id}>
                    {i > 0 && <span className="text-zinc-600">|</span>}
                    <span className="font-semibold text-zinc-200">
                      {c.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openCustomizeColumnsModal}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="Manage schema columns"
            >
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Manage Columns</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormValues({});
                setFormErrors({});
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Data</span>
            </button>
          </div>
        </div>
      )}

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
                <th className="py-3.5 px-4 tracking-wider">{singular.toUpperCase()} / {primaryKeyLabel.toUpperCase()}</th>
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
                      <div className="max-w-md mx-auto space-y-5 px-4 text-left py-2">
                        {/* Status & Customize Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 text-[11px] font-medium text-zinc-300 border border-white/10">
                              <Database className="w-3 h-3 text-orange-400" />
                              <span>No data uploaded</span>
                            </div>
                            <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                              Attendee Dataset & Schema
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={openCustomizeColumnsModal}
                            className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            <Sliders className="w-3.5 h-3.5 text-orange-400" />
                            <span>Customize Columns</span>
                          </button>
                        </div>

                        {/* Configured Columns Preview */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            <span>Columns:</span>
                            <span className="text-[10px] text-zinc-500 font-normal lowercase">{columns.length} active fields</span>
                          </div>

                          <div className="rounded-2xl bg-zinc-950/60 border border-white/10 p-2 divide-y divide-white/5 space-y-1">
                            {columns.map((col, idx) => (
                              <div key={col.id} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-500 font-mono text-[11px]">{idx + 1}.</span>
                                  <span className="font-semibold text-white">{col.name}</span>
                                  {col.required && <span className="text-orange-400 font-bold">*</span>}
                                </div>
                                <span className="px-2 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-300 uppercase">
                                  {col.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons: Add Column + Add New Data + Upload File */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              openCustomizeColumnsModal();
                              setTimeout(() => handleAddColumnToEditing(), 50);
                            }}
                            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-200 hover:text-white inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5 text-orange-400" />
                            <span>Add Column</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormValues({});
                              setFormErrors({});
                              setIsAddModalOpen(true);
                            }}
                            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add New Data</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsImportModalOpen(true);
                              setParsedRows([]);
                              setImportSummary(null);
                              setCsvFile(null);
                            }}
                            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                            title="Upload CSV or Excel file"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Upload File</span>
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
                                    {columns.map((col) => {
                                      const rawVal =
                                        s.meta?.[col.name] ??
                                        s.meta?.[col.name.toLowerCase()] ??
                                        (s as any)[col.name.toLowerCase()] ??
                                        (col.name.toLowerCase() === 'name' ? s.name : undefined) ??
                                        (col.name.toLowerCase() === 'email' ? s.email : undefined) ??
                                        (col.name.toLowerCase() === 'department' ? s.branch : undefined) ??
                                        (col.name.toLowerCase() === 'usn' ? s.usn : undefined);
                                      const displayVal = formatCellValue(rawVal);

                                      return (
                                        <div key={col.id} className="flex items-center justify-between text-zinc-400">
                                          <span className="capitalize">{col.name}:</span>
                                          <div className="flex items-center gap-1 max-w-[65%]">
                                            <span className="font-semibold text-white truncate text-right">
                                              {displayVal}
                                            </span>
                                            {rawVal && (
                                              <button
                                                onClick={() => handleCopyText(`${col.name}-${s.id}`, String(rawVal))}
                                                className="text-zinc-500 hover:text-white p-0.5 cursor-pointer shrink-0"
                                                title={`Copy ${col.name}`}
                                              >
                                                {copiedField === `${col.name}-${s.id}` ? (
                                                  <Check className="w-3 h-3 text-emerald-400" />
                                                ) : (
                                                  <Copy className="w-3 h-3" />
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Primary Key / USN row if not already in columns */}
                                    {!columns.some((c) => c.name.toLowerCase() === 'usn' || c.name.toLowerCase() === primaryKeyLabel.toLowerCase()) && (
                                      <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-white/5">
                                        <span>{primaryKeyLabel}:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-orange-400 font-semibold">{s.usn}</span>
                                          <button
                                            onClick={() => handleCopyText(`usn-${s.id}`, s.usn)}
                                            className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                                            title="Copy ID"
                                          >
                                            {copiedField === `usn-${s.id}` ? (
                                              <Check className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Barcode row if present and not in columns */}
                                    {s.barcode && !columns.some((c) => c.name.toLowerCase() === 'barcode') && (
                                      <div className="flex items-center justify-between text-zinc-400">
                                        <span>Barcode:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-amber-400 font-semibold">{s.barcode}</span>
                                          <button
                                            onClick={() => handleCopyText(`barcode-${s.id}`, s.barcode!)}
                                            className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                                            title="Copy Barcode"
                                          >
                                            {copiedField === `barcode-${s.id}` ? (
                                              <Check className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Any extra meta fields not in configured columns */}
                                    {s.meta &&
                                      Object.entries(s.meta).filter(
                                        ([k]) => !columns.some((c) => c.name.toLowerCase() === k.toLowerCase())
                                      ).length > 0 && (
                                        <div className="pt-2 mt-2 border-t border-white/10 space-y-1.5">
                                          <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Additional Metadata</span>
                                          </div>
                                          {Object.entries(s.meta)
                                            .filter(([k]) => !columns.some((c) => c.name.toLowerCase() === k.toLowerCase()))
                                            .map(([k, v]) => (
                                              <div key={k} className="flex items-center justify-between text-[11px] text-zinc-400">
                                                <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                                                <span className="text-zinc-200 font-medium">{formatCellValue(v)}</span>
                                              </div>
                                            ))}
                                        </div>
                                      )}
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

      {/* Dynamic Add New Record Modal via React Portal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleCreateStudent(undefined, true);
            }
          }}
        >
          <div className="bg-[#121520] border border-zinc-700/80 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl my-auto max-h-[92vh] overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
                      Add New Record
                    </h3>
                    {batchAddedCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-400 flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        {batchAddedCount} Added
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {uploadedDatasetName
                      ? `Schema derived from: ${uploadedDatasetName} (${columns.length} columns)`
                      : `Configured Schema (${columns.length} columns)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setBatchAddedCount(0);
                  setLastAddedAttendee(null);
                  setFormValues({});
                  setFormErrors({});
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Continuous Success Flash Toast */}
            {lastAddedAttendee && (
              <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Successfully added <strong>{lastAddedAttendee.name}</strong> (<span className="font-mono text-emerald-200">{lastAddedAttendee.usn}</span>). Ready for next entry!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastAddedAttendee(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-0.5 rounded-lg cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Form Scrollable Body */}
            <form onSubmit={(e) => handleCreateStudent(e, false)} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {columns.map((col) => {
                  const val = formValues[col.name] ?? '';
                  const err = formErrors[col.name];

                  return (
                    <div key={col.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-zinc-300 flex items-center gap-1">
                          <span>{col.name}</span>
                          {col.required && <span className="text-orange-400 font-bold">*</span>}
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {col.type}
                        </span>
                      </div>

                      {col.type === 'dropdown' ? (
                        <select
                          value={val}
                          onChange={(e) => {
                            setFormValues((prev) => ({ ...prev, [col.name]: e.target.value }));
                            if (formErrors[col.name]) {
                              setFormErrors((prev) => {
                                const next = { ...prev };
                                delete next[col.name];
                                return next;
                              });
                            }
                          }}
                          className={`w-full bg-zinc-950/70 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all ${
                            err ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-zinc-700/80'
                          }`}
                        >
                          <option value="">Select {col.name}...</option>
                          {(col.options || []).map((opt) => (
                            <option key={opt} value={opt} className="bg-zinc-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={
                            col.type === 'email'
                              ? 'email'
                              : col.type === 'number'
                              ? 'number'
                              : col.type === 'date'
                              ? 'date'
                              : 'text'
                          }
                          placeholder={`Enter ${col.name}`}
                          value={val}
                          onChange={(e) => {
                            setFormValues((prev) => ({ ...prev, [col.name]: e.target.value }));
                            if (formErrors[col.name]) {
                              setFormErrors((prev) => {
                                const next = { ...prev };
                                delete next[col.name];
                                return next;
                              });
                            }
                          }}
                          className={`w-full bg-zinc-950/70 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all placeholder:text-zinc-600 ${
                            err ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-zinc-700/80'
                          }`}
                        />
                      )}

                      {err && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{err}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setBatchAddedCount(0);
                    setLastAddedAttendee(null);
                    setFormValues({});
                    setFormErrors({});
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleCreateStudent(undefined, true)}
                    className="hidden sm:flex px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-zinc-200 hover:text-white text-xs font-bold items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Save & Add Another</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Enter</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isAdding ? 'Saving...' : 'Save Record'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Customize Columns & Schema Management Modal via React Portal */}
      {isCustomizeColumnsOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div className="bg-[#121520] border border-zinc-700/80 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl my-auto max-h-[92vh] overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
                    Customize Columns & Schema
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure columns, change input types, and reorder data fields for your records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeColumnsOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {customizeError && (
              <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{customizeError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomizeError(null)}
                  className="text-rose-400 hover:text-rose-200 text-xs px-1.5 py-0.5"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Column List Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Quick suggestions */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Quick Add Suggested Columns:
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { name: 'Name', type: 'text' },
                    { name: 'Email', type: 'email' },
                    { name: 'Age', type: 'number' },
                    { name: 'Department', type: 'text' },
                    { name: 'Phone', type: 'text' },
                    { name: 'Date of Birth', type: 'date' },
                    { name: 'Status', type: 'dropdown' },
                  ].map((sug) => {
                    const alreadyExists = editingColumns.some(
                      (c) => c.name.toLowerCase() === sug.name.toLowerCase()
                    );
                    return (
                      <button
                        key={sug.name}
                        type="button"
                        disabled={alreadyExists}
                        onClick={() => handleAddColumnToEditing(sug.name, sug.type as ColumnType)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          alreadyExists
                            ? 'bg-zinc-800 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white'
                        }`}
                      >
                        + {sug.name} ({sug.type})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
                  <span>Columns ({editingColumns.length})</span>
                  <span>Type / Controls</span>
                </div>

                <div className="space-y-2">
                  {editingColumns.map((col, index) => (
                    <div
                      key={col.id}
                      className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-700/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 transition-all hover:border-zinc-600"
                    >
                      {/* Left: Reorder & Name input */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveColumnInEditing(index, 'up')}
                            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === editingColumns.length - 1}
                            onClick={() => handleMoveColumnInEditing(index, 'down')}
                            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Column Index */}
                        <span className="text-zinc-500 font-mono text-xs w-5 shrink-0">
                          {index + 1}.
                        </span>

                        {/* Column Name Input */}
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => handleRenameColumnInEditing(col.id, e.target.value)}
                          placeholder="Column Name"
                          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                        />
                      </div>

                      {/* Right: Type selector, Required toggle, Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Type Selector */}
                        <select
                          value={col.type}
                          onChange={(e) => handleChangeTypeInEditing(col.id, e.target.value as ColumnType)}
                          className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="email">Email</option>
                          <option value="dropdown">Dropdown</option>
                        </select>

                        {/* Required toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRequiredInEditing(col.id)}
                          className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                            col.required
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                              : 'bg-white/5 text-zinc-500 border-white/10 hover:text-zinc-300'
                          }`}
                          title="Toggle required validation"
                        >
                          {col.required ? 'Required' : 'Optional'}
                        </button>

                        {/* Delete column button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveColumnFromEditing(col.id)}
                          className="p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Column Button */}
                <button
                  type="button"
                  onClick={() => handleAddColumnToEditing()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-orange-500/50 bg-white/[0.02] hover:bg-orange-500/5 text-xs font-bold text-zinc-300 hover:text-orange-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Column</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCustomizeColumnsOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyCustomizeColumns}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply & Save Schema</span>
              </button>
            </div>
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

                {/* ======================================================== */}
                {/* BARCODE DATA TARGET & EXTRACTION CUSTOMIZATION           */}
                {/* ======================================================== */}
                <div className="space-y-4 pt-3 border-t border-zinc-800">
                  {/* Exact Header from Reference Screenshot */}
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-orange-400" />
                    <span>BARCODE DATA TARGET</span>
                  </div>

                  {/* Primary Scanning Key / Target Field Dropdown */}
                  <div className="space-y-1.5">
                    <select
                      value={barcodeField}
                      onChange={(e) => {
                        setBarcodeField(e.target.value);
                      }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
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

                  {/* Customization Section (Below the Barcode Dropdown) */}
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                      <div>
                        <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-orange-400" />
                          <span>BARCODE EXTRACTION CONFIGURATION</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Configure which part of <strong className="text-orange-400">{activeBarcodeTargetKey}</strong> is used for barcode identification.
                        </p>
                      </div>
                    </div>

                    {/* Extraction Mode: Custom Portion vs Full ID */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Extraction Mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBarcodeExtractionMode('custom')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            barcodeExtractionMode === 'custom'
                              ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 ring-1 ring-orange-500/30'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${barcodeExtractionMode === 'custom' ? 'bg-orange-400 shadow-sm shadow-orange-400/50' : 'bg-zinc-600'}`} />
                          <span>Custom Portion</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBarcodeExtractionMode('full_id')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            barcodeExtractionMode === 'full_id'
                              ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 ring-1 ring-orange-500/30'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${barcodeExtractionMode === 'full_id' ? 'bg-orange-400 shadow-sm shadow-orange-400/50' : 'bg-zinc-600'}`} />
                          <span>Full ID</span>
                        </button>
                      </div>
                    </div>

                  {/* 3. Custom Portion Configuration (Position + Character Count) */}
                  {barcodeExtractionMode === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2 sm:space-y-0">
                      {/* Extraction Position */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                          <span>Extract From</span>
                        </label>
                        <select
                          value={barcodeExtractionPosition}
                          onChange={(e) => setBarcodeExtractionPosition(e.target.value as 'front' | 'end')}
                          style={{ colorScheme: 'dark' }}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="front" className="bg-zinc-900 text-zinc-100 py-1.5">
                            From Front (Beginning)
                          </option>
                          <option value="end" className="bg-zinc-900 text-zinc-100 py-1.5">
                            From End (Trailing)
                          </option>
                        </select>
                      </div>

                      {/* Number of Characters Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-zinc-300">
                            Number of Characters
                          </label>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Min: 3 • Max: {maxBarcodeIdLength}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={3}
                          max={maxBarcodeIdLength}
                          value={barcodeCharCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setBarcodeCharCount(isNaN(val) ? 0 : val);
                          }}
                          className={`w-full bg-zinc-900 border rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none ${
                            barcodeCharCountError
                              ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                              : 'border-zinc-700 focus:border-orange-500'
                          }`}
                        />
                        {barcodeCharCountError && (
                          <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{barcodeCharCountError}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Optional Advanced Prefix / Suffix Collapsible */}
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedBarcode(!showAdvancedBarcode)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900/50 hover:bg-zinc-900 flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Optional Fixed Prefix / Suffix</span>
                        {(barcodeFixedPrefix || barcodeFixedSuffix) && (
                          <span className="w-2 h-2 rounded-full bg-orange-400" />
                        )}
                      </span>
                      {showAdvancedBarcode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showAdvancedBarcode && (
                      <div className="p-3.5 bg-zinc-950/60 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-400">
                            Fixed Prefix (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. EVENT-"
                            value={barcodeFixedPrefix}
                            onChange={(e) => setBarcodeFixedPrefix(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-400">
                            Fixed Suffix (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. -2026"
                            value={barcodeFixedSuffix}
                            onChange={(e) => setBarcodeFixedSuffix(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Live Barcode Preview (Section 6 & 7) */}
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                        <span>Live Barcode Preview</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {rawSpreadsheetRows.length > 0 ? 'Using Real Uploaded Data' : 'Sample Data'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                      {/* Original ID */}
                      <div className="text-center sm:text-left space-y-0.5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                          Original ID ({activeBarcodeTargetKey})
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-200 break-all">
                          {sampleOriginalId}
                        </span>
                      </div>

                      {/* Direction / Rule Indicator */}
                      <div className="flex flex-col items-center justify-center text-center py-1 sm:py-0">
                        <span className="text-[10px] font-mono font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                          {barcodeExtractionMode === 'full_id'
                            ? 'Full ID Match'
                            : barcodeExtractionPosition === 'end'
                            ? `Last ${barcodeCharCount} Characters`
                            : `First ${barcodeCharCount} Characters`}
                        </span>
                        <div className="text-orange-400 text-xs sm:text-sm mt-0.5">↓</div>
                      </div>

                      {/* Resulting Barcode Identifier */}
                      <div className="text-center sm:text-right space-y-0.5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                          Barcode Identifier
                        </span>
                        <div className="inline-block px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-300 font-mono font-bold text-sm tracking-wide shadow-sm shadow-orange-500/10">
                          {sampleExtractedBarcode || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Barcode Validation & Error Reporting (Section 8, 9 & 16) */}
                  <div className="space-y-3">
                    {/* Section 16: Empty or Short Record Errors */}
                    {transformedUploadData.errorsCount > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2.5 text-xs text-amber-300">
                        <div className="flex items-center gap-2 font-bold text-amber-400">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>⚠ Invalid Attendee Records Detected ({transformedUploadData.errorsCount})</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Barcode cannot be generated because the selected ID is empty or contains fewer characters than requested ({barcodeCharCount}).
                          Do NOT silently generate a shorter barcode. Choose a smaller character count or fix uploaded data.
                        </p>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 rounded-xl bg-black/40 border border-amber-500/20 font-mono text-[11px]">
                          {transformedUploadData.errorRecords.slice(0, 5).map((err, idx) => (
                            <div key={idx} className="flex items-center justify-between text-zinc-300">
                              <span>Row {err.rowNumber}: <strong className="text-amber-200">{activeBarcodeTargetKey} = {err.originalId}</strong></span>
                              <span className="text-amber-400 text-[10px]">{err.reason}</span>
                            </div>
                          ))}
                          {transformedUploadData.errorRecords.length > 5 && (
                            <div className="text-[10px] text-zinc-500 pt-1 text-center font-sans">
                              + {transformedUploadData.errorRecords.length - 5} more invalid record(s)
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Section 8 & 9: Conflict Reporting */}
                    {transformedUploadData.conflicts.length > 0 && (
                      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2.5 text-xs text-rose-300">
                        <div className="flex items-center gap-2 font-bold text-rose-400">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>⚠ Barcode Identifier Conflict</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Multiple attendees generate the same barcode identifier using the current configuration.
                          Increase the character count or choose a different extraction method.
                        </p>
                        <div className="max-h-36 overflow-y-auto space-y-2 p-2.5 rounded-xl bg-black/40 border border-rose-500/20">
                          {transformedUploadData.conflicts.map((c, idx) => (
                            <div key={idx} className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                              <div>
                                <span className="text-zinc-500 block text-[10px]">Duplicate Value:</span>
                                <span className="font-bold text-rose-300">{c.value}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px]">Conflicting Records:</span>
                                <span className="font-bold text-rose-400">
                                  {c.count} attendees (Rows {c.rows.slice(0, 4).join(', ')}{c.rows.length > 4 ? '...' : ''})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Unique and Valid */}
                    {transformedUploadData.isReady && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold">
                            ✓ All {transformedUploadData.totalProcessed} barcode identifiers are unique and valid
                          </span>
                        </div>
                        <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-200">
                          Zero Conflicts • Zero Errors
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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
                    disabled={!transformedUploadData.isReady}
                    onClick={() => {
                      if (transformedUploadData.isReady) {
                        setWizardStep(5);
                      }
                    }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-all ${
                      transformedUploadData.isReady
                        ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                  >
                    <span>Review Configuration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 5: REVIEW & SAVE CONFIGURATION / LOADING / ERROR */}
            {/* ======================================================== */}
            {wizardStep === 5 && !importSummary && (
              <div>
                {isImporting ? (
                  /* Dedicated Full-Screen Loading & Progress View */
                  <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-8 sm:p-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl animate-pulse" />
                      <div className="relative w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h4 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk']">
                        Importing & Generating Tokens...
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Generating 128-bit cryptographically secure QR passes and storing records in the attendee database.
                      </p>
                    </div>

                    {/* Progress Bar & Details */}
                    <div className="space-y-2.5 max-w-md mx-auto">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                        <span className="text-orange-300 font-mono text-[11px] truncate">
                          {importProgress?.stage || 'Processing attendee records...'}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-200 shrink-0 font-bold">
                          {importProgress?.percent ?? 45}%
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-white/[0.08] overflow-hidden p-0.5 border border-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 shadow-sm shadow-orange-500/50"
                          style={{ width: `${importProgress?.percent ?? 45}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                        <span>{importProgress?.current ? `${importProgress.current} of ${importProgress.total} records` : `${rawSpreadsheetRows.length} attendees`}</span>
                        <span>Please do not close this window</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400 max-w-sm mx-auto flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>CSPRNG encryption & duplicate prevention active</span>
                    </div>
                  </div>
                ) : importError ? (
                  /* Import Error & Retry View */
                  <div className="bg-rose-950/40 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 animate-in fade-in duration-200">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-white">Import Failed</h4>
                      <p className="text-xs text-rose-300 max-w-md mx-auto">{importError}</p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setImportError(null)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                      >
                        Back to Review
                      </button>
                      <button
                        type="button"
                        onClick={handleCommitImport}
                        className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg cursor-pointer flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Try Again</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Step 5 Review & Save View */
                  <div className="space-y-5">
                    {/* Primary & QR Configuration Summary */}
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Key & Token Configuration
                        </span>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Validated 100% Unique
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Primary Scanning Key</div>
                          <div className="font-bold text-orange-400 font-mono">{primaryKeyField}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Secondary Verification</div>
                          <div className="font-bold text-white font-mono">{secondaryKeyField || 'None (Single Key)'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">QR Code Mode</div>
                          <div className="font-bold text-white font-mono">
                            {qrMode === 'SECURE_TOKEN' ? 'Secure Attendee Token' : 'Full Attendee Data (Embedded)'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Barcode Configuration Summary (Section 12 & 17) */}
                    <div className="bg-zinc-900/90 border border-orange-500/30 rounded-2xl p-5 space-y-4 shadow-lg shadow-orange-500/5">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-orange-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            BARCODE CONFIGURATION
                          </span>
                        </div>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Status: ✓ Ready for Import</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Source Field</div>
                          <div className="font-bold text-orange-400 font-mono">{activeBarcodeTargetKey}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Mode</div>
                          <div className="font-bold text-white font-mono">
                            {barcodeExtractionMode === 'full_id' ? 'Full ID' : 'Partial ID'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Position</div>
                          <div className="font-bold text-white font-mono">
                            {barcodeExtractionMode === 'full_id' ? 'Whole' : (barcodeExtractionPosition === 'end' ? 'Last' : 'First')}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Characters</div>
                          <div className="font-bold text-white font-mono">
                            {barcodeExtractionMode === 'full_id' ? 'All' : barcodeCharCount}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-[10px] uppercase font-mono">Generated Example</div>
                          <div className="font-bold text-emerald-300 font-mono">{sampleExtractedBarcode || '—'}</div>
                        </div>
                      </div>

                      {/* Section 17 Metrics Counters */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-zinc-800/80 text-[11px] font-mono">
                        <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Attendees Processed:</span>
                          <span className="font-bold text-zinc-200">{transformedUploadData.totalProcessed}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Valid:</span>
                          <span className="font-bold text-emerald-400">{transformedUploadData.validCount}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Conflicts:</span>
                          <span className={`font-bold ${transformedUploadData.conflicts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {transformedUploadData.conflicts.length}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Errors:</span>
                          <span className={`font-bold ${transformedUploadData.errorsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {transformedUploadData.errorsCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 7: Attendee Roster Preview Table with Barcode Column */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-zinc-300">
                        IMPORT PREVIEW ({transformedUploadData.totalProcessed} records ready to import):
                      </div>
                      <div className="border border-zinc-800 rounded-2xl max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-zinc-900 text-zinc-400 sticky top-0">
                            <tr>
                              <th className="p-2.5">{primaryKeyField} (Primary)</th>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5 text-orange-300">Barcode</th>
                              {secondaryKeyField && <th className="p-2.5">{secondaryKeyField} (Sec)</th>}
                              <th className="p-2.5">Department</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            {transformedUploadData.rows.slice(0, 10).map((row) => (
                              <tr key={row.rowNumber} className="hover:bg-zinc-800/30">
                                <td className="p-2.5 font-mono text-orange-400 font-bold">
                                  {row.originalId || '-'}
                                </td>
                                <td className="p-2.5 text-white">{row.name}</td>
                                <td className="p-2.5 font-mono text-emerald-400 font-bold">
                                  {row.generatedBarcode || <span className="text-rose-400 italic">Invalid</span>}
                                </td>
                                {secondaryKeyField && (
                                  <td className="p-2.5 text-zinc-300 font-mono">{row.raw[secondaryKeyField] || '-'}</td>
                                )}
                                <td className="p-2.5 text-zinc-400">{row.department}</td>
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
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Configuration & Commit {rawSpreadsheetRows.length} Attendees</span>
                      </button>
                    </div>
                  </div>
                )}
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
