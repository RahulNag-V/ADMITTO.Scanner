import { describe, it, expect } from 'vitest';
import {
  extractBarcodeIdentifier,
  validateAttendeeBarcodeExtraction,
  matchAttendeeWithIdentifier
} from '../../src/lib/barcodeValidator';
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

  it('Section 16: rejects empty or shorter IDs and does not silently truncate', () => {
    const config7: BarcodeConfig = {
      enabled: true,
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 7
    };

    // Shorter value '12345' (length 5 < 7) must return '' from extractor
    expect(extractBarcodeIdentifier('12345', config7)).toBe('');

    // validateAttendeeBarcodeExtraction flags specific error
    const resShort = validateAttendeeBarcodeExtraction('12345', config7);
    expect(resShort.valid).toBe(false);
    expect(resShort.error).toBe('ID contains only 5 characters (requires 7).');

    // Empty ID rejection
    const resEmpty = validateAttendeeBarcodeExtraction('', config7);
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.error).toBe('Barcode cannot be generated because the selected ID is empty.');
  });

  it('Section 20 Acceptance Test: full upload -> End + 5 extraction -> scanning lookup', () => {
    const uploadedData = [
      { usn: '1BH24CS051', name: 'Rahul', department: 'CSE' },
      { usn: '1BH24CS052', name: 'Arun', department: 'CSE' },
      { usn: '1BH24CS053', name: 'Kiran', department: 'CSE' }
    ];

    const config: BarcodeConfig = {
      enabled: true,
      identifier_field: 'usn',
      extraction_mode: 'custom',
      extraction_position: 'end',
      character_count: 5
    };

    // Step 1: Transform every row and attach barcode
    const transformed = uploadedData.map((row) => ({
      ...row,
      barcode: extractBarcodeIdentifier(row.usn, config)
    }));

    expect(transformed[0].barcode).toBe('CS051');
    expect(transformed[1].barcode).toBe('CS052');
    expect(transformed[2].barcode).toBe('CS053');

    // Step 2: Verify all 3 are unique
    const uniqueKeys = new Set(transformed.map((t) => t.barcode));
    expect(uniqueKeys.size).toBe(3);

    // Step 3: Scanner lookup with 'CS051'
    const attendeeRahul: Student = {
      id: 'student-1',
      event_id: 'evt-100',
      usn: transformed[0].usn,
      name: transformed[0].name,
      department: transformed[0].department,
      qr_code: 'adm_sec_123',
      barcode: transformed[0].barcode, // 'CS051'
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const scannerMatch = matchAttendeeWithIdentifier(attendeeRahul, 'usn', 'CS051', false, config);
    expect(scannerMatch).toBe(true);

    const otherMatch = matchAttendeeWithIdentifier(attendeeRahul, 'usn', 'CS052', false, config);
    expect(otherMatch).toBe(false);
  });

  it('Section 21 Acceptance Test: Front + 3 produces duplicate barcodes and is rejected', () => {
    const uploadedData = [
      { usn: '1BH24CS051', name: 'Rahul' },
      { usn: '1BH24CS052', name: 'Arun' },
      { usn: '1BH24CS053', name: 'Kiran' }
    ];

    const config: BarcodeConfig = {
      enabled: true,
      identifier_field: 'usn',
      extraction_mode: 'custom',
      extraction_position: 'front',
      character_count: 3
    };

    const transformed = uploadedData.map((row) => ({
      ...row,
      barcode: extractBarcodeIdentifier(row.usn, config)
    }));

    expect(transformed[0].barcode).toBe('1BH');
    expect(transformed[1].barcode).toBe('1BH');
    expect(transformed[2].barcode).toBe('1BH');

    // Calculate duplicate conflicts
    const countMap: Record<string, number> = {};
    for (const row of transformed) {
      countMap[row.barcode] = (countMap[row.barcode] || 0) + 1;
    }

    const duplicates = Object.entries(countMap).filter(([_, count]) => count > 1);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0][0]).toBe('1BH');
    expect(duplicates[0][1]).toBe(3);
  });
});
