import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Dataset 1: Unique Employee ID (Primary Key = Employee_ID)
const dataset1 = [
  ['Employee_ID', 'Full_Name', 'Work_Email', 'Department', 'Role'],
  ['EMP-101', 'Aarav Sharma', 'aarav@techsprint.io', 'Core Platform', 'Senior Architect'],
  ['EMP-102', 'Neha Patel', 'neha@techsprint.io', 'AI Research', 'Lead Scientist'],
  ['EMP-103', 'Vikram Rao', 'vikram@techsprint.io', 'Cloud Infrastructure', 'DevOps Specialist'],
  ['EMP-104', 'Ananya Iyer', 'ananya@techsprint.io', 'Product Experience', 'UI Designer'],
];

// Dataset 2: Duplicate Names requiring Secondary Key (Name + Email)
const dataset2 = [
  ['Full_Name', 'Work_Email', 'Badge_Number', 'Department'],
  ['Alex Vance', 'alex.vance@blackmesa.org', 'BM-001', 'Anomalous Materials'],
  ['Alex Vance', 'alex.vance@resistance.org', 'RES-099', 'Resistance Outpost'],
  ['Gordon Freeman', 'gordon@blackmesa.org', 'BM-002', 'Theoretical Physics'],
  ['Sarah Connor', 'sarah@skynet.org', 'SKY-001', 'Cybernetics'],
];

const wb1 = XLSX.utils.book_new();
const ws1 = XLSX.utils.aoa_to_sheet(dataset1);
XLSX.utils.book_append_sheet(wb1, ws1, 'Employees');
XLSX.writeFile(wb1, 'test_dataset_unique.xlsx');

const wb2 = XLSX.utils.book_new();
const ws2 = XLSX.utils.aoa_to_sheet(dataset2);
XLSX.utils.book_append_sheet(wb2, ws2, 'Attendees');
XLSX.writeFile(wb2, 'test_dataset_duplicates.xlsx');

console.log('Created test_dataset_unique.xlsx and test_dataset_duplicates.xlsx');
