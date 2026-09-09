import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Barcode,
  Camera,
  CameraOff,
  RefreshCw,
  CheckCheck,
  AlertTriangle,
  XCircle,
  Send,
  Clock,
  Zap,
  Sparkles,
  Search,
  ScanLine,
  UserCheck,
  ShieldCheck,
  Radio,
  CheckCircle2,
  ArrowRight,
  PauseCircle,
  Key,
  Check,
  X,
  User,
} from 'lucide-react';
import { ScanType, ScanValidationResult, Student } from '../../types';
import { ScannerPreferences } from './ScannerSettingsTab';
import { getCachedAttendees } from '../../lib/offline/idb';

interface AdmittoScannerTerminalProps {
  scanType: ScanType;
  onScanTypeChange: (type: ScanType) => void;
  readerElementId: string;
  isCameraActive: boolean;
  isStartingCamera?: boolean;
  cameraError: string | null;
  onRetryCamera: () => void;
  onScanImageFile?: (file: File) => void;
  lastResult: ScanValidationResult | null;
  lastScannedPayload: string;
  isProcessing: boolean;
  manualInput: string;
  onManualInputChange: (val: string) => void;
  onManualSubmit: (e: React.FormEvent) => void;
  queuedScansCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  onSyncOffline: () => void;
  prefs: ScannerPreferences;
  onToggleFacingMode?: () => void;
  onToggleTorch?: () => void;
  isScannerPaused?: boolean;
  onDoneNextScan?: () => void;
  primaryScanField?: string;
  secondaryScanField?: string;
  students?: Student[];
  eventId?: string;
  onSelectStudent?: (student: Student) => void;
}

