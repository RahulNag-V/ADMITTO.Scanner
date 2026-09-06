import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';
import crypto from 'crypto';

describe('Atomic Concurrency Stress Test', () => {
  let adminId: string;
  let eventId: string;
  let studentUsn: string;

  beforeEach(async () => {
    dbService.setForceInMemory(true);
    dbService.resetDatabase();
    const admin = await dbService.createAdminProfile('concurrency_admin@test.local', 'Concurrency Tester', 'password123');
    adminId = admin.id;
    const event = await dbService.createEvent(adminId, {
      title: 'High Concurrency Symposium 2026',
      venue: 'Main Gate',
    });
    eventId = event.id;

    studentUsn = 'USN-RACE-001';
    await dbService.createStudent(eventId, adminId, {
      usn: studentUsn,
      name: 'Simultaneous Scan Attendee',
    });
  });

  it('handles 100 concurrent simultaneous scans with exactly 1 SUCCESS and 99 DUPLICATE_CHECKINs', async () => {
    const CONCURRENT_SCANNERS = 100;

    // Dispatch 100 simultaneous scans with distinct clientScanIds
    const scanPromises = Array.from({ length: CONCURRENT_SCANNERS }, (_, index) => {
      const clientScanId = `client_scan_concurrent_${index}_${crypto.randomUUID()}`;
      return dbService.processCheckIn({
        eventId,
        scannedValue: studentUsn,
        scanType: 'QR',
        clientScanId,
        source: 'online',
      });
    });

    const results = await Promise.all(scanPromises);

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const duplicateCount = results.filter((r) => r.status === 'DUPLICATE_CHECKIN').length;
    const otherCount = results.filter((r) => r.status !== 'SUCCESS' && r.status !== 'DUPLICATE_CHECKIN').length;

    expect(successCount).toBe(1);
    expect(duplicateCount).toBe(99);
    expect(otherCount).toBe(0);

    // Verify stats integrity
    const stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.total_checked_in).toBe(1);
    expect(stats.duplicates_blocked).toBe(99);
  });
});
