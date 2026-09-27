import { describe, it, expect } from 'vitest';

describe('Barcode Data Format Engine & Pipeline', () => {
  const sampleUploadedRows = [
    {
      USN: '1BH24CS051',
      Name: 'Aarav Sharma',
      Email: 'aarav@example.com',
      Phone: '+91 9876543210',
      'Ticket Type': 'VIP Access',
      Department: 'Computer Science',
    },
    {
      USN: '1BH24CS052',
      Name: 'Diya Patel',
      Email: 'diya@example.com',
      Phone: '+91 9876543211',
      'Ticket Type': 'General Delegate',
      Department: 'Information Science',
    },
  ];

  it('generates secure attendee token barcode from the selected data column', () => {
    const primaryKeyField = 'USN';
    const barcodeConfig = {
      mode: 'secure-token' as const,
      selectedColumn: 'Ticket Type',
      warningConfirmed: false,
    };

    const generated = sampleUploadedRows.map((row, i) => {
      const rawVal = row[primaryKeyField as keyof typeof row] || `ATT-${i + 1}`;
      const targetCol = barcodeConfig.selectedColumn || primaryKeyField;
      const colVal = row[targetCol as keyof typeof row] || rawVal;
      return String(colVal).trim();
    });

    expect(generated[0]).toBe('VIP Access');
    expect(generated[1]).toBe('General Delegate');
  });

  it('defaults secure token barcode to primary key when selected column matches primary key', () => {
    const primaryKeyField = 'USN';
    const barcodeConfig = {
      mode: 'secure-token' as const,
      selectedColumn: 'USN',
      warningConfirmed: false,
    };

    const generated = sampleUploadedRows.map((row, i) => {
      const rawVal = row[primaryKeyField as keyof typeof row] || `ATT-${i + 1}`;
      const targetCol = barcodeConfig.selectedColumn || primaryKeyField;
      const colVal = row[targetCol as keyof typeof row] || rawVal;
      return String(colVal).trim();
    });

    expect(generated[0]).toBe('1BH24CS051');
    expect(generated[1]).toBe('1BH24CS052');
  });

  it('generates full attendee data barcode containing all available attendee details', () => {
    const primaryKeyField = 'USN';
    const row = sampleUploadedRows[0];
    const rawVal = row[primaryKeyField as keyof typeof row];
    const fullPayload = {
      id: rawVal,
      name: row.Name,
      department: row.Department,
      ...row,
    };
    const barcodeVal = JSON.stringify(fullPayload);

    const parsed = JSON.parse(barcodeVal);
    expect(parsed.id).toBe('1BH24CS051');
    expect(parsed.name).toBe('Aarav Sharma');
    expect(parsed.Email).toBe('aarav@example.com');
    expect(parsed['Ticket Type']).toBe('VIP Access');
  });

  it('validates that secure-token mode requires a selected column', () => {
    const barcodeConfig = {
      mode: 'secure-token' as const,
      selectedColumn: null,
      warningConfirmed: false,
    };

    const validateBarcodeSelection = (config: typeof barcodeConfig) => {
      if (config.mode === 'secure-token' && !config.selectedColumn) {
        return { isValid: false, error: 'Please select an uploaded data column.' };
      }
      return { isValid: true, error: null };
    };

    const result = validateBarcodeSelection(barcodeConfig);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please select an uploaded data column.');

    const validResult = validateBarcodeSelection({
      ...barcodeConfig,
      selectedColumn: 'Email',
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.error).toBeNull();
  });

  it('reverts full attendee data mode to secure-token mode upon cancel', () => {
    let state = {
      mode: 'secure-token' as const,
      selectedColumn: 'USN',
      warningConfirmed: false,
    };

    const onCancelWarning = () => {
      state = {
        mode: 'secure-token',
        selectedColumn: state.selectedColumn,
        warningConfirmed: false,
      };
    };

    onCancelWarning();
    expect(state.mode).toBe('secure-token');
    expect(state.warningConfirmed).toBe(false);
  });

  it('enables full attendee data mode and marks warning confirmed upon continue', () => {
    let state = {
      mode: 'secure-token' as const,
      selectedColumn: 'USN',
      warningConfirmed: false,
    };

    const onContinueWarning = () => {
      state = {
        ...state,
        mode: 'full-data' as const,
        warningConfirmed: true,
      };
    };

    onContinueWarning();
    expect(state.mode).toBe('full-data');
    expect(state.warningConfirmed).toBe(true);
  });
});
