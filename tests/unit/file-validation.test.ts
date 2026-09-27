import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  validateSpreadsheetFile,
  combineValidatedFiles,
  formatFileSize,
  UploadedFileValidation,
} from '../../src/lib/fileValidation';

function createMockFile(content: string | Uint8Array, fileName: string, type = 'text/csv'): File {
  const blob = new Blob([content], { type });
  return new File([blob], fileName, { type });
}

function createMockWorkbookFile(sheetData: any[][], fileName: string): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([buffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('Multi-File Spreadsheet Validation Engine', () => {
  describe('1. File Size Formatter', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes below 1KB', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });

  describe('2. Single File Validation (validateSpreadsheetFile)', () => {
    it('rejects unsupported extensions', async () => {
      const file = createMockFile('hello world', 'test.pdf', 'application/pdf');
      const result = await validateSpreadsheetFile(file);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported file extension');
    });

    it('rejects empty (0-byte) files', async () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' });
      const result = await validateSpreadsheetFile(file);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors).toContain('File is completely empty (0 bytes).');
    });

    it('validates a valid CSV file with USN and Barcode', async () => {
      const csvData = [
        ['USN', 'Full Name', 'Department', 'Barcode', 'QR Code'],
        ['1MS21CS001', 'Alice Johnson', 'CSE', 'BAR-1001', 'QR-001'],
        ['1MS21CS002', 'Bob Smith', 'ECE', 'BAR-1002', 'QR-002'],
      ];
      const file = createMockWorkbookFile(csvData, 'batch_a.xlsx');
      const result = await validateSpreadsheetFile(file);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('valid');
      expect(result.rowCount).toBe(2);
      expect(result.hasPrimaryKeyCandidate).toBe(true);
      expect(result.primaryKeyCandidate).toBe('USN');
      expect(result.hasBarcodeCandidate).toBe(true);
      expect(result.barcodeCandidate).toBe('Barcode');
      // Should filter out QR Code from headers
      expect(result.headers).toEqual(['USN', 'Full Name', 'Department', 'Barcode']);
      // Each row should be stamped with dataset_name and _source_file
      expect(result.rows[0].dataset_name).toBe('batch_a.xlsx');
      expect(result.rows[0]._source_file).toBe('batch_a.xlsx');
      expect(result.rows[0].USN).toBe('1MS21CS001');
    });

    it('warns when no standard primary key candidate exists', async () => {
      const data = [
        ['First Name', 'Hobby', 'City'],
        ['Alice', 'Reading', 'Bangalore'],
        ['Bob', 'Chess', 'Mysore'],
      ];
      const file = createMockWorkbookFile(data, 'hobby_club.xlsx');
      const result = await validateSpreadsheetFile(file);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('warning');
      expect(result.hasPrimaryKeyCandidate).toBe(false);
      expect(result.warnings.some((w) => w.includes('Primary Key column'))).toBe(true);
    });

    it('rejects spreadsheet with only headers and no data rows', async () => {
      const data = [['USN', 'Name', 'Email']];
      const file = createMockWorkbookFile(data, 'only_headers.xlsx');
      const result = await validateSpreadsheetFile(file);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.includes('no attendee records'))).toBe(true);
    });
  });

  describe('3. Multi-File Aggregation & Cross-Validation (combineValidatedFiles)', () => {
    it('aggregates multiple valid files and unions their headers', () => {
      const file1: UploadedFileValidation = {
        id: 'f1',
        file: new File([], 'file1.csv'),
        name: 'file1.csv',
        size: 1000,
        formattedSize: '1.0 KB',
        extension: '.csv',
        status: 'valid',
        isValid: true,
        errors: [],
        warnings: [],
        headers: ['USN', 'Name', 'Department'],
        rowCount: 2,
        rows: [
          { USN: '101', Name: 'Alice', Department: 'CSE', dataset_name: 'file1.csv' },
          { USN: '102', Name: 'Bob', Department: 'ECE', dataset_name: 'file1.csv' },
        ],
        hasPrimaryKeyCandidate: true,
        primaryKeyCandidate: 'USN',
        hasBarcodeCandidate: false,
      };

      const file2: UploadedFileValidation = {
        id: 'f2',
        file: new File([], 'file2.csv'),
        name: 'file2.csv',
        size: 1000,
        formattedSize: '1.0 KB',
        extension: '.csv',
        status: 'valid',
        isValid: true,
        errors: [],
        warnings: [],
        headers: ['USN', 'Name', 'Semester'],
        rowCount: 2,
        rows: [
          { USN: '201', Name: 'Charlie', Semester: '6', dataset_name: 'file2.csv' },
          { USN: '202', Name: 'Dave', Semester: '4', dataset_name: 'file2.csv' },
        ],
        hasPrimaryKeyCandidate: true,
        primaryKeyCandidate: 'USN',
        hasBarcodeCandidate: false,
      };

      const summary = combineValidatedFiles([file1, file2]);
      expect(summary.validCount).toBe(2);
      expect(summary.totalRecords).toBe(4);
      expect(summary.unionHeaders).toContain('USN');
      expect(summary.unionHeaders).toContain('Name');
      expect(summary.unionHeaders).toContain('Department');
      expect(summary.unionHeaders).toContain('Semester');
      expect(summary.hasSchemaVariation).toBe(true);
      expect(summary.schemaVariationDetails.length).toBeGreaterThan(0);
      expect(summary.duplicateIdWarnings.length).toBe(0);
    });

    it('flags cross-file duplicate primary keys', () => {
      const file1: UploadedFileValidation = {
        id: 'f1',
        file: new File([], 'batch_1.xlsx'),
        name: 'batch_1.xlsx',
        size: 1000,
        formattedSize: '1.0 KB',
        extension: '.xlsx',
        status: 'valid',
        isValid: true,
        errors: [],
        warnings: [],
        headers: ['USN', 'Name'],
        rowCount: 1,
        rows: [{ USN: '1MS21CS001', Name: 'Alice', dataset_name: 'batch_1.xlsx' }],
        hasPrimaryKeyCandidate: true,
        primaryKeyCandidate: 'USN',
        hasBarcodeCandidate: false,
      };

      const file2: UploadedFileValidation = {
        id: 'f2',
        file: new File([], 'batch_2.xlsx'),
        name: 'batch_2.xlsx',
        size: 1000,
        formattedSize: '1.0 KB',
        extension: '.xlsx',
        status: 'valid',
        isValid: true,
        errors: [],
        warnings: [],
        headers: ['USN', 'Name'],
        rowCount: 1,
        rows: [{ USN: '1MS21CS001', Name: 'Alice Duplicate', dataset_name: 'batch_2.xlsx' }],
        hasPrimaryKeyCandidate: true,
        primaryKeyCandidate: 'USN',
        hasBarcodeCandidate: false,
      };

      const summary = combineValidatedFiles([file1, file2]);
      expect(summary.duplicateIdWarnings.length).toBe(1);
      expect(summary.duplicateIdWarnings[0].id).toBe('1MS21CS001');
      expect(summary.duplicateIdWarnings[0].files).toEqual(['batch_1.xlsx', 'batch_2.xlsx']);
    });
  });
});
