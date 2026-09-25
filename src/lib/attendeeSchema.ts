import { ColumnConfig, ColumnType, Student } from '../types';

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'col_name', name: 'Name', type: 'text', required: true },
  { id: 'col_email', name: 'Email', type: 'email', required: false },
  { id: 'col_age', name: 'Age', type: 'number', required: false },
  { id: 'col_dept', name: 'Department', type: 'text', required: false },
];

/**
 * Infer the best column type based on column name and non-empty sample data values
 */
export function inferColumnType(columnName: string, sampleValues: any[] = []): ColumnType {
  const normName = columnName.toLowerCase().trim();

  // Name based heuristics
  if (normName.includes('email') || normName.includes('mail')) {
    return 'email';
  }
  if (normName.includes('date') || normName.includes('dob') || normName.includes('birth')) {
    return 'date';
  }
  if (
    normName === 'age' ||
    normName.endsWith(' age') ||
    normName.includes('amount') ||
    normName.includes('qty') ||
    normName.includes('quantity') ||
    normName.includes('score') ||
    normName.includes('mark') ||
    normName.includes('price')
  ) {
    return 'number';
  }

  // Value based heuristics
  const nonEmpties = sampleValues
    .map((v) => (v !== undefined && v !== null ? String(v).trim() : ''))
    .filter((v) => v.length > 0);

  if (nonEmpties.length > 0) {
    // Check if all are emails
    const allEmails = nonEmpties.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    if (allEmails) return 'email';

    // Check if all are numbers
    const allNumbers = nonEmpties.every((v) => !isNaN(Number(v)) && !isNaN(parseFloat(v)));
    if (allNumbers) return 'number';

    // Check if dates (ISO format or common date formats)
    const allDates = nonEmpties.every((v) => {
      if (v.length < 8) return false;
      const parsed = Date.parse(v);
      return !isNaN(parsed) && (v.includes('-') || v.includes('/') || v.includes('.'));
    });
    if (allDates) return 'date';

    // Categorical dropdown check
    const uniqueValues = Array.from(new Set(nonEmpties));
    if (uniqueValues.length >= 2 && uniqueValues.length <= 6 && nonEmpties.length >= 4) {
      return 'dropdown';
    }
  }

  return 'text';
}

/**
 * Detect column schema definitions from spreadsheet headers and rows
 */
