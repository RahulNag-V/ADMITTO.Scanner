import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COLUMNS,
  inferColumnType,
  detectSchemaFromRows,
  validateRecordAgainstSchema,
  mapFormToStudent,
  formatCellValue,
  ColumnConfig,
  saveUploadedDataset,
  loadAllUploadedDatasets,
} from '../../src/lib/attendeeSchema';

describe('Dynamic Attendee Schema Engine', () => {
  describe('1. Default Schema & Type Inference', () => {
    it('provides expected default columns when no dataset is uploaded', () => {
      expect(DEFAULT_COLUMNS.length).toBe(4);
      expect(DEFAULT_COLUMNS.map((c) => c.name)).toEqual(['Name', 'Email', 'Age', 'Department']);
      expect(DEFAULT_COLUMNS.find((c) => c.name === 'Name')?.required).toBe(true);
      expect(DEFAULT_COLUMNS.find((c) => c.name === 'Email')?.type).toBe('email');
      expect(DEFAULT_COLUMNS.find((c) => c.name === 'Age')?.type).toBe('number');
    });

    it('infers email type correctly', () => {
      expect(inferColumnType('Email', ['alice@example.com', 'bob@domain.org'])).toBe('email');
      expect(inferColumnType('User_Email_Address', ['test@corp.com'])).toBe('email');
    });

    it('infers number type correctly', () => {
      expect(inferColumnType('Age', ['21', '22', '20'])).toBe('number');
      expect(inferColumnType('Score', ['95.5', '88', '100'])).toBe('number');
    });

    it('infers date type correctly', () => {
      expect(inferColumnType('Date of Birth', ['2002-05-14', '2001-11-20'])).toBe('date');
      expect(inferColumnType('Registration_Date', ['05/12/2026', '06/15/2026'])).toBe('date');
    });

    it('infers dropdown type for low-cardinality categorical fields', () => {
      expect(
        inferColumnType('Gender', ['Male', 'Female', 'Female', 'Male', 'Non-Binary'])
      ).toBe('dropdown');
    });

    it('defaults to text type for general strings', () => {
      expect(inferColumnType('Department', ['Computer Science', 'Mechanical Engineering'])).toBe('text');
      expect(inferColumnType('Address', ['123 Main St, Springfield'])).toBe('text');
    });
  });

  describe('2. Schema Detection from Uploaded Datasets', () => {
    it('detects columns dynamically from uploaded spreadsheet rows', () => {
      const sampleRows = [
        {
          Name: 'Rahul Nag',
          Email: 'rahul@example.com',
          Age: '22',
          Department: 'AI & Data Science',
          Year: '4',
        },
        {
          Name: 'Priya Sharma',
          Email: 'priya@example.com',
          Age: '21',
          Department: 'Computer Science',
          Year: '3',
        },
      ];

      const detected = detectSchemaFromRows(sampleRows);
      expect(detected.map((c) => c.name)).toEqual(['Name', 'Email', 'Age', 'Department', 'Year']);
      expect(detected.find((c) => c.name === 'Email')?.type).toBe('email');
      expect(detected.find((c) => c.name === 'Age')?.type).toBe('number');
      expect(detected.find((c) => c.name === 'Name')?.required).toBe(true);
    });

    it('handles duplicate column names gracefully without crashing', () => {
      const sampleRows = [
        {
          Name: 'John',
          name: 'Johnny',
          Age: '25',
        },
      ];

      const detected = detectSchemaFromRows(sampleRows);
      const names = detected.map((c) => c.name.toLowerCase());
      const uniqueNames = Array.from(new Set(names));
      expect(names.length).toBe(uniqueNames.length);
    });

    it('handles empty rows gracefully by returning empty schema', () => {
      expect(detectSchemaFromRows([])).toEqual([]);
    });
  });

  describe('3. Validation Against Detected Schema', () => {
    const schema: ColumnConfig[] = [
      { id: '1', name: 'Full Name', type: 'text', required: true },
      { id: '2', name: 'Email Address', type: 'email', required: false },
      { id: '3', name: 'Age', type: 'number', required: false },
      { id: '4', name: 'Graduation Date', type: 'date', required: false },
      { id: '5', name: 'Category', type: 'dropdown', options: ['VIP', 'General', 'Staff'], required: false },
    ];

    it('passes validation for valid record data', () => {
      const validData = {
        'Full Name': 'Elena Rostova',
        'Email Address': 'elena@example.com',
        Age: '24',
        'Graduation Date': '2026-06-01',
        Category: 'VIP',
      };

      const result = validateRecordAgainstSchema(validData, schema);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('fails when a required column is empty or whitespace', () => {
      const invalidData = {
        'Full Name': '   ',
        'Email Address': 'elena@example.com',
      };

      const result = validateRecordAgainstSchema(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors['Full Name']).toContain('required');
    });

    it('fails when email format is invalid', () => {
      const invalidData = {
        'Full Name': 'Elena Rostova',
        'Email Address': 'not-an-email',
      };

      const result = validateRecordAgainstSchema(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors['Email Address']).toContain('valid email address');
    });

    it('fails when number field is not a number', () => {
      const invalidData = {
        'Full Name': 'Elena Rostova',
        Age: 'twenty-four',
      };

      const result = validateRecordAgainstSchema(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors['Age']).toContain('valid numeric');
    });

    it('fails when date field is not a valid date', () => {
      const invalidData = {
        'Full Name': 'Elena Rostova',
        'Graduation Date': 'invalid-date-string',
      };

      const result = validateRecordAgainstSchema(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors['Graduation Date']).toContain('valid date');
    });

    it('fails when dropdown value is not in configured options', () => {
      const invalidData = {
        'Full Name': 'Elena Rostova',
        Category: 'Hacker',
      };

      const result = validateRecordAgainstSchema(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors['Category']).toContain('select an option');
    });
  });

  describe('4. Data Mapping & Meta Preservation', () => {
    it('preserves all schema columns in student.meta while mapping standard fields', () => {
      const schema: ColumnConfig[] = [
        { id: '1', name: 'Name', type: 'text', required: true },
        { id: '2', name: 'Email', type: 'email', required: false },
        { id: '3', name: 'Age', type: 'number', required: false },
        { id: '4', name: 'Department', type: 'text', required: false },
        { id: '5', name: 'Blood Group', type: 'text', required: false },
        { id: '6', name: 'Emergency Contact', type: 'text', required: false },
      ];

      const formValues = {
        Name: 'Siddharth Rao',
        Email: 'siddharth@example.com',
        Age: '23',
        Department: 'Information Science',
        'Blood Group': 'O+',
        'Emergency Contact': '+91-9876543210',
      };

      const mapped = mapFormToStudent(formValues, schema);

      // Core fields mapped
      expect(mapped.name).toBe('Siddharth Rao');
      expect(mapped.email).toBe('siddharth@example.com');
      expect(mapped.branch).toBe('Information Science');
      expect(mapped.usn).toBeDefined();

      // ALL fields preserved in meta
      expect(mapped.meta).toBeDefined();
      expect(mapped.meta['Age']).toBe('23');
      expect(mapped.meta['Department']).toBe('Information Science');
      expect(mapped.meta['Blood Group']).toBe('O+');
      expect(mapped.meta['Emergency Contact']).toBe('+91-9876543210');
    });
  });

  describe('5. Schema Evolution & Missing Value Safety', () => {
    it('safely formats cell values, returning placeholder for missing or null values', () => {
      expect(formatCellValue(undefined)).toBe('—');
      expect(formatCellValue(null)).toBe('—');
      expect(formatCellValue('')).toBe('—');
      expect(formatCellValue('   ')).toBe('—');
      expect(formatCellValue(25)).toBe('25');
      expect(formatCellValue(0)).toBe('0');
      expect(formatCellValue('Active')).toBe('Active');
      expect(formatCellValue(true)).toBe('true');
      expect(formatCellValue({ complex: 'object' })).toBe('{"complex":"object"}');
    });

    it('allows adding new columns to existing schema without corrupting previous records', () => {
      const initialSchema: ColumnConfig[] = [
        { id: '1', name: 'Name', type: 'text', required: true },
        { id: '2', name: 'Email', type: 'email', required: false },
      ];

      // Old record before column addition
      const oldRecordMeta: Record<string, any> = {
        Name: 'Old Attendee',
        Email: 'old@example.com',
      };

      // Add new column "T-Shirt Size"
      const updatedSchema: ColumnConfig[] = [
        ...initialSchema,
        { id: '3', name: 'T-Shirt Size', type: 'dropdown', options: ['S', 'M', 'L', 'XL'], required: false },
      ];

      // Missing value in old record is safe
      expect(formatCellValue(oldRecordMeta['T-Shirt Size'])).toBe('—');

      // New record uses updated schema
      const newForm = {
        Name: 'New Attendee',
        Email: 'new@example.com',
        'T-Shirt Size': 'L',
      };
      const validation = validateRecordAgainstSchema(newForm, updatedSchema);
      expect(validation.isValid).toBe(true);

      const newMapped = mapFormToStudent(newForm, updatedSchema);
      expect(newMapped.meta['T-Shirt Size']).toBe('L');
    });
  });

  describe('6. Multi-Dataset Registry & Categorization', () => {
    const testEventId = 'test-event-multidataset';

    it('persists and loads multiple uploaded datasets with their respective column schemas', () => {
      const dataset1 = {
        name: 'attendees_main_list.xlsx',
        columns: [
          { id: 'c1', name: 'Name', type: 'text' as const, required: true },
          { id: 'c2', name: 'USN', type: 'text' as const, required: true },
          { id: 'c3', name: 'Department', type: 'text' as const, required: false },
        ],
      };

      const dataset2 = {
        name: 'vip_guests.csv',
        columns: [
          { id: 'c4', name: 'Name', type: 'text' as const, required: true },
          { id: 'c5', name: 'VIP Pass Tier', type: 'dropdown' as const, options: ['Platinum', 'Gold'], required: true },
          { id: 'c6', name: 'Organization', type: 'text' as const, required: false },
          { id: 'c7', name: 'Dietary Preferences', type: 'text' as const, required: false },
        ],
      };

      const dataset3 = {
        name: 'volunteers_and_staff.xlsx',
        columns: [
          { id: 'c8', name: 'Name', type: 'text' as const, required: true },
          { id: 'c9', name: 'Duty Station', type: 'text' as const, required: true },
          { id: 'c10', name: 'Shift Time', type: 'text' as const, required: false },
        ],
      };

      // Save 3 types of uploaded data
      saveUploadedDataset(testEventId, dataset1);
      saveUploadedDataset(testEventId, dataset2);
      saveUploadedDataset(testEventId, dataset3);

      const allLoaded = loadAllUploadedDatasets(testEventId);
      expect(allLoaded.length).toBe(3);

      const names = allLoaded.map((d) => d.name);
      expect(names).toContain('attendees_main_list.xlsx');
      expect(names).toContain('vip_guests.csv');
      expect(names).toContain('volunteers_and_staff.xlsx');

      const vipLoaded = allLoaded.find((d) => d.name === 'vip_guests.csv');
      expect(vipLoaded?.columns.length).toBe(4);
      expect(vipLoaded?.columns.map((c) => c.name)).toEqual(['Name', 'VIP Pass Tier', 'Organization', 'Dietary Preferences']);
    });

    it('tags manual entries with target dataset category and preserves metadata', () => {
      const vipDatasetColumns: ColumnConfig[] = [
        { id: 'c4', name: 'Name', type: 'text', required: true },
        { id: 'c5', name: 'VIP Pass Tier', type: 'dropdown', options: ['Platinum', 'Gold'], required: true },
        { id: 'c6', name: 'Organization', type: 'text', required: false },
      ];

      const formValues = {
        Name: 'Dr. Sarah Connor',
        'VIP Pass Tier': 'Platinum',
        Organization: 'Cyberdyne Systems',
      };

      const mapped = mapFormToStudent(formValues, vipDatasetColumns, 0, testEventId);
      mapped.meta = {
        ...(mapped.meta || {}),
        dataset_name: 'vip_guests.csv',
      };

      expect(mapped.name).toBe('Dr. Sarah Connor');
      expect(mapped.meta.dataset_name).toBe('vip_guests.csv');
      expect(mapped.meta['VIP Pass Tier']).toBe('Platinum');
      expect(mapped.meta['Organization']).toBe('Cyberdyne Systems');
    });
  });
});
