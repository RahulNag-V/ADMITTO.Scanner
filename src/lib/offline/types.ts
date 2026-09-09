import { ScanType, Student, ScanValidationResult } from '../../types';

export interface CachedEvent {
  id: string;
  title: string;
  venue: string;
  event_date: string;
  primary_scan_field: string;
  secondary_scan_field?: string;
  qr_mode?: string;
  barcode_field?: string;
  downloaded_at: string;
  expires_at: string;
  version: string;
}

export interface CachedAttendee {
  id: string;
  event_id: string;
  usn: string;
  name: string;
  branch?: string;
  qr_code: string;
  barcode: string;
  primary_scan_value: string;
  secondary_scan_value?: string;
  is_checked_in: boolean;
  checked_in_at?: string;
}

export interface LocalCheckIn {
  client_scan_id: string;
  event_id: string;
  student_id: string;
  scanner_id: string;
  device_uuid: string;
  scanned_value: string;
  scan_type: ScanType;
  scanned_at: string;
  status: 'ACCEPTED' | 'DUPLICATE_CHECKIN';
}

export type SyncQueueStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export interface SyncQueueItem {
  client_scan_id: string;
  event_id: string;
  student_id?: string | null;
  scanner_id: string;
  device_uuid: string;
  scanned_value: string;
  scan_type: ScanType;
  status: SyncQueueStatus;
  created_at: string;
  last_attempt_at?: string | null;
  retry_count: number;
  error_code?: string;
  error_message?: string;
  server_result?: ScanValidationResult | null;
  synced_at?: string;
}

export interface SyncHistoryItem {
  id: string;
  client_scan_id: string;
  event_id: string;
  student_id?: string | null;
  student_name?: string;
  scanned_value: string;
  scan_type: ScanType;
  status: 'SYNCED' | 'CONFLICT' | 'FAILED';
  conflict_reason?: string;
  synced_at: string;
}

export interface TerminalMetadata {
  key: string;
  value: any;
  updated_at: string;
}

export interface OfflineBundleResponse {
  success: boolean;
  event: CachedEvent;
  attendees: CachedAttendee[];
  checked_in_student_ids: string[];
  version: string;
  downloaded_at: string;
  expires_at: string;
}

export interface BatchSyncItemPayload {
  client_scan_id: string;
  scanned_value: string;
  scan_type: ScanType;
  device_uuid?: string;
  created_at?: string;
}

export interface BatchSyncItemResult {
  client_scan_id: string;
  status: string;
  success: boolean;
  server_check_in_id?: string;
  conflict_reason?: string;
  student?: Student;
  message: string;
  check_in_at?: string;
}

export interface BatchSyncResponse {
  success: boolean;
  processed: number;
  results: BatchSyncItemResult[];
}
