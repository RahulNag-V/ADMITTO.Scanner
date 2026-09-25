import { BarcodeConfig, BarcodeMatchingMode, EventItem, Student } from '../types';

export type BarcodeValidationResult =
  | {
      valid: true;
      extractedIdentifier: string;
      mode: BarcodeMatchingMode;
      identifierField: string;
      caseSensitive: boolean;
      originalBarcode: string;
    }
  | {
      valid: false;
      reason: 'EMPTY_BARCODE' | 'LENGTH_MISMATCH' | 'PREFIX_MISMATCH' | 'SUFFIX_MISMATCH' | 'EMPTY_IDENTIFIER';
      message: string;
      originalBarcode: string;
    };

/**
 * Resolves the active BarcodeConfig from an event, checking both top-level and scan_config,
 * or returning a sensible default.
 */
export function resolveBarcodeConfig(event?: EventItem | null): BarcodeConfig {
  if (event?.barcode_config) {
    return {
      mode: event.barcode_config.mode || 'full',
      value: event.barcode_config.value || '',
      identifier_field:
        event.barcode_config.identifier_field ||
        event.barcode_field ||
        event.primary_scan_field ||
        'usn',
      case_sensitive: Boolean(event.barcode_config.case_sensitive),
      min_length: event.barcode_config.min_length ?? null,
      max_length: event.barcode_config.max_length ?? null,
    };
  }

  if (event?.scan_config?.barcode_config) {
    const bc = event.scan_config.barcode_config;
    return {
      mode: bc.mode || 'full',
      value: bc.value || '',
      identifier_field:
        bc.identifier_field ||
        event.barcode_field ||
        event.primary_scan_field ||
        'usn',
      case_sensitive: Boolean(bc.case_sensitive),
      min_length: bc.min_length ?? null,
      max_length: bc.max_length ?? null,
    };
  }

  return {
    mode: 'full',
    value: '',
    identifier_field: event?.barcode_field || event?.primary_scan_field || 'usn',
    case_sensitive: false,
    min_length: null,
    max_length: null,
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
  caseSensitive: boolean = false
): boolean {
  if (!student || !identifierValue) return false;

  const normalize = (v: any) => {
    if (v === undefined || v === null) return '';
    const str = String(v).trim();
    return caseSensitive ? str : str.toUpperCase();
  };

  const target = normalize(identifierValue);
  if (!target) return false;

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

  return candidates.some((c) => c !== undefined && c !== null && normalize(c) === target);
}
