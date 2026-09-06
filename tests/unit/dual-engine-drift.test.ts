import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';

describe('Dual-Engine Parity & Deterministic State Machine', () => {
  let adminId: string;
  let eventId: string;
  let studentId: string;
  let studentUsn: string;

  beforeEach(async () => {
    dbService.setForceInMemory(true);
    dbService.resetDatabase();
    const admin = await dbService.createAdminProfile('admin_engine@test.local', 'Engine Admin', 'password123');
    adminId = admin.id;
    const event = await dbService.createEvent(adminId, {
      title: 'Engine Parity Conclave',
      venue: 'Auditorium 1',
    });
    eventId = event.id;

    studentUsn = 'USN-PARITY-001';
    const student = await dbService.createStudent(eventId, adminId, {
      usn: studentUsn,
      name: 'Parity Tester',
    });
    studentId = student.id;
  });

  it('first scan transitions from UNCHECKED to CHECKED_IN with SUCCESS status', async () => {
    const clientScanId = 'client_uuid_101';
    const result = await dbService.processCheckIn({
      eventId,
      scannedValue: studentUsn,
      scanType: 'QR',
      clientScanId,
      source: 'online',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS');
    expect(result.student?.id).toBe(studentId);
    expect(result.check_in_id).toBeDefined();

    // Verify attendee state
    const students = await dbService.getStudents(eventId, adminId);
    const checkedAttendee = students.find((s) => s.id === studentId);
    expect(checkedAttendee?.is_checked_in).toBe(true);
  });

  it('second scan with a different client_scan_id triggers DUPLICATE_CHECKIN', async () => {
    // First scan
    await dbService.processCheckIn({
      eventId,
      scannedValue: studentUsn,
      scanType: 'QR',
      clientScanId: 'client_uuid_original',
      source: 'online',
    });

    // Attempted duplicate scan
    const dupResult = await dbService.processCheckIn({
      eventId,
      scannedValue: studentUsn,
      scanType: 'QR',
      clientScanId: 'client_uuid_different',
      source: 'online',
    });

    expect(dupResult.status).toBe('DUPLICATE_CHECKIN');
    expect(dupResult.message.toLowerCase()).toContain('already checked in');
  });

  it('re-submitting identical client_scan_id returns IDEMPOTENT_SUCCESS without creating second check-in', async () => {
    const clientScanId = 'client_uuid_retry_999';

    // First attempt succeeds
    const firstAttempt = await dbService.processCheckIn({
      eventId,
      scannedValue: studentUsn,
      scanType: 'BARCODE',
      clientScanId,
      source: 'online',
    });
    expect(firstAttempt.status).toBe('SUCCESS');

    // Identical client_scan_id retransmitted due to network glitch
    const retryAttempt = await dbService.processCheckIn({
      eventId,
      scannedValue: studentUsn,
      scanType: 'BARCODE',
      clientScanId,
      source: 'offline_sync',
    });

    expect(retryAttempt.success).toBe(true);
    expect(retryAttempt.status).toBe('IDEMPOTENT_SUCCESS');

    // Total check-ins must remain exactly 1
    const stats = await dbService.getEventStats(eventId, adminId);
    expect(stats.total_checked_in).toBe(1);
  });
});
