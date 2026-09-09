import { scanApi } from '../api';
import { localValidator, LocalScanParams } from './localValidator';
import { ScanValidationResult, ScanType } from '../../types';
import { syncEngine } from './syncEngine';

export interface ScanRequestParams {
  eventId: string;
  scannedValue: string;
  scanType: ScanType;
  scannerId: string;
  scannerName?: string;
  secondaryValue?: string;
  clientScanId?: string;
  forceOffline?: boolean;
}

export interface ScanResponse extends ScanValidationResult {
  isOffline?: boolean;
  provisional?: boolean;
  clientScanId?: string;
}

class ScanRepository {
  /**
   * Centralized validate function.
   * If online: attempts authoritative server check-in.
   * If network fails or offline: safely transitions to local offline validation engine.
   */
  async validate(params: ScanRequestParams): Promise<ScanResponse> {
    const { eventId, scannedValue, scanType, scannerId, scannerName, secondaryValue, clientScanId, forceOffline } = params;

    const isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Fast path: if explicitly forced offline or browser is offline
    if (forceOffline || !isBrowserOnline) {
      return this.validateOffline({
        eventId,
        scannedValue,
        scanType,
        scannerId,
        scannerName,
        secondaryValue,
      });
    }

    // Try online validation with a timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const serverResult = await scanApi.validate(
        eventId,
        scannedValue,
        scanType,
        clientScanId,
        secondaryValue
      );
      clearTimeout(timeoutId);

      return {
        ...serverResult,
        isOffline: false,
        provisional: false,
      };
    } catch (networkErr: any) {
      console.warn('[ScanRepository] Online validation failed/unreachable. Falling back to local offline validator:', networkErr);

      // Automatic fallback to offline validator
      return this.validateOffline({
        eventId,
        scannedValue,
        scanType,
        scannerId,
        scannerName,
        secondaryValue,
      });
    }
  }

  /**
   * Validate using local snapshot and atomic IndexedDB duplicate prevention
   */
  private async validateOffline(params: LocalScanParams): Promise<ScanResponse> {
    const result = await localValidator.validate(params);

    // If an offline scan was queued, notify sync engine to update pending count
    if (result.success && result.client_scan_id) {
      // Trigger background sync attempt if network comes back
      syncEngine.getQueueStatus(params.eventId);
    }

    return {
      ...result,
      isOffline: true,
      provisional: true,
      clientScanId: result.client_scan_id,
    };
  }
}

export const scanRepository = new ScanRepository();