export const AdmittoScannerTerminal: React.FC<AdmittoScannerTerminalProps> = ({
  scanType,
  onScanTypeChange,
  readerElementId,
  isCameraActive,
  isStartingCamera = false,
  cameraError,
  onRetryCamera,
  onScanImageFile,
  lastResult,
  lastScannedPayload,
  isProcessing,
  manualInput,
  onManualInputChange,
  onManualSubmit,
  queuedScansCount,
  isSyncing,
  isOnline,
  onSyncOffline,
  prefs,
  onToggleFacingMode,
  onToggleTorch,
  isScannerPaused = false,
  onDoneNextScan,
  primaryScanField,
  secondaryScanField,
  students = [],
  eventId,
  onSelectStudent,
}) => {
  // Live Search State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [offlineStudents, setOfflineStudents] = useState<Student[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load offline attendees from IndexedDB if in-memory roster is empty (e.g. offline cold-start)
  useEffect(() => {
    if ((!students || students.length === 0) && eventId) {
      getCachedAttendees(eventId)
        .then((cached) => {
          if (cached && cached.length > 0) {
            setOfflineStudents(
              cached.map((c) => ({
                id: c.id,
                event_id: c.event_id,
                usn: c.usn,
                name: c.name,
                branch: c.branch,
                qr_code: c.qr_code,
                barcode: c.barcode,
                is_checked_in: c.is_checked_in,
                checked_in: c.is_checked_in,
                checked_in_at: c.checked_in_at,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [students, eventId]);

  // Combined attendees dataset (online live roster prioritized, falling back to cached offline roster)
  const allAttendees = useMemo(() => {
    if (students && students.length > 0) return students;
    return offlineStudents;
  }, [students, offlineStudents]);

  // Live real-time search results updated on every single character keystroke
  const searchResults = useMemo(() => {
    const query = (manualInput || '').trim().toLowerCase();
    if (!query) return [];

    return allAttendees
      .filter((s) => {
        const nameMatch = s.name?.toLowerCase().includes(query);
        const usnMatch = s.usn?.toLowerCase().includes(query);
        const emailMatch = s.email?.toLowerCase().includes(query);
        const qrMatch = s.qr_code?.toLowerCase().includes(query);
        const barcodeMatch = s.barcode?.toLowerCase().includes(query);
        const branchMatch = s.branch?.toLowerCase().includes(query);
        return nameMatch || usnMatch || emailMatch || qrMatch || barcodeMatch || branchMatch;
      })
      .slice(0, 8); // Top 8 most relevant matches for ultra-fast UX
  }, [allAttendees, manualInput]);

  // Dismiss dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selection Handler: immediately validates & checks in the chosen attendee
  const handleSelectAttendee = (student: Student) => {
    setIsDropdownOpen(false);
    if (onSelectStudent) {
      onSelectStudent(student);
    } else {
      const scanVal = student.qr_code || student.usn || student.barcode || student.name;
      onManualInputChange(scanVal);
      onManualSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  // Keyboard navigation through dropdown results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        e.preventDefault();
        handleSelectAttendee(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Determine current active visual state
  const isOfflineSuccess = lastResult && lastResult.status === 'SUCCESS_OFFLINE';
  const isQueuedOffline = lastResult && (lastResult.status === 'QUEUED_OFFLINE' || isOfflineSuccess);
  const isConflict = lastResult && lastResult.status === 'POST_SYNC_DUPLICATE_CONFLICT';
  const isExpired = lastResult && lastResult.status === 'EXPIRED_OFFLINE_DATA';
  const isSuccess =
    lastResult &&
    !isQueuedOffline &&
    !isConflict &&
    !isExpired &&
    (lastResult.status === 'SUCCESS' || lastResult.status === 'IDEMPOTENT_SUCCESS');
  const isDuplicate = lastResult && lastResult.status === 'DUPLICATE_CHECKIN';
  const isInvalid =
    lastResult &&
    !isSuccess &&
    !isDuplicate &&
    !isQueuedOffline &&
    !isConflict &&
    !isExpired &&
    lastResult.status !== undefined;

  return (
    <div
      id="admitto-scanner-terminal"
      className="flex flex-col justify-between max-w-lg mx-auto w-full h-full animate-fade-in gap-2.5 sm:gap-3.5 pb-20 sm:pb-24"
    >
      {/* 1. Offline Queued Scans Sync Banner (If items pending) */}
      {queuedScansCount > 0 && (
        <div className="glass-card border border-amber-500/40 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 text-xs text-amber-300 animate-pulse shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="truncate">
              <strong>{queuedScansCount}</strong> offline scan(s) queued
            </span>
          </div>
          <button
            onClick={onSyncOffline}
            disabled={isSyncing || !isOnline}
            className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer text-xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {/* 2. Mode Selector: Segmented Control [ QR Code Mode ] [ Barcode Mode ] */}
      <div
        role="tablist"
        aria-label="Scanner Mode Selection"
        className="relative grid grid-cols-2 p-1 rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 border border-slate-700/60 dark:border-white/10 shadow-lg shrink-0 backdrop-blur-md"
      >
        {/* QR Code Mode Button */}
        <button
          type="button"
          role="tab"
          id="tab-qr-mode"
          aria-selected={scanType === 'QR'}
          aria-controls="camera-viewport-card"
          onClick={() => onScanTypeChange('QR')}
          className={`relative z-10 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-[13px] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer select-none ${
            scanType === 'QR'
              ? 'text-white'
              : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {scanType === 'QR' && (
            <motion.div
              layoutId="scanner-mode-pill"
              className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-md border border-indigo-400/30"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5 font-semibold">
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="tracking-wide">QR Code Mode</span>
          </span>
        </button>

        {/* Barcode Mode Button */}
        <button
          type="button"
          role="tab"
          id="tab-barcode-mode"
          aria-selected={scanType === 'BARCODE'}
          aria-controls="camera-viewport-card"
          onClick={() => onScanTypeChange('BARCODE')}
          className={`relative z-10 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-[13px] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer select-none ${
            scanType === 'BARCODE'
              ? 'text-white'
              : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {scanType === 'BARCODE' && (
            <motion.div
              layoutId="scanner-mode-pill"
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-md border border-purple-400/30"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5 font-semibold">
            <Barcode className="w-4 h-4 shrink-0" />
            <span className="tracking-wide">Barcode Mode</span>
          </span>
        </button>
      </div>

      {/* Identification Key Information Bar */}
      <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
        <span className="flex items-center gap-1.5 font-mono">
          <Key className="w-3 h-3 text-orange-400" />
          <span>Key: <strong className="text-white uppercase">{primaryScanField || 'USN'}</strong></span>
          {secondaryScanField && (
            <span className="text-zinc-500">(+ {secondaryScanField})</span>
          )}
        </span>
        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Terminal Ready
        </span>
      </div>

      {/* 3. Primary Camera Area: Edge-to-Edge Viewfinder with Dynamic Reticle */}
      <div
        id="camera-viewport-card"
        className="relative w-full aspect-[4/3] sm:aspect-[16/11] max-h-[46vh] sm:max-h-[50vh] bg-[#090d16] rounded-3xl sm:rounded-[28px] overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] flex items-center justify-center border border-slate-700/80 dark:border-slate-800 mx-auto shrink-0 select-none"
      >
        {/* Real HTML5-QRCode Video Mount Container */}
        <div id={readerElementId} className="absolute inset-0 w-full h-full overflow-hidden" />

        {/* Live Camera Header Badges */}
        <div className="absolute top-3 inset-x-3.5 z-20 flex items-center justify-between pointer-events-none">
          {/* Live Stream Pulse Badge */}
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-sm pointer-events-auto">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isScannerPaused || lastResult
                    ? 'bg-amber-400'
                    : isCameraActive
                    ? 'bg-emerald-400'
                    : isStartingCamera
                    ? 'bg-indigo-400'
                    : 'bg-slate-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isScannerPaused || lastResult
                    ? 'bg-amber-500'
                    : isCameraActive
                    ? 'bg-emerald-500'
                    : isStartingCamera
                    ? 'bg-indigo-500'
                    : 'bg-slate-500'
                }`}
              />
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-white font-mono">
              {isScannerPaused || lastResult
                ? 'Scanner Paused'
                : isCameraActive
                ? 'Live Camera'
                : isStartingCamera
                ? 'Connecting...'
                : 'Standby'}
            </span>
          </div>

          {/* Quick Camera Controls (Flash + Flip Lens) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Flashlight Torch Button */}
            {onToggleTorch && (
              <button
                type="button"
                id="scanner-toggle-flash-btn"
                onClick={onToggleTorch}
                className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${
                  prefs.torchEnabled
                    ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                    : 'bg-black/60 hover:bg-black/80 border-white/15 text-slate-200 hover:text-white'
                }`}
                title={prefs.torchEnabled ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
              >
                <Zap
                  className={`w-3 h-3 ${
                    prefs.torchEnabled ? 'text-slate-950 fill-slate-950' : 'text-amber-400'
                  }`}
                />
                <span>{prefs.torchEnabled ? 'Flash ON' : 'Flash'}</span>
              </button>
            )}

            {/* Quick Camera Flip Lens */}
            {onToggleFacingMode && (
              <button
                type="button"
                id="scanner-toggle-lens-btn"
                onClick={onToggleFacingMode}
                className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-slate-200 hover:text-white text-[10px] font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Switch Camera Lens"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Flip Lens</span>
              </button>
            )}
          </div>
        </div>

        {/* Reticle Focus Mask & Corner Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-4">
          <motion.div
            layout
            key={scanType}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`relative rounded-2xl sm:rounded-3xl transition-all duration-300 flex items-center justify-center ${
              scanType === 'QR'
                ? 'w-[200px] h-[200px] sm:w-[230px] sm:h-[230px] max-w-[72%] max-h-[78%] aspect-square'
                : 'w-[280px] h-[120px] sm:w-[320px] sm:h-[135px] max-w-[88%] max-h-[60%]'
            } ${
              isSuccess
                ? 'border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)]'
                : isDuplicate
                ? 'border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.45)]'
                : isInvalid
                ? 'border-2 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.45)]'
                : isProcessing
                ? 'border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.45)]'
                : scanType === 'QR'
                ? 'border-2 border-indigo-400/80 shadow-[0_0_25px_rgba(99,102,241,0.35)]'
                : 'border-2 border-purple-400/80 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
            }`}
          >
            {/* 4 Emphasized Corner Brackets */}
            <div
              className={`absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                isSuccess
                  ? 'border-emerald-400'
                  : isDuplicate
                  ? 'border-amber-400'
                  : isInvalid
                  ? 'border-rose-400'
                  : isProcessing
                  ? 'border-cyan-400'
                  : scanType === 'QR'
                  ? 'border-indigo-400'
                  : 'border-purple-400'
              }`}
            />
            <div
              className={`absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                isSuccess
                  ? 'border-emerald-400'
                  : isDuplicate
                  ? 'border-amber-400'
                  : isInvalid
                  ? 'border-rose-400'
                  : isProcessing
                  ? 'border-cyan-400'
                  : scanType === 'QR'
                  ? 'border-indigo-400'
                  : 'border-purple-400'
              }`}
            />
            <div
              className={`absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                isSuccess
                  ? 'border-emerald-400'
                  : isDuplicate
                  ? 'border-amber-400'
                  : isInvalid
                  ? 'border-rose-400'
                  : isProcessing
                  ? 'border-cyan-400'
                  : scanType === 'QR'
                  ? 'border-indigo-400'
                  : 'border-purple-400'
              }`}
            />
            <div
              className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                isSuccess
                  ? 'border-emerald-400'
                  : isDuplicate
                  ? 'border-amber-400'
                  : isInvalid
                  ? 'border-rose-400'
                  : isProcessing
                  ? 'border-cyan-400'
                  : scanType === 'QR'
                  ? 'border-indigo-400'
                  : 'border-purple-400'
              }`}
            />

            {/* Smooth Animated Laser Sweep */}
            <motion.div
              animate={{
                top: ['8%', '92%', '8%'],
              }}
              transition={{
                duration: isProcessing ? 1.0 : 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute left-2 right-2 h-0.5 rounded-full transition-all ${
                isSuccess
                  ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_#34d399]'
                  : isDuplicate
                  ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_14px_#fbbf24]'
                  : isInvalid
                  ? 'bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_14px_#f43f5e]'
                  : isProcessing
                  ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_#22d3ee]'
                  : scanType === 'QR'
                  ? 'bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#818cf8]'
                  : 'bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#c084fc]'
              }`}
            />
          </motion.div>
        </div>

        {/* Standby / Tap to Wake Camera Overlay */}
        {!isCameraActive && !cameraError && (
          <div
            onClick={onRetryCamera}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 backdrop-blur-xs transition-colors hover:bg-slate-950/20 group"
          >
            <div className="flex flex-col items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-slate-900/80 border border-white/20 shadow-2xl backdrop-blur-md group-hover:scale-105 transition-transform">
              <Camera className="w-7 h-7 text-indigo-400 animate-pulse" />
              <div className="text-center">
                <span className="text-xs font-bold text-white tracking-wide block">
                  {isStartingCamera ? 'Connecting Camera Stream...' : 'Tap to Wake Camera Lens'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isStartingCamera ? 'Optimizing optical feed' : 'Fast hardware scanner'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3 z-30">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-xs sm:text-sm font-bold text-white">Camera Access Notice</h3>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onRetryCamera}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>

              {onScanImageFile && (
                <label
                  htmlFor="scanner-photo-input"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all border border-indigo-400/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Snap / Upload Photo</span>
                  <input
                    id="scanner-photo-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && onScanImageFile) {
                        onScanImageFile(f);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden container for image file decoding */}
      <div id="html5qr-file-scanner-temp" className="hidden" />

      {/* 4. Compact Multi-State Instruction & Result Panel */}
      <div className="min-h-[72px] sm:min-h-[78px] shrink-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STATE: VALID (Success) */}
          {isSuccess && lastResult && (
            <motion.div
              key="valid-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-emerald-500/50 bg-emerald-950/70 text-emerald-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>✓ Valid Token • Check-In Confirmed</span>
                  </div>
                  {lastResult.student ? (
                    <>
                      <div className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
                        {lastResult.student.name}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-200/90 truncate">
                        USN: {lastResult.student.usn} • {lastResult.student.branch || 'General'}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-emerald-200 truncate">{lastResult.message}</div>
                  )}
                </div>
              </div>
              {/* Cooldown Progress Countdown Bar (10s Auto-Resume) */}
              <div className="w-full bg-emerald-950/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-emerald-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* STATE: CHECK-IN GRANTED — OFFLINE */}
          {isOfflineSuccess && lastResult && (
            <motion.div
              key="offline-granted-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              role="status"
              aria-live="polite"
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-sky-500/50 bg-sky-950/80 text-sky-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="w-5 h-5 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-sky-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>✓ CHECK-IN GRANTED — OFFLINE</span>
                  </div>
                  {lastResult.student ? (
                    <>
                      <div className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
                        {lastResult.student.name}
                      </div>
                      <div className="text-[11px] font-mono text-sky-200/90 truncate">
                        USN: {lastResult.student.usn} • {lastResult.student.branch || 'General'} (Pending Sync)
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-sky-200 truncate">{lastResult.message}</div>
                  )}
                </div>
              </div>
              <div className="w-full bg-sky-950/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-sky-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* STATE: POST-SYNC CONFLICT */}
          {isConflict && lastResult && (
            <motion.div
              key="conflict-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              role="alert"
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-purple-500/50 bg-purple-950/80 text-purple-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-purple-400">
                    <span>⚠ POST-SYNC CONFLICT</span>
                  </div>
                  <div className="text-xs text-purple-200 font-medium">
                    {lastResult.message || 'Attendee was already checked in on the cloud by another terminal.'}
                  </div>
                  {lastResult.student && (
                    <div className="text-[11px] font-mono text-purple-300/80 truncate">
                      {lastResult.student.name} ({lastResult.student.usn})
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full bg-purple-950/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-purple-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* STATE: EXPIRED OFFLINE DATA */}
          {isExpired && lastResult && (
            <motion.div
              key="expired-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              role="alert"
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-rose-500/50 bg-rose-950/80 text-rose-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-rose-400">
                    <span>OFFLINE ACCESS EXPIRED</span>
                  </div>
                  <div className="text-xs text-rose-200 font-medium">
                    {lastResult.message || 'Offline data expired. Please reconnect to the internet.'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE: QUEUED FOR SYNC (Standard) */}
          {!isOfflineSuccess && isQueuedOffline && lastResult && (
            <motion.div
              key="offline-queued-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              role="status"
              aria-live="polite"
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-sky-500/50 bg-sky-950/80 text-sky-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="w-5 h-5 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-sky-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Queued for Sync • Stored Locally</span>
                  </div>
                  <div className="text-xs text-sky-200 leading-snug">
                    Scan saved locally on device. Uniqueness will be reconciled with the cloud upon reconnection.
                  </div>
                </div>
              </div>
              <div className="w-full bg-sky-950/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-sky-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* STATE: ALREADY SCANNED (Duplicate) */}
          {isDuplicate && lastResult && (
            <motion.div
              key="duplicate-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-amber-500/50 bg-amber-950/70 text-amber-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-400">
                    <span>ALREADY CHECKED IN</span>
                  </div>
                  {lastResult.student ? (
                    <>
                      <div className="text-sm font-extrabold text-white truncate leading-tight">
                        {lastResult.student.name}
                      </div>
                      <div className="text-[11px] font-mono text-amber-200/90 truncate">
                        USN: {lastResult.student.usn} • {lastResult.message || 'Already verified on this terminal'}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-amber-200 truncate">{lastResult.message}</div>
                  )}
                </div>
              </div>
              {/* Cooldown Progress Countdown Bar (10s Auto-Resume) */}
              <div className="w-full bg-amber-950/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-amber-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* STATE: INVALID (Error) */}
          {isInvalid && lastResult && (
            <motion.div
              key="invalid-result"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full rounded-2xl p-3 sm:p-3.5 border border-rose-500/50 bg-rose-950/70 text-rose-300 shadow-xl flex flex-col gap-2 backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-rose-400">
                    <span>INVALID TICKET</span>
                  </div>
                  <div className="text-xs text-rose-200 font-medium truncate">
                    {lastResult.message || 'Pass not recognized for this event'}
                  </div>
                </div>
              </div>
              {/* Cooldown Progress Countdown Bar (10s Auto-Resume) */}
              <div className="w-full bg-rose-950/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-rose-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* STATE: PROCESSING / SCANNING */}
          {!lastResult && isProcessing && (
            <motion.div
              key="processing-state"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full rounded-2xl p-3 sm:p-3.5 glass-dark border border-cyan-500/30 flex items-center gap-3 shadow-lg"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                  Scanning…
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  Verifying credential with ADMITTO server…
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE: IDLE (Default Instructions) */}
          {!lastResult && !isProcessing && (
            <motion.div
              key="idle-state"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full rounded-2xl p-3 sm:p-3.5 glass-dark border border-white/10 flex items-center gap-3 shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white">
                  {scanType === 'QR' ? 'Align QR Code Pass' : 'Align Barcode Pass'}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {scanType === 'QR'
                    ? 'Align the attendee QR code inside the frame'
                    : 'Align the 1D barcode inside the frame'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Manual Input / Laser Barcode Gun Field with Real-Time Keystroke Search */}
      <div className="relative space-y-1 shrink-0" ref={searchContainerRef}>
        <form onSubmit={onManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="scanner-manual-input"
              type="text"
              placeholder="Search through any credentials"
              value={manualInput}
              onChange={(e) => {
                onManualInputChange(e.target.value);
                setIsDropdownOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                if (manualInput.trim().length > 0) setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className="w-full glass-input rounded-2xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {manualInput && (
              <button
                type="button"
                onClick={() => {
                  onManualInputChange('');
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            id="scanner-manual-submit-btn"
            type="submit"
            disabled={!manualInput?.trim() || isProcessing}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-50 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 transition-all"
          >
            <Send className="w-3.5 h-3.5 text-slate-900" />
            <span>Verify</span>
          </button>
        </form>

        {/* Real-time Keystroke Search Results Dropdown */}
        <AnimatePresence>
          {isDropdownOpen && manualInput.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 bottom-full mb-2 bg-zinc-950/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 divide-y divide-zinc-800/80 max-h-72 flex flex-col"
            >
              {/* Dropdown Header */}
              <div className="px-3.5 py-2 bg-indigo-950/50 flex items-center justify-between text-[11px] font-mono text-indigo-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {searchResults.length} matching attendee{searchResults.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="text-zinc-400 text-[10px]">Click or Enter to check in</span>
              </div>

              {/* Matching Results List */}
              <div className="overflow-y-auto divide-y divide-zinc-900/90 flex-1">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-zinc-300">No matching attendee for "{manualInput}"</p>
                    <p className="text-[10px] text-zinc-500">
                      Press "Verify" to validate unlisted barcode or external ticket
                    </p>
                  </div>
                ) : (
                  searchResults.map((student, idx) => {
                    const isCheckedIn = !!student.is_checked_in || !!student.checked_in;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={student.id || idx}
                        type="button"
                        onClick={() => handleSelectAttendee(student)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/25 text-white'
                            : 'hover:bg-zinc-900/90 text-zinc-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {student.name}
                            </span>
                            {student.branch && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono shrink-0">
                                {student.branch}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 truncate">
                            <span className="text-orange-400 font-semibold">{student.usn}</span>
                            {student.email && <span className="text-zinc-500 truncate">• {student.email}</span>}
                            {student.qr_code && student.qr_code !== student.usn && (
                              <span className="text-indigo-400 truncate">• QR: {student.qr_code}</span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge & Check-in Action */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                              isCheckedIn
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isCheckedIn ? 'Checked In' : 'Admit'}
                          </span>
                          <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white transition shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Done / Next Scan Action Button (Prominent below Search Bar) */}
      {(lastResult || isScannerPaused) && onDoneNextScan && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full shrink-0 pt-1"
        >
          <button
            id="scanner-done-next-btn"
            onClick={onDoneNextScan}
            type="button"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-[0_0_25px_rgba(16,185,129,0.45)] border border-emerald-300/40 flex items-center justify-center gap-2.5 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
            <span>Done • Ready for Next Scan</span>
            <ArrowRight className="w-4 h-4 text-emerald-100 ml-1" />
          </button>
        </motion.div>
      )}
    </div>
  );
};
