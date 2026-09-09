import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '../lib/api';

interface NetworkMonitorOptions {
  initialDelayMs?: number; // 250ms for snappy, smooth boot skeleton
  errorThresholdMs?: number; // 15000ms (15 seconds)
  checkEndpoint?: boolean;
}

export function useNetworkMonitor(options: NetworkMonitorOptions = {}) {
  const {
    initialDelayMs = 250,
    errorThresholdMs = 15000,
    checkEndpoint = true,
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isInitialBoot, setIsInitialBoot] = useState<boolean>(true);
  const [isLongNetworkError, setIsLongNetworkError] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [offlineDurationSec, setOfflineDurationSec] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Ping test function to check true internet / API reachability
  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    if (!checkEndpoint) return true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(getApiUrl('/api/health'), {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (err) {
      // If /api/health fails or timeout occurs, check if online
      return navigator.onLine;
    }
  }, [checkEndpoint]);

  // Handle Online / Offline window events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const healthy = await checkHealth();
      if (healthy) {
        setIsLongNetworkError(false);
        setOfflineDurationSec(0);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      startTimeRef.current = Date.now();
      
      // Start counting duration
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setOfflineDurationSec(elapsed);
        if (elapsed >= Math.floor(errorThresholdMs / 1000)) {
          setIsLongNetworkError(true);
        }
      }, 1000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkHealth, errorThresholdMs]);

  // Initial Boot 2.5s Skeleton Timer
  useEffect(() => {
    setIsInitialBoot(true);
    const bootTimer = setTimeout(() => {
      if (navigator.onLine) {
        setIsInitialBoot(false);
      } else {
        // If offline when initial 2.5s elapses, keep skeleton until connected or 15s error occurs
        startTimeRef.current = Date.now();
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setOfflineDurationSec(elapsed);
          if (elapsed >= Math.floor(errorThresholdMs / 1000)) {
            setIsLongNetworkError(true);
          }
        }, 1000);
      }
    }, initialDelayMs);

    return () => clearTimeout(bootTimer);
  }, [initialDelayMs, errorThresholdMs]);

  // Manual Retry Action
  const retry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const healthy = await checkHealth();
      if (healthy) {
        setIsOnline(true);
        setIsLongNetworkError(false);
        setIsInitialBoot(false);
        setOfflineDurationSec(0);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      } else {
        setIsOnline(false);
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 600);
    }
  }, [checkHealth]);

  return {
    isOnline,
    isInitialBoot,
    isLongNetworkError,
    isRetrying,
    offlineDurationSec,
    retry,
  };
}
