import { BarcodeConfig, BarcodeMatchingMode, EventItem, Student } from '../types';

export type BarcodeValidationResult =
  | {
      valid: true;
      extractedIdentifier: string;
      mode: BarcodeMatchingMode;
      identifierField: string;
      caseSensitive: boolean;
      originalBarcode: string;
      message?: string;
      reason?: string;
    }
  | {
      valid: false;
      reason: 'EMPTY_BARCODE' | 'LENGTH_MISMATCH' | 'PREFIX_MISMATCH' | 'SUFFIX_MISMATCH' | 'EMPTY_IDENTIFIER';
      message: string;
      originalBarcode: string;
      extractedIdentifier?: string;
    };

export interface AttendeeBarcodeExtractionResult {
  valid: boolean;
  barcode: string;
  error?: string;
  originalId: string;
}

/**
 * Extracts a barcode identifier from a raw attendee ID according to extraction rules.
 * Supports:
 * - full_id mode: returns rawId as-is
 * - custom mode: extracts N characters from front or end (returns '' if str.length < character_count)
 * - optional fixed_prefix and fixed_suffix
 */
export function extractBarcodeIdentifier(
  rawId: any,
  config?: {
    extraction_mode?: 'custom' | 'full_id' | 'full';
    extraction_position?: 'front' | 'end';
    character_count?: number;
    full_id?: boolean;
    fixed_prefix?: string | null;
    fixed_suffix?: string | null;
  } | null
): string {
  if (rawId === null || rawId === undefined) return '';
  const str = String(rawId).trim();
  if (!str) return '';

  if (!config) return str;

  const isFull = config.extraction_mode === 'full_id' || config.extraction_mode === 'full' || Boolean(config.full_id);
  let result = str;

  if (!isFull) {
    const pos = config.extraction_position || 'front';
    const count = typeof config.character_count === 'number' && config.character_count > 0 ? config.character_count : 5;

    // Do NOT silently truncate when source value is shorter than requested character count
    if (str.length < count) {
      return '';
    }

    if (pos === 'front') {
      result = str.slice(0, count);
    } else {
      result = str.slice(-count);
    }
  }

  if (config.fixed_prefix) {
    result = `${config.fixed_prefix}${result}`;
  }
  if (config.fixed_suffix) {
    result = `${result}${config.fixed_suffix}`;
  }

  return result;
}

/**
 * Validates extraction for a single attendee record, returning explicit error reason
 * if empty or if length is insufficient.
 */
export function validateAttendeeBarcodeExtraction(
  rawId: any,
  config?: {
    extraction_mode?: 'custom' | 'full_id' | 'full';
    extraction_position?: 'front' | 'end';
    character_count?: number;
    full_id?: boolean;
    fixed_prefix?: string | null;
    fixed_suffix?: string | null;
  } | null
): AttendeeBarcodeExtractionResult {
  if (rawId === null || rawId === undefined || String(rawId).trim() === '') {
    return {
      valid: false,
      barcode: '',
      error: 'Barcode cannot be generated because the selected ID is empty.',
      originalId: '',
    };
  }

  const str = String(rawId).trim();
  const isFull = config?.extraction_mode === 'full_id' || config?.extraction_mode === 'full' || Boolean(config?.full_id);

  if (!isFull && config) {
    const count = typeof config.character_count === 'number' && config.character_count > 0 ? config.character_count : 5;
    if (count < 3) {
      return {
        valid: false,
        barcode: '',
        error: 'Minimum barcode length is 3 characters.',
        originalId: str,
      };
    }
    if (str.length < count) {
      return {
        valid: false,
        barcode: '',
        error: `ID contains only ${str.length} characters (requires ${count}).`,
        originalId: str,
      };
    }
  }

  const barcode = extractBarcodeIdentifier(str, config);
  return {
    valid: Boolean(barcode),
    barcode,
    error: barcode ? undefined : 'Failed to generate barcode identifier.',
    originalId: str,
  };
}

/**
 * Resolves the active BarcodeConfig from an event, checking both top-level and scan_config,
 * or returning a sensible default.
 */