export function detectSchemaFromRows(
  rawHeadersOrRows: (string | Record<string, any>)[],
  maybeRows: Record<string, any>[] = []
): ColumnConfig[] {
  if (!rawHeadersOrRows || rawHeadersOrRows.length === 0) {
    return [];
  }

  let headers: string[] = [];
  let rows: Record<string, any>[] = maybeRows;

  // If first item is an object, treat input as array of rows
  if (typeof rawHeadersOrRows[0] === 'object' && rawHeadersOrRows[0] !== null) {
    rows = rawHeadersOrRows as Record<string, any>[];
    const headerSet = new Set<string>();
    rows.forEach((r) => {
      Object.keys(r).forEach((k) => {
        if (k && k.trim()) headerSet.add(k.trim());
      });
    });
    headers = Array.from(headerSet);
  } else {
    headers = (rawHeadersOrRows as string[]).map((h) => String(h || ''));
  }

  const seenNames = new Set<string>();
  const columns: ColumnConfig[] = [];

  headers.forEach((rawHeader, idx) => {
    let cleanName = (rawHeader || '').trim();
    if (!cleanName) {
      cleanName = `Column ${idx + 1}`;
    }

    // Ensure uniqueness if duplicate headers exist
    let uniqueName = cleanName;
    let duplicateCounter = 1;
    while (seenNames.has(uniqueName.toLowerCase())) {
      duplicateCounter++;
      uniqueName = `${cleanName} (${duplicateCounter})`;
    }
    seenNames.add(uniqueName.toLowerCase());

    // Gather sample values for this header
    const sampleValues: any[] = [];
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const val = rows[i]?.[rawHeader] ?? rows[i]?.[cleanName];
      if (val !== undefined && val !== null) {
        sampleValues.push(val);
      }
    }

    const type = inferColumnType(uniqueName, sampleValues);
    const options =
      type === 'dropdown'
        ? Array.from(new Set(sampleValues.map((v) => String(v).trim()).filter(Boolean)))
        : undefined;

    const lower = uniqueName.toLowerCase();
    const isRequired =
      lower.includes('name') ||
      lower.includes('usn') ||
      lower.includes('id') ||
      lower.includes('identifier') ||
      lower.includes('roll');

    columns.push({
      id: `col_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name: uniqueName,
      type,
      options,
      required: isRequired,
    });
  });

  return columns;
}

/**
 * Validate a record's values against the active column schema
 */
export function validateRecordAgainstSchema(
  values: Record<string, string>,
  columns: ColumnConfig[]
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const col of columns) {
    const rawVal = values[col.name];
    const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

    if (col.required && !val) {
      errors[col.name] = `${col.name} is required.`;
      continue;
    }

    if (val) {
      if (col.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          errors[col.name] = 'Please enter a valid email address.';
        }
      } else if (col.type === 'number') {
        if (isNaN(Number(val))) {
          errors[col.name] = 'Please enter a valid numeric value.';
        }
      } else if (col.type === 'date') {
        const parsed = Date.parse(val);
        if (isNaN(parsed)) {
          errors[col.name] = 'Please enter a valid date.';
        }
      } else if (col.type === 'dropdown' && col.options && col.options.length > 0) {
        // If options specified, ensure it is one of them or not empty
        if (!col.options.includes(val)) {
          errors[col.name] = `Please select an option from: ${col.options.join(', ')}`;
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Maps dynamic form input values to a Student entity payload,
 * preserving all exact columns in `meta`.
 */
export function mapFormToStudent(
  formValues: Record<string, string>,
  columns: ColumnConfig[],
  existingStudentsCount: number = 0,
  eventId: string = 'default_event'
): Partial<Student> {
  const getFieldVal = (candidates: string[]): string => {
    for (const c of candidates) {
      const match = columns.find((col) => col.name.toLowerCase() === c.toLowerCase());
      if (match && formValues[match.name] && formValues[match.name].trim()) {
        return formValues[match.name].trim();
      }
    }
    return '';
  };

  // Full meta dictionary containing every single column entered
  const meta: Record<string, any> = {};
  for (const col of columns) {
    const val = formValues[col.name];
    meta[col.name] = val !== undefined && val !== null ? String(val).trim() : '';
  }

  // Primary identifier (USN / ID)
  let usnVal = getFieldVal(['usn', 'id', 'identifier', 'roll no', 'roll number', 'student id', 'ticket', 'code', 'serial']);
  if (!usnVal) {
    // Generate clean, deterministic identifier if no ID column in schema
    const padded = String(existingStudentsCount + 1).padStart(4, '0');
    usnVal = `ADM-${padded}`;
  }

  // Name
  let nameVal = getFieldVal(['name', 'full name', 'student name', 'attendee name', 'attendee', 'student']);
  if (!nameVal) {
    // Check first column value or fallback
    const firstVal = columns[0] ? formValues[columns[0].name]?.trim() : '';
    nameVal = firstVal || `Attendee ${existingStudentsCount + 1}`;
  }

  // Email
  const emailVal = getFieldVal(['email', 'mail', 'email address']) ||
    (columns.find((c) => c.type === 'email') ? formValues[columns.find((c) => c.type === 'email')!.name]?.trim() : '');

  // Phone
  const phoneVal = getFieldVal(['phone', 'phone number', 'mobile', 'contact', 'cell']);

  // Department / Branch
  const branchVal = getFieldVal(['department', 'dept', 'branch', 'course', 'office', 'track']) || 'General';

  // Year / Batch
  const yearVal = getFieldVal(['year', 'batch', 'class', 'subgroup']) || 'General';

  // Section / Division
  const sectionVal = getFieldVal(['section', 'sec', 'division', 'div', 'seat']) || 'A';

  return {
    event_id: eventId,
    usn: usnVal.toUpperCase(),
    name: nameVal,
    email: emailVal || undefined,
    phone_number: phoneVal || undefined,
    branch: branchVal,
    year: yearVal,
    section: sectionVal,
    meta,
  };
}

/**
 * Format missing or present cell values safely
 */
export function formatCellValue(value: any): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const str = String(value).trim();
  return str.length > 0 ? str : '—';
}

/**
 * Local schema persistence helpers
 */
export function saveLocalSchema(eventId: string, columns: ColumnConfig[], datasetName?: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        `admitto_schema_${eventId}`,
        JSON.stringify({ columns, datasetName, updatedAt: new Date().toISOString() })
      );
    }
  } catch (e) {
    console.warn('Failed to save local schema:', e);
  }
}

export function loadLocalSchema(eventId: string): { columns: ColumnConfig[]; datasetName?: string } | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`admitto_schema_${eventId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Failed to load local schema:', e);
  }
  return null;
}
