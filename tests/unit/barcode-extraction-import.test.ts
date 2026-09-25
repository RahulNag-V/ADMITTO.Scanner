import { describe, it, expect } from 'vitest';
import { extractBarcodeIdentifier, matchAttendeeWithIdentifier } from '../../src/lib/barcodeValidator';
import type { BarcodeConfig, Student } from '../../src/types';

describe('Barcode Extraction During Attendee Upload (Master Prompt Specs)', () => {
  const sampleId = '1BH24CS051';

  it('correctly extracts characters from FRONT (3, 5, 7)', () => {
    // Front + 3 -> 1BH
    const configFront3: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'front',
      character_count: 3
    };
    expect(extractBarcodeIdentifier(sampleId, configFront3)).toBe('1BH');

    // Front + 5 -> 1BH24
    const configFront5: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'front',
      character_count: 5
    };
    expect(extractBarcodeIdentifier(sampleId, configFront5)).toBe('1BH24');

    // Front + 7 -> 1BH24CS
    const configFront7: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'front',
      character_count: 7
    };
    expect(extractBarcodeIdentifier(sampleId, configFront7)).toBe('1BH24CS');
  });

  it('correctly extracts characters from END (3, 5, 7)', () => {
    // End + 3 -> 051
    const configEnd3: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 3
    };
    expect(extractBarcodeIdentifier(sampleId, configEnd3)).toBe('051');

    // End + 5 -> CS051
    const configEnd5: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 5
    };
    expect(extractBarcodeIdentifier(sampleId, configEnd5)).toBe('CS051');

    // End + 7 -> 24CS051
    const configEnd7: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 7
    };
    expect(extractBarcodeIdentifier(sampleId, configEnd7)).toBe('24CS051');
  });

  it('supports full ID mode without truncation', () => {
    const configFullId: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'full_id',
      full_id: true
    };
    expect(extractBarcodeIdentifier(sampleId, configFullId)).toBe('1BH24CS051');
  });

  it('handles optional fixed prefix and suffix', () => {
    const configWithPrefixSuffix: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 5,
      fixed_prefix: 'EVENT-',
      fixed_suffix: '-2026'
    };
    expect(extractBarcodeIdentifier(sampleId, configWithPrefixSuffix)).toBe('EVENT-CS051-2026');
  });

  it('handles null, undefined, and empty string gracefully', () => {
    const config: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'front',
      character_count: 5
    };
    expect(extractBarcodeIdentifier(null, config)).toBe('');
    expect(extractBarcodeIdentifier(undefined, config)).toBe('');
    expect(extractBarcodeIdentifier('   ', config)).toBe('');
  });

  it('correctly detects duplicate barcode identifiers across dataset', () => {
    const uploadedIds = ['1BH24CS051', '1BH24CS052', '1BH25EC101'];
    
    // Front + 3 produces duplicate '1BH' for 1BH24CS051 and 1BH24CS052 and 1BH25EC101
    const configFront3: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'front',
      character_count: 3
    };

    const counts: Record<string, number> = {};
    for (const id of uploadedIds) {
      const code = extractBarcodeIdentifier(id, configFront3).toUpperCase();
      counts[code] = (counts[code] || 0) + 1;
    }

    const duplicates = Object.entries(counts).filter(([_, count]) => count > 1);
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0][0]).toBe('1BH');
    expect(duplicates[0][1]).toBe(3);

    // End + 5 produces unique codes: CS051, CS052, EC101
    const configEnd5: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 5
    };

    const uniqueCounts: Record<string, number> = {};
    for (const id of uploadedIds) {
      const code = extractBarcodeIdentifier(id, configEnd5).toUpperCase();
      uniqueCounts[code] = (uniqueCounts[code] || 0) + 1;
    }
    const end5Duplicates = Object.entries(uniqueCounts).filter(([_, count]) => count > 1);
    expect(end5Duplicates.length).toBe(0);
  });

  it('matches attendee by extracted barcode during scanning check-in', () => {
    const attendee: Student = {
      id: 'att-1',
      event_id: 'evt-100',
      name: 'Rahul Nag',
      usn: '1BH24CS051',
      department: 'CSE',
      email: 'rahul@example.com',
      qr_code: 'tok-123',
      barcode: 'CS051',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const config: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 5
    };

    // Scanner inputs 'CS051'
    const match = matchAttendeeWithIdentifier(attendee, 'usn', 'CS051', false, config);
    expect(match).toBe(true);

    // Scanner inputs 'CS052' -> no match
    const mismatch = matchAttendeeWithIdentifier(attendee, 'usn', 'CS052', false, config);
    expect(mismatch).toBe(false);
  });
});
