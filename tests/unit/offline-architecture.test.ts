import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getAdmittoDB, clearAllOfflineData } from '../../src/lib/offline/idb';
import { localValidator } from '../../src/lib/offline/localValidator';
import { CachedEvent, CachedAttendee } from '../../src/lib/offline/types';
import { dbService } from '../../src/lib/db';
import crypto from 'crypto';

describe('Offline-First Architecture & Local Validation Engine', () => {
  const eventId = 'ev_test_1001';
  const scannerId = 'scn_user_101';
  const attendeeId = 'att_001';
  const usn = '1MS21CS099';
  const qrCode = 'ADMITTO-EV1001-TOKEN-099';
  const barcode = 'BAR99887766';

  beforeEach(async () => {
    await clearAllOfflineData();
    dbService.setForceInMemory(true);
    dbService.resetDatabase();

    // Populate IndexedDB cached_event and cached_attendees
    const db = await getAdmittoDB();
    const event: CachedEvent = {
      id: eventId,
      title: 'Global Tech Summit 2026',
      venue: 'Auditorium A',
      event_date: new Date().toISOString(),
      primary_scan_field: 'usn',
      downloaded_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(), // 8 hrs valid
      version: 'v1.0.0',
    };
    await db.put('cached_event', event);

    const attendee: CachedAttendee = {
      id: attendeeId,
      event_id: eventId,
      usn,
      name: 'Alice Turing',
      branch: 'Computer Science',
      qr_code: qrCode,
      barcode,
      primary_scan_value: usn,
      is_checked_in: false,
    };
    await db.put('cached_attendees', attendee);
  });

  it('A. Validates a matching QR code offline and grants check-in', async () => {
    const result = await localValidator.validate({
      eventId,
      scannedValue: qrCode,
      scanType: 'QR',
      scannerId,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS_OFFLINE');
    expect(result.message).toContain('CHECK-IN GRANTED — OFFLINE');
    expect(result.student?.id).toBe(attendeeId);
    expect(result.student?.name).toBe('Alice Turing');
    expect(result.client_scan_id).toBeDefined();

    // Verify written to local_check_ins and sync_queue
    const db = await getAdmittoDB();
    const checkIn = await db.get('local_check_ins', result.client_scan_id!);
    expect(checkIn).toBeDefined();
    expect(checkIn?.status).toBe('ACCEPTED');

    const queueItem = await db.get('sync_queue', result.client_scan_id!);
    expect(queueItem).toBeDefined();
    expect(queueItem?.status).toBe('PENDING');
  });

  it('B. Validates a matching Barcode offline and grants check-in', async () => {
    const result = await localValidator.validate({
      eventId,
      scannedValue: barcode,
      scanType: 'BARCODE',
      scannerId,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS_OFFLINE');
    expect(result.student?.usn).toBe(usn);
  });

  it('C. Rejects invalid ticket token offline with INVALID_TOKEN', async () => {
    const result = await localValidator.validate({
      eventId,
      scannedValue: 'NON_EXISTENT_QR_VALUE',
      scanType: 'QR',
      scannerId,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_TOKEN');
    expect(result.message).toContain('INVALID TICKET');

    // Confirm nothing enqueued
    const db = await getAdmittoDB();
    const queue = await db.getAll('sync_queue');
    expect(queue.length).toBe(0);
  });

  it('D. Immediately rejects local duplicate scan on the same terminal', async () => {
    // First scan: accepted
    const firstScan = await localValidator.validate({
      eventId,
      scannedValue: qrCode,
      scanType: 'QR',
      scannerId,
    });
    expect(firstScan.success).toBe(true);

    // Rapid consecutive scan of the exact same ticket
    const secondScan = await localValidator.validate({
      eventId,
      scannedValue: qrCode,
      scanType: 'QR',
      scannerId,
    });

    expect(secondScan.success).toBe(false);
    expect(secondScan.status).toBe('DUPLICATE_CHECKIN');
    expect(secondScan.message).toContain('ALREADY CHECKED IN ON THIS TERMINAL');

    // Queue must contain only exactly 1 pending item, not 2
    const db = await getAdmittoDB();
    const queue = await db.getAll('sync_queue');
    expect(queue.length).toBe(1);
  });

  it('E. Rejects scan when offline bundle has expired', async () => {
    // Expire the bundle
    const db = await getAdmittoDB();
    const event = await db.get('cached_event', eventId);
    if (event) {
      event.expires_at = new Date(Date.now() - 60000).toISOString(); // Expired 1 min ago
      await db.put('cached_event', event);
    }

    const result = await localValidator.validate({
      eventId,
      scannedValue: qrCode,
      scanType: 'QR',
      scannerId,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('EXPIRED_OFFLINE_DATA');
    expect(result.message).toContain('Offline access expired');
  });

  it('F. Rejects scan when no offline bundle exists for event', async () => {
    const result = await localValidator.validate({
      eventId: 'different_unknown_event',
      scannedValue: qrCode,
      scanType: 'QR',
      scannerId,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('EXPIRED_OFFLINE_DATA');
  });

  it('G. Handles JSON QR payloads ({ attendee_token: "..." }) offline', async () => {
    const jsonPayload = JSON.stringify({ attendee_token: qrCode, extra: '123' });
    const result = await localValidator.validate({
      eventId,
      scannedValue: jsonPayload,
      scanType: 'QR',
      scannerId,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS_OFFLINE');
    expect(result.student?.id).toBe(attendeeId);
  });

  it('CRITICAL TEST: Multi-Terminal Conflict Reconciliation', async () => {
    // Setup server database
    const admin = await dbService.createAdminProfile('admin@admitto.local', 'Admin', 'pass123');
    const dbEvent = await dbService.createEvent(admin.id, {
      title: 'Server Conflict Summit',
      venue: 'Main Gate',
    });
    const student = await dbService.createStudent(dbEvent.id, admin.id, {
      usn: 'USN-CONFLICT-001',
      name: 'Conflict Attendee',
    });

    // Scanner A offline generates scan A
    const clientScanIdA = 'scan_terminal_A_' + crypto.randomUUID();
    // Scanner B offline generates scan B for the same ticket
    const clientScanIdB = 'scan_terminal_B_' + crypto.randomUUID();

    // Terminal A reconnects and synchronizes first
    const syncResultA = await dbService.processCheckIn({
      eventId: dbEvent.id,
      scannedValue: student.usn,
      scanType: 'QR',
      clientScanId: clientScanIdA,
      source: 'offline_sync',
    });

    expect(syncResultA.success).toBe(true);
    expect(syncResultA.status).toBe('SUCCESS');

    // Terminal B reconnects later and synchronizes second
    const syncResultB = await dbService.processCheckIn({
      eventId: dbEvent.id,
      scannedValue: student.usn,
      scanType: 'QR',
      clientScanId: clientScanIdB,
      source: 'offline_sync',
    });

    // Server arrival order is authoritative: Terminal B is recognized as duplicate conflict!
    expect(syncResultB.success).toBe(false);
    expect(syncResultB.status).toBe('DUPLICATE_CHECKIN');

    // Exactly 1 check-in exists in PostgreSQL
    const stats = await dbService.getEventStats(dbEvent.id, admin.id);
    expect(stats.total_checked_in).toBe(1);
    expect(stats.duplicates_blocked).toBe(1);
  });

  it('H. Idempotent Retry: Retransmitting identical client_scan_id does not duplicate check-in', async () => {
    const admin = await dbService.createAdminProfile('idempotent@admitto.local', 'Admin', 'pass123');
    const dbEvent = await dbService.createEvent(admin.id, { title: 'Idempotency Event', venue: 'Gate 1' });
    const student = await dbService.createStudent(dbEvent.id, admin.id, { usn: 'USN-IDEM-001', name: 'Idem Attendee' });

    const clientScanId = 'client_uuid_same_' + crypto.randomUUID();

    // First delivery
    const res1 = await dbService.processCheckIn({
      eventId: dbEvent.id,
      scannedValue: student.usn,
      scanType: 'QR',
      clientScanId,
      source: 'offline_sync',
    });
    expect(res1.status).toBe('SUCCESS');

    // Duplicate delivery due to network retry
    const res2 = await dbService.processCheckIn({
      eventId: dbEvent.id,
      scannedValue: student.usn,
      scanType: 'QR',
      clientScanId,
      source: 'offline_sync',
    });
    expect(res2.success).toBe(true);
    expect(res2.status).toBe('IDEMPOTENT_SUCCESS');

    const stats = await dbService.getEventStats(dbEvent.id, admin.id);
    expect(stats.total_checked_in).toBe(1);
  });

  it('I. High-Capacity IndexedDB Roster: Fast lookups with 5,000 attendees', async () => {
    const db = await getAdmittoDB();
    const largeBatch: CachedAttendee[] = [];
    const count = 5000;

    for (let i = 0; i < count; i++) {
      largeBatch.push({
        id: `att_perf_${i}`,
        event_id: eventId,
        usn: `USN-PERF-${i.toString().padStart(5, '0')}`,
        name: `Attendee ${i}`,
        qr_code: `QR-PERF-${i.toString().padStart(5, '0')}`,
        barcode: `BAR-PERF-${i.toString().padStart(5, '0')}`,
        primary_scan_value: `USN-PERF-${i.toString().padStart(5, '0')}`,
        is_checked_in: false,
      });
    }

    const tx = db.transaction('cached_attendees', 'readwrite');
    for (const a of largeBatch) {
      await tx.objectStore('cached_attendees').put(a);
    }
    await tx.done;

    // Measure lookup time for attendee 4,999
    const start = performance.now();
    const result = await localValidator.validate({
      eventId,
      scannedValue: 'QR-PERF-04999',
      scanType: 'QR',
      scannerId,
    });
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(result.student?.usn).toBe('USN-PERF-04999');
    // Indexed lookup should take only milliseconds
    expect(elapsed).toBeLessThan(100);
  });
});
