import { getAdmittoDB, setMetadata, getMetadata } from './idb';
import { apiFetch } from '../api';
import { OfflineBundleResponse, CachedEvent } from './types';
import { isBundleExpired } from './security';

const ACTIVE_BUNDLE_META_KEY = 'admitto_active_bundle_meta';

export const eventBundleService = {
  /**
   * Downloads and caches the authorized, scoped event bundle into IndexedDB.
   */
  downloadBundle: async (eventId: string): Promise<OfflineBundleResponse> => {
    const data = await apiFetch<OfflineBundleResponse>(`/api/events/${eventId}/offline-bundle`);

    if (!data || !data.success || !data.event) {
      throw new Error('Failed to retrieve offline bundle from server.');
    }

    const db = await getAdmittoDB();
    const tx = db.transaction(['cached_event', 'cached_attendees', 'local_check_ins', 'terminal_metadata'], 'readwrite');

    // 1. Put event
    await tx.objectStore('cached_event').put(data.event);

    // 2. Clear old cached attendees for this event before putting new
    const attendeeIdx = tx.objectStore('cached_attendees').index('by_event_id');
    let cursor = await attendeeIdx.openCursor(eventId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Put attendees in batch
    for (const attendee of data.attendees) {
      await tx.objectStore('cached_attendees').put(attendee);
    }

    // 3. Mark pre-checked-in students in local_check_ins to prevent local duplicates
    for (const studentId of data.checked_in_student_ids) {
      const existing = await tx.objectStore('local_check_ins').index('by_event_student').get([eventId, studentId]);
      if (!existing) {
        await tx.objectStore('local_check_ins').put({
          client_scan_id: `prechecked_${eventId}_${studentId}`,
          event_id: eventId,
          student_id: studentId,
          scanner_id: 'server_snapshot',
          device_uuid: 'server',
          scanned_value: studentId,
          scan_type: 'QR',
          scanned_at: data.downloaded_at,
          status: 'ACCEPTED',
        });
      }
    }

    await tx.done;

    // Save bundle metadata in terminal_metadata
    await setMetadata(ACTIVE_BUNDLE_META_KEY, {
      eventId: data.event.id,
      eventTitle: data.event.title,
      downloadedAt: data.downloaded_at,
      expiresAt: data.expires_at,
      version: data.version,
      attendeeCount: data.attendees.length,
    });

    return data;
  },

  /**
   * Get cached event from IndexedDB
   */
  getCachedEvent: async (eventId: string): Promise<CachedEvent | null> => {
    try {
      const db = await getAdmittoDB();
      const event = await db.get('cached_event', eventId);
      return event || null;
    } catch {
      return null;
    }
  },

  /**
   * Check if offline bundle is downloaded and still unexpired
   */
  isBundleReady: async (eventId: string): Promise<{ ready: boolean; reason?: string; expiresAt?: string }> => {
    try {
      const event = await eventBundleService.getCachedEvent(eventId);
      if (!event) {
        return { ready: false, reason: 'No offline bundle downloaded for this event.' };
      }

      if (isBundleExpired(event)) {
        return { ready: false, reason: 'Offline bundle expired. Please reconnect to refresh snapshot.', expiresAt: event.expires_at };
      }

      return { ready: true, expiresAt: event.expires_at };
    } catch (err: any) {
      return { ready: false, reason: err.message || 'Error checking offline bundle status.' };
    }
  },

  /**
   * Get active bundle metadata summary
   */
  getActiveBundleMeta: async () => {
    return getMetadata<{
      eventId: string;
      eventTitle: string;
      downloadedAt: string;
      expiresAt: string;
      version: string;
      attendeeCount: number;
    }>(ACTIVE_BUNDLE_META_KEY);
  },
};