export function resolveBarcodeConfig(event?: EventItem | null): BarcodeConfig {
  const bc = event?.barcode_config || event?.scan_config?.barcode_config;
  if (bc) {
    return {
      mode: bc.mode || (bc.extraction_mode === 'custom' ? (bc.extraction_position === 'end' ? 'suffix' : 'prefix') : 'full'),
      value: bc.value || (bc.fixed_prefix || bc.fixed_suffix || ''),
      identifier_field:
        bc.identifier_field ||
        event?.barcode_field ||
        event?.primary_scan_field ||
        'usn',
      case_sensitive: Boolean(bc.case_sensitive),
      min_length: bc.min_length ?? null,
      max_length: bc.max_length ?? null,
      enabled: bc.enabled ?? true,
      extraction_mode: bc.extraction_mode || (bc.full_id ? 'full_id' : undefined),
      extraction_position: bc.extraction_position,
      character_count: bc.character_count,
      full_id: bc.full_id,
      fixed_prefix: bc.fixed_prefix ?? null,
      fixed_suffix: bc.fixed_suffix ?? null,
    };
  }

  return {
    mode: 'full',
    value: '',
    identifier_field: event?.barcode_field || event?.primary_scan_field || 'usn',
    case_sensitive: false,
    min_length: null,
    max_length: null,
    extraction_mode: 'full_id',
    full_id: true,
  };
}

/**
 * Validates a raw barcode string against the event's BarcodeConfig.
 * Extracts the unique attendee identifier if prefix/suffix matches.
 */
export function validateBarcodePattern(
  rawBarcode: string,
  config?: BarcodeConfig | null
): BarcodeValidationResult {
  const barcode = (rawBarcode || '').trim();

  if (!barcode) {
    return {
      valid: false,
      reason: 'EMPTY_BARCODE',
      message: 'Barcode cannot be empty.',
      originalBarcode: rawBarcode || '',
    };
  }

  const activeConfig: BarcodeConfig = config || {
    mode: 'full',
    value: '',
    identifier_field: 'usn',
    case_sensitive: false,
    min_length: null,
    max_length: null,
  };

  const { mode = 'full', value = '', identifier_field = 'usn', case_sensitive = false, min_length, max_length } = activeConfig;
  const configVal = (value || '').trim();
  const caseSensitive = Boolean(case_sensitive);

  // Optional Length Validation
  if (min_length !== null && min_length !== undefined && min_length > 0) {
    if (barcode.length < min_length) {
      return {
        valid: false,
        reason: 'LENGTH_MISMATCH',
        message: 'This barcode does not belong to this event.',
        originalBarcode: barcode,
      };
    }
  }

  if (max_length !== null && max_length !== undefined && max_length > 0) {
    if (barcode.length > max_length) {
      return {
        valid: false,
        reason: 'LENGTH_MISMATCH',
        message: 'This barcode does not belong to this event.',
        originalBarcode: barcode,
      };
    }
  }

  const barcodeToCompare = caseSensitive ? barcode : barcode.toUpperCase();
  const patternToCompare = caseSensitive ? configVal : configVal.toUpperCase();

  if (mode === 'prefix') {
    if (configVal) {
      if (!barcodeToCompare.startsWith(patternToCompare)) {
        return {
          valid: false,
          reason: 'PREFIX_MISMATCH',
          message: 'This barcode does not belong to this event.',
          originalBarcode: barcode,
        };
      }
      const extractedIdentifier = barcode.slice(configVal.length).trim();
      if (!extractedIdentifier) {
        return {
          valid: false,
          reason: 'EMPTY_IDENTIFIER',
          message: 'Barcode recognized, but no registered attendee was found.',
          originalBarcode: barcode,
        };
      }
      return {
        valid: true,
        extractedIdentifier,
        mode: 'prefix',
        identifierField: identifier_field,
        caseSensitive,
        originalBarcode: barcode,
      };
    }
    return {
      valid: true,
      extractedIdentifier: barcode,
      mode: 'prefix',
      identifierField: identifier_field,
      caseSensitive,
      originalBarcode: barcode,
    };
  }

  if (mode === 'suffix') {
    if (configVal) {
      if (!barcodeToCompare.endsWith(patternToCompare)) {
        return {
          valid: false,
          reason: 'SUFFIX_MISMATCH',
          message: 'This barcode does not belong to this event.',
          originalBarcode: barcode,
        };
      }
      const extractedIdentifier = barcode.slice(0, barcode.length - configVal.length).trim();
      if (!extractedIdentifier) {
        return {
          valid: false,
          reason: 'EMPTY_IDENTIFIER',
          message: 'Barcode recognized, but no registered attendee was found.',
          originalBarcode: barcode,
        };
      }
      return {
        valid: true,
        extractedIdentifier,
        mode: 'suffix',
        identifierField: identifier_field,
        caseSensitive,
        originalBarcode: barcode,
      };
    }
    return {
      valid: true,
      extractedIdentifier: barcode,
      mode: 'suffix',
      identifierField: identifier_field,
      caseSensitive,
      originalBarcode: barcode,
    };
  }

  // Full Barcode Mode: require exact match
  return {
    valid: true,
    extractedIdentifier: barcode,
    mode: 'full',
    identifierField: identifier_field || 'barcode',
    caseSensitive,
    originalBarcode: barcode,
  };
}

