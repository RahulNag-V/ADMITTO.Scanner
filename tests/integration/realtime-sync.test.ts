import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';
import crypto from 'crypto';

describe('Real-Time Multi-Scanner Synchronization & Global Progress Test', () => {
  let adminId: string;
  let eventId: string;
  let scanner1Id: string;
  let scanner2Id: string;
  let scanner3Id: string;

  beforeEach(async () => {
    dbService.setForceInMemory(true);
    dbService.resetDatabase();

    const admin = await dbService.createAdminProfile('admin_sync@test.local', 'Global Organizer', 'password123');
    adminId = admin.id;

    const event = await dbService.createEvent(adminId, {
      title: 'Global Tech Summit 2026',
      venue: 'Main Auditorium',
    });
    eventId = event.id;

    // Create 3 separate scanners
    const s1 = await dbService.createScanner(eventId, adminId, { name: 'Scanner 1 - Main Gate', email: 'scanner1@test.local' });
    const s2 = await dbService.createScanner(eventId, adminId, { name: 'Scanner 2 - East Gate', email: 'scanner2@test.local' });
    const s3 = await dbService.createScanner(eventId, adminId, { name: 'Scanner 3 - VIP Gate', email: 'scanner3@test.local' });
    scanner1Id = s1.id;
    scanner2Id = s2.id;
    scanner3Id = s3.id;

    // Create 5 attendees
    for (let i = 1; i <= 5; i++) {
      await dbService.createStudent(eventId, adminId, {
        usn: `1BH24CS00${i}`,
        name: `Student Attendee 00${i}`,
        branch: 'CSE',
        year: '3rd Year',
        section: 'A',
      });
    }
  });

  it('updates global attendance progress uniformly across all scanners', async () => {
    // Total registered: 5
    // Scanner 1 checks in Student 1
    const res1 = await dbService.processCheckIn({
      eventId,
      scannedValue: '1BH24CS001',
      scanType: 'QR',
      scannerId: scanner1Id,
    });
    expect(res1.status).toBe('SUCCESS');

    let stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.total_attendees).toBe(5);
    expect(stats.total_checked_in).toBe(1);
    expect(stats.total_remaining).toBe(4);
    expect(stats.checkin_percentage).toBe(20); // (1 / 5) * 100

    // Scanner 2 checks in Student 2
    const res2 = await dbService.processCheckIn({
      eventId,
      scannedValue: '1BH24CS002',
      scanType: 'BARCODE',
      scannerId: scanner2Id,
    });
    expect(res2.status).toBe('SUCCESS');

    stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.total_checked_in).toBe(2);
    expect(stats.total_remaining).toBe(3);
    expect(stats.checkin_percentage).toBe(40); // (2 / 5) * 100

    // Scanner 3 checks in Student 3
    const res3 = await dbService.processCheckIn({
      eventId,
      scannedValue: '1BH24CS003',
      scanType: 'QR',
      scannerId: scanner3Id,
    });
    expect(res3.status).toBe('SUCCESS');

    stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.total_checked_in).toBe(3);
    expect(stats.total_remaining).toBe(2);
    expect(stats.checkin_percentage).toBe(60); // (3 / 5) * 100
  });

  it('tracks individual scanner activity telemetry and performance', async () => {
    // Scanner 1 scans 2 attendees
    await dbService.processCheckIn({
      eventId,
      scannedValue: '1BH24CS001',
      scanType: 'QR',
      scannerId: scanner1Id,
    });
    await dbService.processCheckIn({
      eventId,
      scannedValue: '1BH24CS002',
      scanType: 'QR',
      scannerId: scanner1Id,
    });

    // Scanner 2 scans 1 attendee
    await dbService.processCheckIn({
      eventId,
      scannedValue: '1BH24CS003',
      scanType: 'BARCODE',
      scannerId: scanner2Id,
    });

    const stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.scanner_activity).toBeDefined();
    expect(stats.scanner_activity!.length).toBe(3);

    const s1Activity = stats.scanner_activity!.find((s) => s.scanner_id === scanner1Id);
    const s2Activity = stats.scanner_activity!.find((s) => s.scanner_id === scanner2Id);
    const s3Activity = stats.scanner_activity!.find((s) => s.scanner_id === scanner3Id);

    expect(s1Activity?.total_successful_scans).toBe(2);
    expect(s1Activity?.status).toBe('Active');
    expect(s1Activity?.last_scan_time).not.toBeNull();

    expect(s2Activity?.total_successful_scans).toBe(1);
    expect(s2Activity?.status).toBe('Active');

    expect(s3Activity?.total_successful_scans).toBe(0);
  });

  it('prevents duplicate scans across two simultaneous scanners and preserves original scanner identity', async () => {
    // Both Scanner 1 and Scanner 2 attempt to scan the exact same student simultaneously
    const [res1, res2] = await Promise.all([
      dbService.processCheckIn({
        eventId,
        scannedValue: '1BH24CS001',
        scanType: 'QR',
        scannerId: scanner1Id,
        clientScanId: 'simul_s1_' + crypto.randomUUID(),
      }),
      dbService.processCheckIn({
        eventId,
        scannedValue: '1BH24CS001',
        scanType: 'QR',
        scannerId: scanner2Id,
        clientScanId: 'simul_s2_' + crypto.randomUUID(),
      }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain('SUCCESS');
    expect(statuses).toContain('DUPLICATE_CHECKIN');

    // Attendance progress must be exactly 1, not 2
    const stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.total_checked_in).toBe(1);
    expect(stats.duplicates_blocked).toBe(1);
    expect(stats.checkin_percentage).toBe(20);
  });
});
