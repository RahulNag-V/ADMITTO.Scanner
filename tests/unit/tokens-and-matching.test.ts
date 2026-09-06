import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';
import crypto from 'crypto';

describe('Tokens & Identifier Matching Engine', () => {
  let adminId: string;
  let eventId: string;

  beforeEach(async () => {
    // Reset DB for test isolation
    dbService.setForceInMemory(true);
    dbService.resetDatabase();
    const admin = await dbService.createAdminProfile(`admin_${Date.now()}@test.local`, 'Test Admin', 'password123');
    adminId = admin.id;
    const event = await dbService.createEvent(adminId, {
      title: 'Tech Fest 2026',
      venue: 'Main Arena',
      primary_scan_field: 'usn',
      secondary_scan_field: 'phone_number',
      qr_mode: 'SECURE_TOKEN',
      barcode_field: 'usn',
    });
    eventId = event.id;
  });

  it('generates cryptographically secure unguessable tokens', async () => {
    const student = await dbService.createStudent(eventId, adminId, {
      usn: '1MS21CS001',
      name: 'Alice Johnson',
      email: 'alice@test.local',
    });

    expect(student.qr_code).toBeDefined();
    expect(student.qr_code.startsWith('adm_sec_')).toBe(true);
    // 128-bit CSPRNG hex is 32 hex characters
    expect(student.qr_code.replace('adm_sec_', '').length).toBe(32);
  });

  it('matches attendee by primary key case-insensitively and trimmed', async () => {
    const student = await dbService.createStudent(eventId, adminId, {
      usn: '1MS21CS002',
      name: 'Bob Smith',
    });

    const result = await dbService.processCheckIn({
      eventId,
      scannedValue: '  1ms21cs002  ',
      scanType: 'BARCODE',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS');
    expect(result.student?.id).toBe(student.id);
  });

  it('matches attendee by cryptographically secure QR token payload', async () => {
    const student = await dbService.createStudent(eventId, adminId, {
      usn: '1MS21CS003',
      name: 'Charlie Brown',
    });

    // Direct token string scan
    const result = await dbService.processCheckIn({
      eventId,
      scannedValue: student.qr_code,
      scanType: 'QR',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS');
    expect(result.student?.usn).toBe('1MS21CS003');
  });

  it('matches attendee by JSON formatted QR code payload', async () => {
    const student = await dbService.createStudent(eventId, adminId, {
      usn: '1MS21CS004',
      name: 'Diana Prince',
    });

    const jsonPayload = JSON.stringify({
      type: 'ADMITTO_ATTENDEE',
      event_id: eventId,
      attendee_token: student.qr_code,
      version: 1,
    });

    const result = await dbService.processCheckIn({
      eventId,
      scannedValue: jsonPayload,
      scanType: 'QR',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS');
    expect(result.student?.usn).toBe('1MS21CS004');
  });

  it('returns INVALID_TOKEN for nonexistent token', async () => {
    const result = await dbService.processCheckIn({
      eventId,
      scannedValue: 'NON_EXISTENT_TOKEN_12345',
      scanType: 'QR',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_TOKEN');
  });
});