/**
 * Checks whether an attendee matches the extracted identifier value
 * based on the configured identifier_field and case sensitivity.
 */
export function matchAttendeeWithIdentifier(
  student: Student,
  identifierField: string,
  identifierValue: string,
  caseSensitive: boolean = false,
  barcodeConfig?: BarcodeConfig | null
): boolean {
  if (!student || !identifierValue) return false;

  const normalize = (v: any) => {
    if (v === undefined || v === null) return '';
    const str = String(v).trim();
    return caseSensitive ? str : str.toUpperCase();
  };

  const target = normalize(identifierValue);
  if (!target) return false;

  // Direct check against student.barcode
  if (student.barcode && normalize(student.barcode) === target) {
    return true;
  }

  // Gather candidate field values from student model
  const fieldKey = identifierField.trim();
  const candidates: any[] = [
    (student as any)[fieldKey],
    student.meta?.[fieldKey],
  ];

  const fieldKeyLower = fieldKey.toLowerCase().replace(/[\s_-]+/g, '');

  if (fieldKeyLower === 'usn' || fieldKeyLower === 'rollnumber' || fieldKeyLower === 'rollno') {
    candidates.push(student.usn, student.meta?.usn, student.meta?.roll_number, student.meta?.['Roll Number'], student.meta?.rollNo);
  } else if (fieldKeyLower === 'email') {
    candidates.push(student.email, student.meta?.email);
  } else if (fieldKeyLower === 'barcode') {
    candidates.push(student.barcode, student.meta?.barcode);
  } else if (fieldKeyLower === 'employeeid' || fieldKeyLower === 'empid') {
    candidates.push(student.meta?.employee_id, student.meta?.emp_id, student.meta?.['Employee ID']);
  } else if (fieldKeyLower === 'registrationid' || fieldKeyLower === 'regid') {
    candidates.push(student.meta?.registration_id, student.meta?.reg_id, student.meta?.['Registration ID']);
  }

  // Also in full mode or exact fallback, compare against student.barcode directly
  if (fieldKeyLower === 'barcode' || fieldKey === 'barcode') {
    candidates.push(student.barcode);
  }

  // 1. Direct match
  if (candidates.some((c) => c !== undefined && c !== null && normalize(c) === target)) {
    return true;
  }

  // 2. Extracted match if custom extraction config is present
  if (barcodeConfig && barcodeConfig.extraction_mode === 'custom') {
    return candidates.some((c) => {
      if (c === undefined || c === null) return false;
      const extracted = extractBarcodeIdentifier(String(c), barcodeConfig);
      return normalize(extracted) === target;
    });
  }

  return false;
}
