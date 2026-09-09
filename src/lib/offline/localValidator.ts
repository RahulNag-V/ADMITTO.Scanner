import { getAdmittoDB } from './idb';
import { ScanType, ScanValidationResult, Student } from '../../types';
import { CachedEvent, CachedAttendee, LocalCheckIn, SyncQueueItem } from './types';
import { getOrCreateDeviceUuid, isBundleExpired } from './security';

export interface LocalScanParams {
  eventId: string;
  scannedValue: string;
  scanType: ScanType;
  scannerId: string;
  scannerName?: string;
  secondaryValue?: string;
}

export const localValidator = {
  /**
   * Validate a scan completely offline against cached IndexedDB snapshot.
   */
  validate: async (params: LocalScanParams): Promise<ScanValidationResult & { provisional?: boolean; client_scan_id?: string }> => {
    const { eventId, scannedValue, scanType, scannerId, secondaryValue } = params;
    const cleanVal = (scannedValue || '').trim();
    const cleanSecVal = (secondaryValue || '').trim();

    if (!cleanVal) {
      return {
        success: false,
        status: 'INVALID_TOKEN',
        message: 'No QR or barcode data provided.',
      };
    }

    const db = await getAdmittoDB();

    // 1. Verify cached event bundle exists and is unexpired
    const event = await db.get('cached_event', eventId);
    if (!event) {
      return {
        success: false,
        status: 'EXPIRED_OFFLINE_DATA',
        message: 'No offline data found for this event. Connect online to load event.',
      };
    }

    if (isBundleExpired(event)) {
      return {
        success: false,
        status: 'EXPIRED_OFFLINE_DATA',
        message: 'Offline access expired. Reconnect to internet to synchronize and refresh.',
      };
    }

    // 2. Extract token if scanned value is JSON (e.g. { attendee_token: "..." })
    let lookupVal = cleanVal;
    if (cleanVal.startsWith('{') && cleanVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanVal);
        if (parsed.attendee_token) {
          lookupVal = parsed.attendee_token;
        }
      } catch {
        lookupVal = cleanVal;
      }
    }

    // 3. Fast IndexedDB Index Lookup
    const attendeeStore = db.transaction('cached_attendees', 'readonly').objectStore('cached_attendees');
    let matchedAttendees: CachedAttendee[] = [];

    if (scanType === 'QR') {
      // Look up by QR index
      const byQr = await attendeeStore.index('by_event_qr').getAll([eventId, lookupVal]);
      if (byQr.length > 0) {
        matchedAttendees = byQr;
      } else if (lookupVal !== cleanVal) {
        const byCleanQr = await attendeeStore.index('by_event_qr').getAll([eventId, cleanVal]);
        if (byCleanQr.length > 0) matchedAttendees = byCleanQr;
      }
    } else {
      // Look up by Barcode index
      const byBarcode = await attendeeStore.index('by_event_barcode').getAll([eventId, cleanVal]);
      if (byBarcode.length > 0) {
        matchedAttendees = byBarcode;
      }
    }

    // If not matched by QR/Barcode, check primary scan field index (e.g. USN or custom field)
    if (matchedAttendees.length === 0) {
      const byUsn = await attendeeStore.index('by_event_usn').getAll([eventId, cleanVal]);
      if (byUsn.length > 0) {
        matchedAttendees = byUsn;
      } else {
        const byPrimary = await attendeeStore.index('by_event_primary').getAll([eventId, cleanVal]);
        if (byPrimary.length > 0) {
          matchedAttendees = byPrimary;
        }
      }
    }

    // Case: No attendee matched in local snapshot
    if (matchedAttendees.length === 0) {
      return {
        success: false,
        status: 'INVALID_TOKEN',
        message: 'INVALID TICKET — Token not recognized in attendee list.',
      };
    }

    // Case: Ambiguous match (multiple attendees with same primary key, e.g. duplicate name)
    let selectedAttendee: CachedAttendee | null = null;
    if (matchedAttendees.length > 1) {
      if (cleanSecVal) {
        selectedAttendee =
          matchedAttendees.find(
            (a) =>
              (a.secondary_scan_value && a.secondary_scan_value.toLowerCase() === cleanSecVal.toLowerCase()) ||
              a.usn.toLowerCase() === cleanSecVal.toLowerCase()
          ) || null;
      }

      if (!selectedAttendee) {
        return {
          success: false,
          status: 'AMBIGUOUS_MATCH',
          message: `Multiple attendees found. Secondary verification required (${event.secondary_scan_field || 'email'}).`,
          requires_secondary: true,
          secondary_field: event.secondary_scan_field || 'email',
          primary_value: cleanVal,
        };
      }
    } else {
      selectedAttendee = matchedAttendees[0];
    }

    const studentSummary: Student = {
      id: selectedAttendee.id,
      event_id: selectedAttendee.event_id,
      usn: selectedAttendee.usn,
      name: selectedAttendee.name,
      branch: selectedAttendee.branch,
      qr_code: selectedAttendee.qr_code,
      barcode: selectedAttendee.barcode,
      is_checked_in: true,
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Local Duplicate Check (Atomic IndexedDB transaction)
    const deviceUuid = await getOrCreateDeviceUuid();
    const tx = db.transaction(['local_check_ins', 'sync_queue'], 'readwrite');
    const checkInsStore = tx.objectStore('local_check_ins');
    const queueStore = tx.objectStore('sync_queue');

    const existingCheckIn = await checkInsStore.index('by_event_student').get([eventId, selectedAttendee.id]);
    if (existingCheckIn) {
      await tx.done;
      return {
        success: false,
        status: 'DUPLICATE_CHECKIN',
        message: 'ALREADY CHECKED IN ON THIS TERMINAL',
        student: studentSummary,
        check_in_at: existingCheckIn.scanned_at,
      };
    }

    // 5. Generate cryptographically secure client_scan_id
    let clientScanId: string;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      clientScanId = crypto.randomUUID();
    } else {
      clientScanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }

    const nowIso = new Date().toISOString();

    // 6. Record local check-in to block immediate consecutive duplicate scans
    const localEntry: LocalCheckIn = {
      client_scan_id: clientScanId,
      event_id: eventId,
      student_id: selectedAttendee.id,
      scanner_id: scannerId,
      device_uuid: deviceUuid,
      scanned_value: cleanVal,
      scan_type: scanType,
      scanned_at: nowIso,
      status: 'ACCEPTED',
    };
    await checkInsStore.put(localEntry);

    // 7. Enqueue to sync_queue with status 'PENDING'
    const queueEntry: SyncQueueItem = {
      client_scan_id: clientScanId,
      event_id: eventId,
      student_id: selectedAttendee.id,
      scanner_id: scannerId,
      device_uuid: deviceUuid,
      scanned_value: cleanVal,
      scan_type: scanType,
      status: 'PENDING',
      created_at: nowIso,
      last_attempt_at: null,
      retry_count: 0,
    };
    await queueStore.put(queueEntry);

    await tx.done;

    return {
      success: true,
      status: 'SUCCESS_OFFLINE',
      message: 'CHECK-IN GRANTED — OFFLINE / PENDING SERVER SYNC',
      student: studentSummary,
      check_in_id: clientScanId,
      check_in_at: nowIso,
      provisional: true,
      client_scan_id: clientScanId,
    };
  },
};
