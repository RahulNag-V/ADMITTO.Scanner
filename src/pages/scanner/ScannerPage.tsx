import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  QrCode,
  Barcode,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  CheckCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Zap,
  Key,
  ShieldCheck,
  Shield,
  Home,
} from 'lucide-react';
import {
  AuthSession,
  ScanType,
  ScanValidationResult,
  OfflineQueuedScan,
  EventItem,
  Student,
  ScanAttempt,
  EventStats,
} from '../../types';
import { scanApi, offlineQueue, eventsApi, studentsApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { scanRepository } from '../../lib/offline/scanRepository';
import { syncEngine, SyncEngineStatus } from '../../lib/offline/syncEngine';
import { eventBundleService } from '../../lib/offline/eventBundle';
import { saveOfflineAuthContext, getOrCreateDeviceUuid } from '../../lib/offline/security';
import { purgeEventOfflineData, getCachedAttendees } from '../../lib/offline/idb';

// Dock and Tab subcomponents
import { AppleDock, ScannerDockTab } from '../../components/scanner/AppleDock';
import { ScannerHomeTab } from '../../components/scanner/ScannerHomeTab';
import { ScannerRosterTab } from '../../components/scanner/ScannerRosterTab';
import { ScannerLogTab } from '../../components/scanner/ScannerLogTab';
import { ScannerStatsTab } from '../../components/scanner/ScannerStatsTab';
import { AppLogo } from '../../components/common/AppLogo';
import { ScannerSettingsTab, ScannerPreferences } from '../../components/scanner/ScannerSettingsTab';
import { AdmittoScannerTerminal } from '../../components/scanner/AdmittoScannerTerminal';
import { ScannerTabSkeletonView } from '../../components/common/Skeleton';

interface ScannerPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigateHome?: () => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({
  session,
  onLogout,
  onNavigateHome,
}) => {
  const eventId = session.user.event_id || '';
  const initialEventTitle = session.user.event_title || 'Assigned Event';
  const scannerName = session.user.name || 'Terminal Gate';

  // 1. Navigation Dock State
  const [activeTab, setActiveTab] = useState<ScannerDockTab>('scanner');
  const [isTabChanging, setIsTabChanging] = useState(false);
  const [direction, setDirection] = useState<number>(0);
  const prevTabRef = useRef<ScannerDockTab>('scanner');

  const dockTabOrder: ScannerDockTab[] = ['home', 'log', 'scanner', 'stats', 'settings'];

  const handleSelectDockTab = (tab: ScannerDockTab) => {
    if (tab === activeTab) return;
    const prevIdx = dockTabOrder.indexOf(activeTab);
    const nextIdx = dockTabOrder.indexOf(tab);
    if (prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx) {
      setDirection(nextIdx > prevIdx ? 1 : -1);
    } else {
      // If navigating from or to 'roster' (which is now a subpage opened from Home)
      setDirection(tab === 'roster' ? 1 : -1);
    }
    setIsTabChanging(true);
    setActiveTab(tab);
    setTimeout(() => setIsTabChanging(false), 500);
  };

  // Swipe Gesture Handling for Scanner Tab Transitions
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't intercept touches on interactive controls, inputs, camera viewport or dialogs
    if (target.closest('input, textarea, select, [role="dialog"], #qr-reader, video, .no-swipe')) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartXRef.current === null ||
      touchEndXRef.current === null ||
      touchStartYRef.current === null ||
      touchEndYRef.current === null
    ) {
      return;
    }

    const deltaX = touchEndXRef.current - touchStartXRef.current;
    const deltaY = touchEndYRef.current - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const currentIdx = dockTabOrder.indexOf(activeTab);
      if (currentIdx === -1) return;

      if (deltaX < 0) {
        // Swiped Right-to-Left (finger moved left) -> Next Page (slides in from right)
        if (currentIdx < dockTabOrder.length - 1) {
          const nextTab = dockTabOrder[currentIdx + 1];
          setDirection(1);
          setIsTabChanging(true);
          setActiveTab(nextTab);
          playFeedbackSound('click');
          setTimeout(() => setIsTabChanging(false), 500);
        }
      } else {
        // Swiped Left-to-Right (finger moved right) -> Previous Page (slides in from left)
        if (currentIdx > 0) {
          const prevTab = dockTabOrder[currentIdx - 1];
          setDirection(-1);
          setIsTabChanging(true);
          setActiveTab(prevTab);
          playFeedbackSound('click');
          setTimeout(() => setIsTabChanging(false), 500);
        }
      }
    }
  };

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      const prevIdx = dockTabOrder.indexOf(prevTabRef.current);
      const nextIdx = dockTabOrder.indexOf(activeTab);
      if (prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx) {
        setDirection(nextIdx > prevIdx ? 1 : -1);
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);
  // 2. Event, Students, Logs & Stats Data State
  const [event, setEvent] = useState<EventItem | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ScanAttempt[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 3. Scanner Preferences State (Saved in LocalStorage)
  const [prefs, setPrefs] = useState<ScannerPreferences>(() => {
    try {
      const saved = localStorage.getItem('admitto_scanner_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.cooldownDelay || parsed.cooldownDelay < 4000) {
          parsed.cooldownDelay = 5000;
        }
        if (!parsed.autoClearDelay || parsed.autoClearDelay < 4000) {
          parsed.autoClearDelay = 5000;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved scanner prefs:', e);
    }
    return {
      audioEnabled: true,
      hapticEnabled: true,
      cooldownDelay: 5000, // 5.0 seconds delay (4-6s range)
      autoContinuous: true,
      facingMode: 'environment',
      torchEnabled: false,
      autoClearDelay: 5000, // 5.0 seconds display window
      laserGunAutoSubmit: true,
    };
  });

  const handleUpdatePrefs = (newPrefs: Partial<ScannerPreferences>) => {
    setPrefs((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('admitto_scanner_prefs', JSON.stringify(updated));
      return updated;
    });
  };

  // 4. Optical Camera & Scan State
  const [scanType, setScanType] = useState<ScanType>('QR');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);

  // 5. Connectivity & Offline Sync Engine
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
    lastError: null,
  });
  const [isBundleReady, setIsBundleReady] = useState(false);
  const [bundleExpiry, setBundleExpiry] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 6. Scan Outcome Banner & Ambiguous Match Resolution
  const [lastResult, setLastResult] = useState<ScanValidationResult | null>(null);
  const [lastScannedPayload, setLastScannedPayload] = useState<string>('');
  const [ambiguousMatch, setAmbiguousMatch] = useState<{
    primaryValue: string;
    secondaryField: string;
  } | null>(null);
  const [secondaryInputVal, setSecondaryInputVal] = useState('');
  const [isVerifyingSecondary, setIsVerifyingSecondary] = useState(false);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5qr-code-viewfinder';
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoClearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reminderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isTransitioningCameraRef = useRef(false);
  const mountedRef = useRef(true);
  const isPausedRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Load Event Details, Students Roster, Scan Logs & Statistics
  const loadTerminalData = async () => {
    if (!eventId) return;
    try {
      setIsLoadingData(true);
      const [eventRes, studentsRes, logsRes, statsRes] = await Promise.allSettled([
        eventsApi.get(eventId),
        studentsApi.list(eventId),
        scanApi.getHistory(eventId),
        eventsApi.getStats(eventId),
      ]);

      if (eventRes.status === 'fulfilled' && eventRes.value?.event) {
        if (eventRes.value.event.status === 'DELETED') {
          alert('This event has been deleted by the administrator. Please enter a referral code to connect to an active event.');
          handleSafeLogout();
          return;
        }
        setEvent(eventRes.value.event);
      } else if (eventRes.status === 'rejected') {
        const errMsg = (eventRes.reason?.message || '').toLowerCase();
        if (errMsg.includes('not found') || errMsg.includes('deleted') || errMsg.includes('forbidden') || errMsg.includes('unauthorized')) {
          alert('This event is no longer active or was deleted by the administrator.');
          handleSafeLogout();
          return;
        }
      }

      if (studentsRes.status === 'fulfilled' && studentsRes.value) {
        setStudents(studentsRes.value.students || []);
      } else {
        try {
          const cached = await getCachedAttendees(eventId);
          if (cached && cached.length > 0) {
            setStudents(
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
        } catch (cErr) {
          console.warn('[ScannerPage] Could not load offline cached attendees:', cErr);
        }
      }
      if (logsRes.status === 'fulfilled' && logsRes.value) {
        setLogs(logsRes.value.scans || []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
      }
    } catch (err) {
      console.error('Error fetching terminal data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Manual Refresh Handler: Reconciles live data and offline bundle
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      playFeedbackSound('click');
      if (navigator.onLine) {
        await syncEngine.triggerSync(eventId);
        try {
          const bundle = await eventBundleService.downloadBundle(eventId);
          setIsBundleReady(true);
          setBundleExpiry(bundle.expires_at);
        } catch (bErr) {
          console.warn('[ScannerPage] Offline bundle refresh failed:', bErr);
        }
      }
      await loadTerminalData();
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadTerminalData();
  }, [eventId]);

  // Periodic event liveness check: If admin deletes event, safely terminate
  useEffect(() => {
    if (!eventId) return;
    const checkTimer = setInterval(async () => {
      try {
        const res = await eventsApi.get(eventId);
        if (!res.event || res.event.status === 'DELETED') {
          alert('This event has been deleted by the administrator. Returning to referral code section.');
          handleSafeLogout();
        }
      } catch (err: any) {
        const errMsg = (err.message || '').toLowerCase();
        if (errMsg.includes('not found') || errMsg.includes('deleted') || errMsg.includes('forbidden') || errMsg.includes('unauthorized')) {
          alert('This event has been deleted by the administrator. Returning to referral code section.');
          handleSafeLogout();
        }
      }
    }, 8000);

    return () => clearInterval(checkTimer);
  }, [eventId]);

  // Offline Engine Initialization & Sync Engine Listeners
  useEffect(() => {
    mountedRef.current = true;
    if (!eventId) return;

    let isSubscribed = true;

    async function initOfflineEngine() {
      try {
        const deviceUuid = await getOrCreateDeviceUuid();
        await saveOfflineAuthContext({
          scannerId: session.user.id,
          scannerName,
          scannerEmail: session.user.email,
          eventId,
          role: session.user.role as 'SCANNER' | 'ADMIN',
          token: session.token,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          deviceUuid,
        });

        // Set active event for periodic sync engine
        syncEngine.setActiveEvent(eventId);

        // Verify offline bundle readiness
        const bundleCheck = await eventBundleService.isBundleReady(eventId);
        if (bundleCheck.ready) {
          if (isSubscribed) {
            setIsBundleReady(true);
            setBundleExpiry(bundleCheck.expiresAt || null);
          }
        } else if (navigator.onLine) {
          // Auto-download bundle snapshot if online
          try {
            const bundle = await eventBundleService.downloadBundle(eventId);
            if (isSubscribed) {
              setIsBundleReady(true);
              setBundleExpiry(bundle.expires_at);
            }
          } catch (bErr) {
            console.warn('[ScannerPage] Offline bundle download notice:', bErr);
          }
        }
      } catch (err) {
        console.error('[ScannerPage] Offline engine init error:', err);
      }
    }

    initOfflineEngine();

    const unsubscribeSync = syncEngine.subscribe((status) => {
      if (isSubscribed) setSyncStatus(status);
    });

    const unsubscribeRevocation = syncEngine.onRevocation(async () => {
      alert('Your scanner access has been revoked or expired by the administrator.');
      handleSafeLogout();
    });

    const handleOnline = () => {
      setIsOnline(true);
      syncEngine.triggerSync(eventId);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isSubscribed = false;
      mountedRef.current = false;
      unsubscribeSync();
      unsubscribeRevocation();
      syncEngine.stopPeriodicSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [eventId, session]);

  // Initialize camera scanner instantly when on Scanner tab
  useEffect(() => {
    let isCurrent = true;

    if (activeTab === 'scanner') {
      // Fast immediate start
      const timer = setTimeout(() => {
        if (isCurrent) {
          startCameraScanner();
        }
      }, 50);

      return () => {
        isCurrent = false;
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }

    return () => {
      isCurrent = false;
      stopCameraScanner();
    };
  }, [activeTab, scanType, prefs.facingMode]);

  const stopCameraScanner = async () => {
    if (!qrReaderRef.current) return;
    
    if (isTransitioningCameraRef.current) {
      return;
    }

    try {
      isTransitioningCameraRef.current = true;
      const scanner = qrReaderRef.current;
      if (scanner && scanner.isScanning) {
        await scanner.stop();
      }
      if (scanner) {
        try {
          scanner.clear();
        } catch (e) {
          // ignore clear error
        }
      }
      qrReaderRef.current = null;
    } catch (err: any) {
      if (!err?.message?.includes('already under transition')) {
        console.warn('Camera stop notice:', err);
      }
    } finally {
      isTransitioningCameraRef.current = false;
      setIsCameraActive(false);
      setIsStartingCamera(false);
    }
  };

  const startCameraScanner = async () => {
    if (isTransitioningCameraRef.current) return;

    try {
      isTransitioningCameraRef.current = true;
      setIsStartingCamera(true);
      setCameraError(null);

      if (qrReaderRef.current) {
        if (qrReaderRef.current.isScanning) {
          await qrReaderRef.current.stop();
        }
        try {
          qrReaderRef.current.clear();
        } catch (e) {
          // ignore clear error
        }
        qrReaderRef.current = null;
      }

      // Check if container element exists in DOM or retry briefly
      let container = document.getElementById(readerElementId);
      if (!container) {
        // Wait up to 150ms for DOM mounting
        await new Promise((r) => setTimeout(r, 150));
        container = document.getElementById(readerElementId);
      }

      if (!container || !mountedRef.current) {
        isTransitioningCameraRef.current = false;
        setIsStartingCamera(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      qrReaderRef.current = html5QrCode;

      const config = {
        fps: 20,
        aspectRatio: undefined,
        qrbox: undefined,
        videoConstraints: {
          facingMode: { ideal: prefs.facingMode },
          focusMode: 'continuous',
        } as any,
      };

      // Check for secure context and mediaDevices availability
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setIsCameraActive(false);
        setCameraError(
          'Mobile browsers block live camera on plain HTTP IP. Please open using the secure HTTPS tunnel link or upload a QR image/photo.'
        );
        isTransitioningCameraRef.current = false;
        setIsStartingCamera(false);
        return;
      }

      if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        setIsCameraActive(false);
        setCameraError(
          'Camera API is not supported or permitted on this connection. Please use the HTTPS link or upload a photo of the QR code.'
        );
        isTransitioningCameraRef.current = false;
        setIsStartingCamera(false);
        return;
      }

      await html5QrCode.start(
        { facingMode: prefs.facingMode },
        config,
        (decodedText) => {
          if (isPausedRef.current || isProcessingRef.current) return;
          handleTokenScanned(decodedText);
        },
        () => {
          // ignore frame ticks
        }
      );

      if (mountedRef.current) {
        setIsCameraActive(true);
      }
    } catch (err: any) {
      if (!err?.message?.includes('already under transition')) {
        console.warn('Camera initiation notice:', err);
      }
      if (mountedRef.current) {
        setIsCameraActive(false);
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('notallowed')) {
          setCameraError('Camera permission was denied. Please allow camera access in your browser settings.');
        } else {
          setCameraError('Camera stream could not be started. Tap "Retry Camera" or upload a QR image below.');
        }
      }
    } finally {
      isTransitioningCameraRef.current = false;
      setIsStartingCamera(false);
    }
  };

  // Image / Photo File Scan Fallback
  const handleScanImageFile = async (file: File) => {
    try {
      setIsProcessing(true);
      const scanner = new Html5Qrcode('html5qr-file-scanner-temp');
      const decoded = await scanner.scanFile(file, false);
      if (decoded) {
        handleTokenScanned(decoded);
      }
    } catch (err: any) {
      console.warn('Image file decode error:', err);
      playFeedbackSound('error');
      setLastResult({
        success: false,
        status: 'INVALID_TOKEN',
        message: 'No readable QR code or barcode found in this photo.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Main check-in verification handler
  const handleTokenScanned = async (scannedToken: string) => {
    if (isProcessingRef.current || isPausedRef.current) return;
    const token = (scannedToken || '').trim();
    if (!token) return;

    isProcessingRef.current = true;
    isPausedRef.current = true;
    setIsProcessing(true);
    setIsScannerPaused(true);
    setLastScannedPayload(token);

    // Pause optical recognition stream immediately to prevent duplicate frames
    if (qrReaderRef.current) {
      try {
        qrReaderRef.current.pause(true);
      } catch (e) {
        // ignore if browser engine doesn't support pause
      }
    }

    // Haptic vibration feedback
    if (prefs.hapticEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch (e) {
        // ignore haptic unsupported
      }
    }

    try {
      const [result] = await Promise.all([
        scanRepository.validate({
          eventId,
          scannedValue: token,
          scanType,
          scannerId: session.user.id,
          scannerName,
        }),
        new Promise((r) => setTimeout(r, 350)),
      ]);
      setLastResult(result);

      // Sound Feedback
      if (prefs.audioEnabled) {
        if (result.status === 'SUCCESS' || result.status === 'IDEMPOTENT_SUCCESS' || result.status === 'SUCCESS_OFFLINE') {
          playFeedbackSound('success');
        } else if (result.status === 'DUPLICATE_CHECKIN' || result.status === 'POST_SYNC_DUPLICATE_CONFLICT') {
          playFeedbackSound('duplicate');
        } else {
          playFeedbackSound('error');
        }
      }

      // Add to local logs array immediately
      const newLogEntry: ScanAttempt = {
        id: 'log-' + Date.now(),
        event_id: eventId,
        student_id: result.student?.id || null,
        scanned_value: token,
        scan_type: scanType,
        result:
          result.status === 'SUCCESS' || result.status === 'IDEMPOTENT_SUCCESS' || result.status === 'SUCCESS_OFFLINE'
            ? 'success'
            : result.status === 'DUPLICATE_CHECKIN' || result.status === 'POST_SYNC_DUPLICATE_CONFLICT'
            ? 'duplicate'
            : 'invalid',
        reason: result.message,
        timestamp: new Date().toISOString(),
        student: result.student,
        scanner: {
          id: session.user.id,
          name: scannerName,
          event_id: eventId,
          email: session.user.email,
          access_code: session.user.id.substring(0, 8),
          role: 'SCANNER',
          is_active: true,
          expires_at: null,
          last_login_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      setLogs((prev) => [newLogEntry, ...prev]);

      // Refresh stats and students roster
      if (result.status === 'SUCCESS' || result.status === 'IDEMPOTENT_SUCCESS' || result.status === 'SUCCESS_OFFLINE') {
        if (result.student) {
          setStudents((prev) =>
            prev.map((s) =>
              s.id === result.student!.id
                ? { ...s, is_checked_in: true, checked_in: true, checked_in_at: new Date().toISOString() }
                : s
            )
          );
        }
        setStats((prev) =>
          prev
            ? {
                ...prev,
                total_checked_in: prev.total_checked_in + 1,
                total_remaining: Math.max(0, prev.total_remaining - 1),
                qr_scans: scanType === 'QR' ? prev.qr_scans + 1 : prev.qr_scans,
                barcode_scans: scanType === 'BARCODE' ? prev.barcode_scans + 1 : prev.barcode_scans,
              }
            : null
        );
      } else if (result.status === 'DUPLICATE_CHECKIN') {
        setStats((prev) =>
          prev ? { ...prev, duplicates_blocked: prev.duplicates_blocked + 1 } : null
        );
      } else if (result.status === 'AMBIGUOUS_MATCH' || result.requires_secondary) {
        setAmbiguousMatch({
          primaryValue: token,
          secondaryField: result.secondary_field || event?.secondary_scan_field || 'email',
        });
        setSecondaryInputVal('');
      }
    } catch (err: any) {
      console.error('Scan processing error:', err);
      if (prefs.audioEnabled) playFeedbackSound('error');
      setLastResult({
        success: false,
        status: 'ERROR',
        message: err.message || 'Scanning processing error',
      });
    }

    // Clear any previous timers
    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);

    // 1. If Done button is not clicked within 5 seconds: Play soft gentle reminder sound
    reminderTimerRef.current = setTimeout(() => {
      if (isPausedRef.current && prefs.audioEnabled) {
        playFeedbackSound('reminder');
      }
    }, 5000);

    // 2. If Done button is not clicked after 10 seconds: Automatically ready for the next scan
    autoResumeTimerRef.current = setTimeout(() => {
      if (isPausedRef.current) {
        handleDoneNextScan();
      }
    }, 10000);
  };

  // Reset scanner and resume optical feed for the next attendee
  const handleDoneNextScan = () => {
    playFeedbackSound('click');
    setLastResult(null);
    setLastScannedPayload('');
    setIsProcessing(false);
    setIsScannerPaused(false);
    isProcessingRef.current = false;
    isPausedRef.current = false;

    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

    if (qrReaderRef.current) {
      try {
        qrReaderRef.current.resume();
      } catch (e) {
        // If resume fails, restart camera scanner cleanly
        startCameraScanner();
      }
    }
  };

  // Submit secondary key verification when match is ambiguous
  const handleSecondarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambiguousMatch || !secondaryInputVal.trim()) return;
    setIsVerifyingSecondary(true);

    try {
      const result = await scanApi.validate(
        eventId,
        ambiguousMatch.primaryValue,
        scanType,
        undefined,
        secondaryInputVal.trim()
      );
      setLastResult(result);
      if (result.status === 'SUCCESS' || result.status === 'IDEMPOTENT_SUCCESS') {
        playFeedbackSound('success');
        setAmbiguousMatch(null);
        if (result.student) {
          setStudents((prev) =>
            prev.map((s) =>
              s.id === result.student!.id
                ? { ...s, is_checked_in: true, checked_in: true, checked_in_at: new Date().toISOString() }
                : s
            )
          );
        }
        setStats((prev) =>
          prev
            ? {
                ...prev,
                total_checked_in: prev.total_checked_in + 1,
                total_remaining: Math.max(0, prev.total_remaining - 1),
                qr_scans: scanType === 'QR' ? prev.qr_scans + 1 : prev.qr_scans,
                barcode_scans: scanType === 'BARCODE' ? prev.barcode_scans + 1 : prev.barcode_scans,
              }
            : null
        );
      } else {
        playFeedbackSound('error');
      }
    } catch (err: any) {
      alert(err.message || 'Secondary verification failed');
    } finally {
      setIsVerifyingSecondary(false);
    }
  };

  // Toggle Flashlight / Torch
  const handleToggleTorch = async () => {
    const nextState = !prefs.torchEnabled;
    handleUpdatePrefs({ torchEnabled: nextState });
    playFeedbackSound('click');

    // 1. Try Html5Qrcode API
    if (qrReaderRef.current) {
      try {
        await qrReaderRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState }],
        });
      } catch (e) {
        // Continue to MediaStreamTrack fallback
      }
    }

    // 2. Direct MediaStreamTrack constraint fallback
    try {
      const videoEl = document.querySelector(`#${readerElementId} video`) as HTMLVideoElement | null;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          await (track as any).applyConstraints({
            advanced: [{ torch: nextState }],
          });
        }
      }
    } catch (err) {
      console.warn('Torch constraint not supported on this device/lens:', err);
    }
  };

  // Manual Trigger for Sync Engine
  const handleManualSync = async () => {
    if (syncStatus.isSyncing) return;
    try {
      const res = await syncEngine.triggerSync(eventId);
      if (res.synced > 0) {
        if (prefs.audioEnabled) playFeedbackSound('success');
        loadTerminalData();
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  // Safe Guarded Logout: Prevents accidental loss of unsynced scans
  const handleSafeLogout = async () => {
    try {
      const status = await syncEngine.getQueueStatus(eventId);
      if (status.pending > 0) {
        if (navigator.onLine) {
          try {
            await syncEngine.triggerSync(eventId);
            const recheck = await syncEngine.getQueueStatus(eventId);
            if (recheck.pending === 0) {
              await purgeEventOfflineData(eventId, false);
              onLogout();
              return;
            }
          } catch {
            // continue to user prompt
          }
        }

        const confirmProceed = window.confirm(
          `CAUTION: You have ${status.pending} offline scan(s) that have not yet synced with the cloud.\n\n` +
          `Logging out will prevent automatic reconciliation from this browser.\n\n` +
          `Do you want to log out anyway?`
        );
        if (!confirmProceed) return;
      }

      await purgeEventOfflineData(eventId, false);
      onLogout();
    } catch {
      onLogout();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (manualInput || '').trim();
    if (!clean) return;
    handleTokenScanned(clean);
    setManualInput('');
  };

  // Quick verify/check-in attendee selected directly from live search dropdown
  const handleSelectStudentFromSearch = (student: Student) => {
    const value = student.qr_code || student.usn || student.barcode || student.name;
    handleTokenScanned(value);
    setManualInput('');
  };

  // Toggle check-in from Home student list
  const handleToggleCheckInFromHome = async (studentId: string, currentStatus: boolean) => {
    try {
      const updated = await studentsApi.toggleCheckIn(studentId, !currentStatus);
      if (updated) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId ? { ...s, is_checked_in: !currentStatus, checked_in: !currentStatus } : s
          )
        );
        loadTerminalData();
      }
    } catch (err) {
      console.error('Error toggling check-in:', err);
    }
  };

  const duplicateScansCount = logs.filter((l) => l.result === 'duplicate').length;

  return (
    <div
      id="scanner-terminal-app"
      className="h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden mesh-bg text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white"
    >
      {/* 1. Universal Top Header Bar with Refresh Action */}
      <header className="glass-header border-b border-white/[0.08] px-3.5 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40 flex items-center justify-between shadow-lg shrink-0">
        <div
          onClick={onNavigateHome}
          className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${onNavigateHome ? 'cursor-pointer group select-none' : ''}`}
          title={onNavigateHome ? 'Return to Home Page' : undefined}
        >
          <AppLogo size="sm" className="shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform" />
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight truncate group-hover:text-orange-400 transition-colors">
              {scannerName}
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-md font-medium">
              {event?.title || initialEventTitle}
            </p>
          </div>
        </div>

        {/* Action Controls: Refresh Button & Connectivity */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateHome && (
            <button
              id="scanner-header-home-btn"
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] active:scale-95 border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm"
              title="Return to Home Page"
            >
              <Home className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-medium hidden xs:inline sm:inline">
                Home
              </span>
            </button>
          )}

          <button
            id="scanner-header-refresh-btn"
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoadingData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] active:scale-95 border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
            title="Refresh Roster & Sync Scans"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin text-indigo-300' : ''}`} />
            <span className="text-[11px] font-mono font-medium hidden xs:inline sm:inline">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-mono border ${
              syncStatus.isSyncing
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 animate-pulse'
                : isOnline
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
            title={
              syncStatus.isSyncing
                ? `Synchronizing ${syncStatus.pendingCount} scan(s)...`
                : isOnline
                ? 'Connected to live cloud server'
                : 'Offline mode (Scans saved locally)'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus.isSyncing
                  ? 'bg-indigo-400 animate-spin'
                  : isOnline
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">
              {syncStatus.isSyncing
                ? `SYNCING ${syncStatus.pendingCount}`
                : isOnline
                ? syncStatus.pendingCount > 0
                  ? `ONLINE (${syncStatus.pendingCount} PENDING)`
                  : 'ONLINE'
                : syncStatus.pendingCount > 0
                ? `OFFLINE (${syncStatus.pendingCount} QUEUED)`
                : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Viewport (Driven by active Apple Dock Tab) */}
      <main
        id="scanner-main-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 min-h-0 w-full px-3 sm:px-4 max-w-5xl mx-auto flex flex-col justify-start overflow-y-auto overflow-x-hidden apple-momentum-scroll ${
          activeTab === 'scanner' ? 'py-2 sm:py-3 overflow-hidden' : 'py-6 pb-28'
        }`}
      >
        <AnimatePresence custom={direction} mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir >= 0 ? 180 : -180,
                opacity: 0,
                filter: 'blur(3px)',
                scale: 0.99,
              }),
              center: {
                x: 0,
                opacity: 1,
                filter: 'blur(0px)',
                scale: 1,
                transition: {
                  x: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                  filter: { duration: 0.28 },
                  scale: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                },
              },
              exit: (dir: number) => ({
                x: dir >= 0 ? -180 : 180,
                opacity: 0,
                filter: 'blur(3px)',
                scale: 0.99,
                transition: {
                  x: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  filter: { duration: 0.2 },
                  scale: { duration: 0.26 },
                },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ willChange: 'transform, opacity, filter' }}
            className="w-full flex-1 flex flex-col"
          >
            {isTabChanging || (isLoadingData && activeTab !== 'scanner') ? (
              <ScannerTabSkeletonView tabId={activeTab} />
            ) : (
              <>
                {/* TAB 1: HOME */}
                {activeTab === 'home' && (
                  <ScannerHomeTab
                    event={event}
                    students={students}
                    scannerName={scannerName}
                    onToggleCheckIn={handleToggleCheckInFromHome}
                    onNavigateToRoster={() => handleSelectDockTab('roster')}
                  />
                )}

                {/* TAB 2: ATTENDEES ROSTER (DEDICATED PAGE OPENED FROM HOME) */}
                {activeTab === 'roster' && (
                  <ScannerRosterTab
                    students={students}
                    onToggleCheckIn={handleToggleCheckInFromHome}
                    onBackToHome={() => handleSelectDockTab('home')}
                  />
                )}

                {/* TAB 3: LOGS */}
                {activeTab === 'log' && <ScannerLogTab logs={logs} />}

                {/* TAB 4: SCANNER - Dedicated Admitto Terminal Viewport */}
                {activeTab === 'scanner' && (
                  <AdmittoScannerTerminal
                    scanType={scanType}
                    onScanTypeChange={setScanType}
                    readerElementId={readerElementId}
                    isCameraActive={isCameraActive}
                    isStartingCamera={isStartingCamera}
                    cameraError={cameraError}
                    onRetryCamera={startCameraScanner}
                    onScanImageFile={handleScanImageFile}
                    lastResult={lastResult}
                    lastScannedPayload={lastScannedPayload}
                    isProcessing={isProcessing}
                    manualInput={manualInput}
                    onManualInputChange={setManualInput}
                    onManualSubmit={handleManualSubmit}
                    queuedScansCount={syncStatus.pendingCount}
                    isSyncing={syncStatus.isSyncing}
                    isOnline={isOnline}
                    onSyncOffline={handleManualSync}
                    prefs={prefs}
                    onToggleFacingMode={() => {
                      const next = prefs.facingMode === 'environment' ? 'user' : 'environment';
                      handleUpdatePrefs({ facingMode: next });
                    }}
                    onToggleTorch={handleToggleTorch}
                    isScannerPaused={isScannerPaused}
                    onDoneNextScan={handleDoneNextScan}
                    primaryScanField={event?.primary_scan_field || 'usn'}
                    secondaryScanField={event?.secondary_scan_field || undefined}
                    students={students}
                    eventId={eventId}
                    onSelectStudent={handleSelectStudentFromSearch}
                  />
                )}

                {/* TAB 5: STATS */}
                {activeTab === 'stats' && (
                  <ScannerStatsTab
                    stats={stats}
                    students={students}
                    eventName={event?.title || initialEventTitle}
                    onNavigateToRoster={() => handleSelectDockTab('roster')}
                  />
                )}

                {/* TAB 6: SETTINGS */}
                {activeTab === 'settings' && (
                  <ScannerSettingsTab
                    prefs={prefs}
                    onUpdatePrefs={handleUpdatePrefs}
                    scannerName={scannerName}
                    accessCode={session.user.id.substring(0, 8).toUpperCase()}
                    eventName={event?.title || initialEventTitle}
                    isOnline={isOnline}
                    isLoadingData={isLoadingData}
                    onRefreshData={loadTerminalData}
                    offlineCount={syncStatus.pendingCount}
                    onSyncOffline={handleManualSync}
                    onClearOffline={async () => {
                      await purgeEventOfflineData(eventId, true);
                      await syncEngine.getQueueStatus(eventId);
                    }}
                    onLogout={handleSafeLogout}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Secondary Key Verification Prompt Modal via React Portal */}
      {ambiguousMatch && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#151a2e] border border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Additional Verification Required
                </h3>
                <p className="text-xs text-amber-300">
                  Multiple attendees match "{ambiguousMatch.primaryValue}"
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This event requires secondary verification when duplicate primary keys exist. Please prompt the attendee for their <strong className="text-white uppercase font-mono">{ambiguousMatch.secondaryField}</strong> to confirm check-in.
            </p>

            <form onSubmit={handleSecondarySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enter Attendee {ambiguousMatch.secondaryField}</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={`e.g. attendee's ${ambiguousMatch.secondaryField}`}
                  value={secondaryInputVal}
                  onChange={(e) => setSecondaryInputVal(e.target.value)}
                  className="w-full bg-white/[0.08] border border-amber-500/50 focus:border-amber-400 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAmbiguousMatch(null);
                    setSecondaryInputVal('');
                    handleDoneNextScan();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel Scan
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingSecondary || !secondaryInputVal.trim()}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Key className={`w-3.5 h-3.5 ${isVerifyingSecondary ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingSecondary ? 'Verifying...' : 'Verify & Check In'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Persistent Apple-Style Dock Navigation */}
      <AppleDock
        activeTab={activeTab}
        onSelectTab={handleSelectDockTab}
        studentCount={students.length}
        logCount={logs.length}
        offlineCount={syncStatus.pendingCount}
        duplicateCount={duplicateScansCount}
      />
    </div>
  );
};
