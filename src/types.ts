export type UserRole = 'ADMIN' | 'SCANNER';

export type EventStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export type ScanType = 'QR' | 'BARCODE';

export type ScanResultType =
  | 'success'
  | 'duplicate'
  | 'invalid'
  | 'wrong_method'
  | 'wrong_event'
  | 'scanner_disabled';

export type ActivityType =
  | 'sheet_synced'
  | 'sheet_sync_failed'
  | 'list_imported'
  | 'import_validation_failed'
  | 'scanner_started'
  | 'scanner_went_offline'
  | 'scanner_returned_online'
  | 'checkin_success'
  | 'checkin_duplicate'
  | 'checkin_invalid'
  | 'checkin_reset'
  | 'checkins_cleared'
  | 'scanner_created'
  | 'scanner_toggled'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'scanner_referral_created'
  | 'scanner_access_requested'
  | 'scanner_access_approved'
  | 'scanner_access_rejected'
  | 'scanner_access_revoked';

export type ReferralCodeStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';

export interface ScannerReferralCode {
  id: string;
  event_id: string;
  code: string;
  created_by: string;
  status: ReferralCodeStatus;
  max_uses?: number;
  times_used?: number;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  event_title?: string;
  event_venue?: string;
}

export type ScannerAccessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED' | 'BLOCKED';

export interface ScannerAccessRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  event_id: string;
  referral_code_id?: string | null;
  referral_code?: string | null;
  scanner_id?: string | null;
  gate_name: string;
  status: ScannerAccessStatus;
  is_blocked?: boolean;
  requested_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  cooldown_remaining_seconds?: number;
  can_rerequest?: boolean;
  event?: EventItem;
  event_title?: string;
  event_venue?: string;
  admin_name?: string;
  admin_email?: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SCANNER';
  created_at: string;
  updated_at: string;
}

export type QrMode = 'SECURE_TOKEN' | 'FULL_DATA';

export interface EventScanConfig {
  primary_scan_field: string;
  secondary_scan_field?: string | null;
  qr_mode: QrMode;
  barcode_field: string;
  available_fields?: string[];
  is_uniqueness_verified?: boolean;
}

export interface UniquenessValidationResult {
  is_unique: boolean;
  total_records: number;
  unique_values_count: number;
  duplicate_values: { value: string; count: number }[];
  requires_secondary: boolean;
  message: string;
}

export type AttendeeType =
  | 'STUDENTS'
  | 'EMPLOYEES'
  | 'DELEGATES'
  | 'GUESTS'
  | 'PARTICIPANTS'
  | 'ATTENDEES'
  | 'CUSTOM';

export interface EventItem {
  id: string;
  admin_id: string;
  title: string;
  description?: string;
  venue: string;
  event_date: string;
  admin_name: string;
  admin_phone?: string;
  admin_email: string;
  banner_url?: string;
  status: EventStatus;
  attendee_type?: AttendeeType;
  attendee_label_singular?: string;
  attendee_label_plural?: string;
  primary_scan_field?: string;
  secondary_scan_field?: string | null;
  qr_mode?: QrMode;
  barcode_field?: string;
  scan_config?: EventScanConfig;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Student {
  id: string;
  event_id: string;
  sl_no?: number;
  usn: string;
  name: string;
  email?: string;
  phone_number?: string;
  year?: string;
  section?: string;
  branch?: string;
  qr_code: string;
  barcode: string;
  meta?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Computed / Joined fields
  is_checked_in?: boolean;
  checked_in?: boolean;
  checked_in_at?: string;
  scan_type?: ScanType;
}

export interface StudentImportRow {
  usn: string;
  name: string;
  email?: string;
  branch?: string;
  year?: string;
  section?: string;
  qr_code?: string;
  barcode?: string;
  phone_number?: string;
  meta?: Record<string, any>;
  raw?: Record<string, any>;
  is_valid?: boolean;
  errors?: string[];
  row_number?: number;
}

export interface ScannerAccount {
  id: string;
  event_id: string;
  email: string;
  password_hash?: string;
  access_code: string;
  name: string;
  role: 'SCANNER';
  is_active: boolean;
  expires_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  // Computed stats
  total_scans_count?: number;
  successful_scans_count?: number;
}

export interface CheckIn {
  id: string;
  event_id: string;
  student_id: string;
  scanner_id?: string | null;
  scan_type: ScanType;
  check_in_at: string;
  status: 'SUCCESS';
  source: 'online' | 'offline_sync';
  client_scan_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  student?: Student;
  scanner?: ScannerAccount;
}

export interface ScanAttempt {
  id: string;
  event_id: string;
  student_id?: string | null;
  scanned_value: string;
  scan_type: ScanType;
  result: ScanResultType;
  reason?: string;
  scanner_id?: string | null;
  timestamp: string;
  // Joined
  student?: Student;
  scanner?: ScannerAccount;
}

export interface ActivityLog {
  id: string;
  event_id: string;
  actor_id?: string | null;
  actor_name?: string;
  type: ActivityType;
  message: string;
  meta?: Record<string, any>;
  timestamp: string;
}

export interface EventStats {
  total_events: number;
  total_attendees: number;
  total_checked_in: number;
  total_remaining: number;
  checkin_percentage: number;
  active_scanners_count: number;
  total_scan_attempts: number;
  duplicates_blocked: number;
  invalid_attempts: number;
  qr_scans: number;
  barcode_scans: number;
  branch_breakdown: { branch: string; total: number; checked_in: number }[];
  year_breakdown: { year: string; total: number; checked_in: number }[];
}

export interface ScanValidationResult {
  success: boolean;
  status:
    | 'SUCCESS'
    | 'IDEMPOTENT_SUCCESS'
    | 'QUEUED_OFFLINE'
    | 'DUPLICATE_CHECKIN'
    | 'AMBIGUOUS_MATCH'
    | 'INVALID_TOKEN'
    | 'WRONG_EVENT'
    | 'SCANNER_DISABLED'
    | 'SCANNER_EXPIRED'
    | 'SCANNER_NOT_FOUND'
    | 'ERROR';
  message: string;
  student?: Student;
  check_in_id?: string;
  check_in_at?: string;
  requires_secondary?: boolean;
  secondary_field?: string | null;
  primary_value?: string;
}

export interface OfflineQueuedScan {
  client_scan_id: string;
  event_id: string;
  scanned_value: string;
  scan_type: ScanType;
  scanner_id?: string;
  timestamp: string;
  retry_count: number;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    event_id?: string; // If scanner
    event_title?: string;
  };
  token: string;
}

export interface ImportPreviewRow {
  row_number: number;
  sl_no?: number;
  usn: string;
  name: string;
  email?: string;
  phone_number?: string;
  year?: string;
  section?: string;
  branch?: string;
  qr_code?: string;
  barcode?: string;
  is_valid: boolean;
  errors: string[];
  is_duplicate_in_file?: boolean;
  is_duplicate_in_db?: boolean;
}

export interface ImportSummary {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  imported_rows: number;
  errors: string[];
}
