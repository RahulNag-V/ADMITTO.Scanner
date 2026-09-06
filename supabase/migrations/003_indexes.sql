-- ==========================================================
-- ADMITTO SUPABASE INDEXES
-- Migration: 003_indexes.sql
-- ==========================================================

-- Index events by admin_id and status
CREATE INDEX IF NOT EXISTS idx_events_admin_status ON events(admin_id, status);

-- Indexes for lightning-fast attendee token lookups
CREATE INDEX IF NOT EXISTS idx_students_event_qr ON students(event_id, qr_code);
CREATE INDEX IF NOT EXISTS idx_students_event_barcode ON students(event_id, barcode);
CREATE INDEX IF NOT EXISTS idx_students_event_usn ON students(event_id, usn);
CREATE INDEX IF NOT EXISTS idx_students_event_id ON students(event_id);

-- Scanner indexes
CREATE INDEX IF NOT EXISTS idx_scanners_event_code ON scanner_accounts(event_id, access_code);
CREATE INDEX IF NOT EXISTS idx_scanners_event_email ON scanner_accounts(event_id, email);

-- Check-ins indexes for quick status & duplicate verification
CREATE INDEX IF NOT EXISTS idx_checkins_event_student ON check_ins(event_id, student_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_client_scan ON check_ins(event_id, client_scan_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_time ON check_ins(event_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_scanner ON check_ins(scanner_id);

-- Scan attempts & Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_scan_attempts_event_time ON scan_attempts(event_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_time ON activity_logs(event_id, timestamp DESC);
