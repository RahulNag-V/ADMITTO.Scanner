import * as XLSX from 'xlsx';
import {
  isPrimaryKeyColumn,
  isBarcodeColumn,
  isQrCodeColumn,
  detectSchemaFromRows,
  ColumnConfig,
} from './attendeeSchema';

export interface UploadedFileValidation {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  extension: string;
  status: 'valid' | 'warning' | 'error';
  isValid: boolean;
  errors: string[];
  warnings: string[];
  headers: string[];
  rowCount: number;
  rows: Record<string, any>[];
  hasPrimaryKeyCandidate: boolean;
  primaryKeyCandidate?: string;
  hasBarcodeCandidate: boolean;
  barcodeCandidate?: string;
}

export interface MultiFileValidationSummary {
  files: UploadedFileValidation[];
  validCount: number;
  errorCount: number;
  totalRecords: number;
  unionHeaders: string[];
  detectedColumns: ColumnConfig[];
  combinedRows: Record<string, any>[];
  hasSchemaVariation: boolean;
  schemaVariationDetails: string[];
  duplicateIdWarnings: { id: string; count: number; files: string[] }[];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate and parse an individual spreadsheet file (CSV, XLSX, XLS)
 */
export async function validateSpreadsheetFile(file: File): Promise<UploadedFileValidation> {
  const fileName = file.name || 'unnamed_file';
  const lastDotIndex = fileName.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex).toLowerCase() : '';
  const formattedSize = formatFileSize(file.size || 0);

  const result: UploadedFileValidation = {
    id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    file,
    name: fileName,
    size: file.size || 0,
    formattedSize,
    extension: ext,
    status: 'valid',
    isValid: true,
    errors: [],
    warnings: [],
    headers: [],
    rowCount: 0,
    rows: [],
    hasPrimaryKeyCandidate: false,
    hasBarcodeCandidate: false,
  };

  // 1. Extension & Type Validation
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  if (!validExtensions.includes(ext)) {
    result.errors.push(`Unsupported file extension (${ext || 'none'}). Only .csv, .xlsx, and .xls files are supported.`);
    result.isValid = false;
    result.status = 'error';
    return result;
  }

  // 2. Empty File Check
  if (file.size === 0) {
    result.errors.push('File is completely empty (0 bytes).');
    result.isValid = false;
    result.status = 'error';
    return result;
  }

  // 3. Large File Warning
  if (file.size > 20 * 1024 * 1024) {
    result.warnings.push('File size is larger than 20MB. Parsing and token generation may take extra time.');
  }

  // 4. Read & Parse Spreadsheet
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.errors.push('The file does not contain any spreadsheet sheets.');
      result.isValid = false;
      result.status = 'error';
      return result;
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      result.errors.push('The primary sheet in this spreadsheet could not be opened.');
      result.isValid = false;
      result.status = 'error';
      return result;
    }

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawData || rawData.length <= 1) {
      result.errors.push('Spreadsheet has no attendee records (contains only a header or is blank).');
      result.isValid = false;
      result.status = 'error';
      return result;
    }

    // 5. Header Detection & Validation
    const rawHeaders: string[] = rawData[0]
      .map((h: any) => String(h || '').trim())
      .filter((h: string) => h.length > 0);

    if (rawHeaders.length === 0) {
      result.errors.push('Could not detect column headers in the first row.');
      result.isValid = false;
      result.status = 'error';
      return result;
    }

    // Filter out QR code columns from active headers
    const filteredHeaders = rawHeaders.filter((h) => !isQrCodeColumn(h));
    result.headers = filteredHeaders;

    // Check for Primary Key candidates
    const pkCol = filteredHeaders.find((h) => isPrimaryKeyColumn(h));
    if (pkCol) {
      result.hasPrimaryKeyCandidate = true;
      result.primaryKeyCandidate = pkCol;
    } else {
      result.warnings.push('No standard Primary Key column (Primary Key, USN, ID, Roll No) detected. You will need to select an identifier in Step 2.');
    }

    // Check for Barcode candidates
    const bcCol = filteredHeaders.find((h) => isBarcodeColumn(h));
    if (bcCol) {
      result.hasBarcodeCandidate = true;
      result.barcodeCandidate = bcCol;
    }

    // 6. Data Rows Validation
    const rows: Record<string, any>[] = [];
    for (let i = 1; i < rawData.length; i++) {
      const rowArr = rawData[i];
      if (!rowArr || rowArr.every((c: any) => String(c ?? '').trim() === '')) continue;
      const rowObj: Record<string, any> = {};
      for (let j = 0; j < rawHeaders.length; j++) {
        const headerName = rawHeaders[j];
        if (headerName) {
          rowObj[headerName] = rowArr[j] !== undefined && rowArr[j] !== null ? String(rowArr[j]).trim() : '';
        }
      }
      // Attach dataset metadata
      rowObj.dataset_name = fileName;
      rowObj._source_file = fileName;
      rows.push(rowObj);
    }

    if (rows.length === 0) {
      result.errors.push('Spreadsheet contains rows, but all of them are blank or empty.');
      result.isValid = false;
      result.status = 'error';
      return result;
    }

    result.rowCount = rows.length;
    result.rows = rows;

    if (result.warnings.length > 0) {
      result.status = 'warning';
    } else {
      result.status = 'valid';
    }
  } catch (err: any) {
    result.errors.push(`Spreadsheet parse error: ${err.message || 'Corrupted file content'}`);
    result.isValid = false;
    result.status = 'error';
  }

  return result;
}

