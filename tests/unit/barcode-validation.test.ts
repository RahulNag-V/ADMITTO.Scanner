import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';
import { validateBarcodePattern, resolveBarcodeConfig, matchAttendeeWithIdentifier } from '../../src/lib/barcodeValidator';
import { BarcodeConfig, Student } from '../../src/types';

describe('Configurable Barcode Prefix / Suffix Validation Engine', () => {
  describe('validateBarcodePattern unit logic', () => {
    it('validates prefix mode and extracts unique identifier', () => {
      const config: BarcodeConfig = {
        mode: 'prefix',
        value: '1BH',
        identifier_field: 'usn',
        case_sensitive: false,
        min_length: null,
        max_length: null,
      };

      const validResult = validateBarcodePattern('1BH24CS051', config);
      expect(validResult.valid).toBe(true);
      if (validResult.valid) {
        expect(validResult.extractedIdentifier).toBe('24CS051');
        expect(validResult.mode).toBe('prefix');
        expect(validResult.identifierField).toBe('usn');
      }

      const invalidResult = validateBarcodePattern('2BH24CS051', config);
      expect(invalidResult.valid).toBe(false);
      if (!invalidResult.valid) {
        expect(invalidResult.reason).toBe('PREFIX_MISMATCH');
        expect(invalidResult.message).toBe('This barcode does not belong to this event.');
      }
    });

    it('validates suffix mode and extracts unique identifier', () => {
      const config: BarcodeConfig = {
        mode: 'suffix',
        value: '2026',
        identifier_field: 'registration_id',
        case_sensitive: false,
        min_length: null,
        max_length: null,
      };

      const validResult = validateBarcodePattern('24CS0512026', config);
      expect(validResult.valid).toBe(true);
      if (validResult.valid) {
        expect(validResult.extractedIdentifier).toBe('24CS051');
        expect(validResult.mode).toBe('suffix');
      }

      const invalidResult = validateBarcodePattern('24CS0512025', config);
      expect(invalidResult.valid).toBe(false);
      if (!invalidResult.valid) {
        expect(invalidResult.reason).toBe('SUFFIX_MISMATCH');
        expect(invalidResult.message).toBe('This barcode does not belong to this event.');
      }
    });

    it('enforces min and max length validation when enabled', () => {
      const config: BarcodeConfig = {
        mode: 'prefix',
        value: '1BH',
        identifier_field: 'usn',
        case_sensitive: false,
        min_length: 9,
        max_length: 12,
      };

      // Length 10 -> valid
      expect(validateBarcodePattern('1BH24CS051', config).valid).toBe(true);

      // Too short: length 8 ('1BH24CS0') -> reject
      const shortResult = validateBarcodePattern('1BH24CS0', config);
      expect(shortResult.valid).toBe(false);

      // Too long: length 13 ('1BH24CS0510000') -> reject
      const longResult = validateBarcodePattern('1BH24CS0510000', config);
      expect(longResult.valid).toBe(false);
    });

    it('handles case-sensitive vs case-insensitive matching', () => {
      const caseSensitiveConfig: BarcodeConfig = {
        mode: 'prefix',
        value: '1BH',
        identifier_field: 'usn',
        case_sensitive: true,
        min_length: null,
        max_length: null,
      };

      const insensitiveConfig: BarcodeConfig = {
        mode: 'prefix',
        value: '1BH',
        identifier_field: 'usn',
        case_sensitive: false,
        min_length: null,
        max_length: null,
      };

      expect(validateBarcodePattern('1bh24CS051', caseSensitiveConfig).valid).toBe(false);
      expect(validateBarcodePattern('1bh24CS051', insensitiveConfig).valid).toBe(true);
    });
  });

  describe('Section 20: 10 End-to-End Verification Test Cases', () => {
    let adminId: string;
    let eventId: string;
    let otherEventId: string;

    beforeEach(async () => {
      dbService.setForceInMemory(true);
      dbService.resetDatabase();

      const admin = await dbService.createAdminProfile('admin@admitto.test', 'Admin User', 'password123');
      adminId = admin.id;

      // Event with Prefix = 1BH, Identifier = USN
      const event = await dbService.createEvent(adminId, {
        title: 'Annual Tech Symposium',
        venue: 'Auditorium A',
        primary_scan_field: 'usn',
        barcode_field: 'usn',
        barcode_config: {
          mode: 'prefix',
          value: '1BH',
          identifier_field: 'usn',
          case_sensitive: false,
          min_length: null,
          max_length: null,
        },
      });
      eventId = event.id;

      // Register Attendees per prompt specification:
      // 1BH24CS001, 1BH24CS002, 1BH24CS051
      await dbService.createStudent(eventId, adminId, {
        usn: '24CS001',
        name: 'Attendee 1',
        barcode: '1BH24CS001',
      });

      await dbService.createStudent(eventId, adminId, {
        usn: '24CS002',
        name: 'Attendee 2',
        barcode: '1BH24CS002',
      });

      await dbService.createStudent(eventId, adminId, {
        usn: '24CS051',
        name: 'Rahul Nag V',
        barcode: '1BH24CS051',
      });

      // Second event for wrong event test
      const otherEvent = await dbService.createEvent(adminId, {
        title: 'Other Event',
        venue: 'Hall B',
        primary_scan_field: 'usn',
      });
      otherEventId = otherEvent.id;
    });

    // Test 1: 1BH24CS051 → ACCEPT
    it('Test 1: scans 1BH24CS051 and accepts check-in', async () => {
      const res = await dbService.processCheckIn({
        eventId,
        scannedValue: '1BH24CS051',
        scanType: 'BARCODE',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUCCESS');
      expect(res.student?.usn).toBe('24CS051');
      expect(res.student?.name).toBe('Rahul Nag V');
    });

    // Test 2: 1BH24CS001 → ACCEPT
    it('Test 2: scans 1BH24CS001 and accepts check-in', async () => {
      const res = await dbService.processCheckIn({
        eventId,
        scannedValue: '1BH24CS001',
        scanType: 'BARCODE',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUCCESS');
      expect(res.student?.usn).toBe('24CS001');
    });

    // Test 3: 2BH24CS051 → REJECT (does not search unrelated attendees)
    it('Test 3: scans 2BH24CS051 with prefix mismatch and rejects immediately', async () => {
      const res = await dbService.processCheckIn({
        eventId,
        scannedValue: '2BH24CS051',
        scanType: 'BARCODE',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('INVALID_BARCODE');
      expect(res.message).toBe('This barcode does not belong to this event.');
    });

    // Test 4: 1BH99XX999 → REJECT because attendee does not exist
    it('Test 4: scans valid prefix but unknown identifier 1BH99XX999 and rejects', async () => {
      const res = await dbService.processCheckIn({
        eventId,
        scannedValue: '1BH99XX999',
        scanType: 'BARCODE',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('ATTENDEE_NOT_FOUND');
      expect(res.message).toBe('Barcode recognized, but no registered attendee was found.');
    });

    // Test 5: Empty barcode → REJECT
    it('Test 5: rejects empty barcode', async () => {
      const res = await dbService.processCheckIn({
        eventId,
        scannedValue: '   ',
        scanType: 'BARCODE',
      });

      expect(res.success).toBe(false);
      expect(res.message).toMatch(/No QR or barcode data provided|Barcode cannot be empty/);
    });

    // Test 6: Suffix mode → Correctly validate ending value
    it('Test 6: verifies Suffix mode matching and extraction', async () => {
      // Create Suffix mode event
      const suffixEvent = await dbService.createEvent(adminId, {
        title: 'Suffix Event',
        venue: 'Arena S',
        barcode_config: {
          mode: 'suffix',
          value: '2026',
          identifier_field: 'usn',
          case_sensitive: false,
          min_length: null,
          max_length: null,
        },
      });

      await dbService.createStudent(suffixEvent.id, adminId, {
        usn: '24CS051',
        name: 'Rahul Nag V',
        barcode: '24CS0512026',
      });

      // Valid suffix
      const acceptRes = await dbService.processCheckIn({
        eventId: suffixEvent.id,
        scannedValue: '24CS0512026',
        scanType: 'BARCODE',
      });
      expect(acceptRes.success).toBe(true);
      expect(acceptRes.student?.usn).toBe('24CS051');

      // Invalid suffix
      const rejectRes = await dbService.processCheckIn({
        eventId: suffixEvent.id,
        scannedValue: '24CS0512025',
        scanType: 'BARCODE',
      });
      expect(rejectRes.success).toBe(false);
      expect(rejectRes.message).toBe('This barcode does not belong to this event.');
    });

    // Test 7: Full barcode mode → Require exact match
    it('Test 7: verifies Full barcode mode requires exact match', async () => {
      const fullEvent = await dbService.createEvent(adminId, {
        title: 'Full Barcode Event',
        venue: 'Arena F',
        barcode_config: {
          mode: 'full',
          value: '',
          identifier_field: 'barcode',
          case_sensitive: false,
          min_length: null,
          max_length: null,
        },
      });

      await dbService.createStudent(fullEvent.id, adminId, {
        usn: '24CS051',
        name: 'Rahul Nag V',
        barcode: '1BH24CS051',
      });

      // Exact match
      const exactRes = await dbService.processCheckIn({
        eventId: fullEvent.id,
        scannedValue: '1BH24CS051',
        scanType: 'BARCODE',
      });
      expect(exactRes.success).toBe(true);

      // Non-matching barcode
      const mismatchRes = await dbService.processCheckIn({
        eventId: fullEvent.id,
        scannedValue: '1BH24CS052',
        scanType: 'BARCODE',
      });
      expect(mismatchRes.success).toBe(false);
      expect(mismatchRes.message).toBe('Barcode recognized, but no registered attendee was found.');
    });

    // Test 8: Wrong event → REJECT
    it('Test 8: rejects scan against inactive or non-existent event', async () => {
      const res = await dbService.processCheckIn({
        eventId: 'non-existent-event-id',
        scannedValue: '1BH24CS051',
        scanType: 'BARCODE',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('WRONG_EVENT');
    });

    // Test 9: Already scanned → Show Already Scanned
    it('Test 9: detects duplicate scan and returns ALREADY CHECKED IN', async () => {
      // First scan: Success
      const firstScan = await dbService.processCheckIn({
        eventId,
        scannedValue: '1BH24CS051',
        scanType: 'BARCODE',
      });
      expect(firstScan.success).toBe(true);

      // Second scan: Duplicate
      const secondScan = await dbService.processCheckIn({
        eventId,
        scannedValue: '1BH24CS051',
        scanType: 'BARCODE',
      });
      expect(secondScan.success).toBe(false);
      expect(secondScan.status).toBe('DUPLICATE_CHECKIN');
      expect(secondScan.message).toMatch(/ALREADY CHECKED IN/);
    });

    // Test 10: Case-insensitive configuration → Verify uppercase/lowercase behavior correctly
    it('Test 10: verifies case-insensitive vs case-sensitive matching behavior', async () => {
      // Event is case-insensitive by default
      const resInsensitive = await dbService.processCheckIn({
        eventId,
        scannedValue: '1bh24cs051',
        scanType: 'BARCODE',
      });
      expect(resInsensitive.success).toBe(true);
      expect(resInsensitive.student?.usn).toBe('24CS051');

      // Update event to case-sensitive
      await dbService.updateEvent(eventId, adminId, {
        barcode_config: {
          mode: 'prefix',
          value: '1BH',
          identifier_field: 'usn',
          case_sensitive: true,
          min_length: null,
          max_length: null,
        },
      });

      // Lowercase prefix should now be rejected under strict case-sensitivity
      const resSensitiveMismatch = await dbService.processCheckIn({
        eventId,
        scannedValue: '1bh24cs002',
        scanType: 'BARCODE',
      });
      expect(resSensitiveMismatch.success).toBe(false);
      expect(resSensitiveMismatch.message).toBe('This barcode does not belong to this event.');
    });

    it('ensures editing barcode configuration does not modify existing attendee records in database', async () => {
      // Check attendee before edit
      const studentsBefore = await dbService.getStudents(eventId, adminId);
      const student051Before = studentsBefore.find((s) => s.usn === '24CS051');
      expect(student051Before?.barcode).toBe('1BH24CS051');

      // Edit barcode config to a different prefix
      await dbService.updateEvent(eventId, adminId, {
        barcode_config: {
          mode: 'prefix',
          value: 'NEWPREFIX',
          identifier_field: 'usn',
          case_sensitive: false,
          min_length: null,
          max_length: null,
        },
      });

      // Verify attendee barcode remains completely unmodified
      const studentsAfter = await dbService.getStudents(eventId, adminId);
      const student051After = studentsAfter.find((s) => s.usn === '24CS051');
      expect(student051After?.barcode).toBe('1BH24CS051');
    });
  });
});