/**
 * Combine multiple validated files, checking schema compatibility and duplicates
 */
export function combineValidatedFiles(files: UploadedFileValidation[]): MultiFileValidationSummary {
  const validFiles = files.filter((f) => f.isValid && f.rows.length > 0);
  const errorCount = files.filter((f) => !f.isValid).length;

  const combinedRows: Record<string, any>[] = [];
  const headerSet = new Set<string>();
  const schemaVariationDetails: string[] = [];

  // Union headers and concatenate rows
  validFiles.forEach((f) => {
    f.headers.forEach((h) => headerSet.add(h));
    combinedRows.push(...f.rows);
  });

  const unionHeaders = Array.from(headerSet);

  // Check schema variations
  let hasSchemaVariation = false;
  if (validFiles.length > 1) {
    const firstHeaders = new Set(validFiles[0].headers.map((h) => h.toLowerCase()));
    for (let i = 1; i < validFiles.length; i++) {
      const current = validFiles[i];
      const diff1 = current.headers.filter((h) => !firstHeaders.has(h.toLowerCase()));
      const currentHeadersSet = new Set(current.headers.map((h) => h.toLowerCase()));
      const diff2 = validFiles[0].headers.filter((h) => !currentHeadersSet.has(h.toLowerCase()));

      if (diff1.length > 0 || diff2.length > 0) {
        hasSchemaVariation = true;
        schemaVariationDetails.push(
          `"${current.name}" has ${diff1.length > 0 ? `additional columns (${diff1.join(', ')})` : ''}${
            diff1.length > 0 && diff2.length > 0 ? ' and ' : ''
          }${diff2.length > 0 ? `missing columns (${diff2.join(', ')})` : ''} compared to "${validFiles[0].name}". Missing values will default to empty.`
        );
      }
    }
  }

  // Detect Schema from all combined rows
  const detectedColumns = detectSchemaFromRows(unionHeaders, combinedRows);

  // Check duplicates across files if a primary key candidate is found
  const duplicateIdWarnings: { id: string; count: number; files: string[] }[] = [];
  const candidatePk = unionHeaders.find((h) => isPrimaryKeyColumn(h));

  if (candidatePk && validFiles.length > 1) {
    const idToFileMap = new Map<string, Set<string>>();
    combinedRows.forEach((r) => {
      const val = (r[candidatePk] || '').toString().trim().toUpperCase();
      if (val) {
        if (!idToFileMap.has(val)) idToFileMap.set(val, new Set());
        idToFileMap.get(val)!.add(r.dataset_name || r._source_file || 'Unknown');
      }
    });

    for (const [idVal, fileSet] of idToFileMap.entries()) {
      if (fileSet.size > 1) {
        duplicateIdWarnings.push({
          id: idVal,
          count: fileSet.size,
          files: Array.from(fileSet),
        });
      }
    }
  }

  return {
    files,
    validCount: validFiles.length,
    errorCount,
    totalRecords: combinedRows.length,
    unionHeaders,
    detectedColumns,
    combinedRows,
    hasSchemaVariation,
    schemaVariationDetails,
    duplicateIdWarnings,
  };
}
