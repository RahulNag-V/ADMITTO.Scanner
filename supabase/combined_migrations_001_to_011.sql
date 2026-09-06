-- ==========================================================
-- ADMITTO SUPABASE CONSOLIDATED MIGRATION SCRIPT (001 - 011)
-- Target Supabase Project: vifgaafjgzahqxuxtdar
-- Run this in Supabase Dashboard -> SQL Editor
-- ==========================================================


-- >>> START 001_initial_schema.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE POSTGRESQL SCHEMA
-- Migration: 001_initial_schema.sql
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Admins)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SCANNER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    venue TEXT NOT NULL DEFAULT 'Main Auditorium',
    event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_name TEXT NOT NULL,
    admin_phone TEXT DEFAULT '',
    admin_email TEXT NOT NULL,
    banner_url TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Students / Attendees Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sl_no INT,
    usn TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    year TEXT,
    section TEXT,
    branch TEXT,
    qr_code TEXT NOT NULL,
    barcode TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_usn UNIQUE (event_id, usn),
    CONSTRAINT unique_event_qr UNIQUE (event_id, qr_code),
    CONSTRAINT unique_event_barcode UNIQUE (event_id, barcode)
);

-- 4. Scanner Accounts Table
CREATE TABLE IF NOT EXISTS scanner_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    access_code TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SCANNER' CHECK (role = 'SCANNER'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_scanner_email UNIQUE (event_id, email),
    CONSTRAINT unique_event_scanner_code UNIQUE (event_id, access_code)
);

-- 5. Check-Ins Table (Atomic single check-in per student per event)
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    scanner_id UUID REFERENCES scanner_accounts(id) ON DELETE SET NULL,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('QR', 'BARCODE')),
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status = 'SUCCESS'),
    source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline_sync')),
    client_scan_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_student_checkin UNIQUE (event_id, student_id),
    CONSTRAINT unique_event_client_scan_id UNIQUE (event_id, client_scan_id)
);

-- 6. Scan Attempts Table (Audit for all scans: success, duplicate, invalid, wrong_event)
CREATE TABLE IF NOT EXISTS scan_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    scanned_value TEXT NOT NULL,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('QR', 'BARCODE')),
    result TEXT NOT NULL CHECK (result IN ('success', 'duplicate', 'invalid', 'wrong_method', 'wrong_event', 'scanner_disabled')),
    reason TEXT,
    scanner_id UUID REFERENCES scanner_accounts(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_name TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'sheet_synced',
        'sheet_sync_failed',
        'list_imported',
        'import_validation_failed',
        'scanner_started',
        'scanner_went_offline',
        'scanner_returned_online',
        'checkin_success',
        'checkin_duplicate',
        'checkin_invalid',
        'checkin_reset',
        'checkins_cleared',
        'scanner_created',
        'scanner_toggled',
        'event_created',
        'event_updated',
        'event_deleted'
    )),
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- <<< END 001_initial_schema.sql <<<


-- >>> START 002_rls.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 002_rls.sql
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
-- Admins can view and update their own profile
CREATE POLICY "Admins can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. Events Policies
-- Admin can only access their own events
CREATE POLICY "Admins can view own events"
    ON events FOR SELECT
    USING (auth.uid() = admin_id);

CREATE POLICY "Admins can insert own events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update own events"
    ON events FOR UPDATE
    USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete own events"
    ON events FOR DELETE
    USING (auth.uid() = admin_id);

-- 3. Students Policies
-- Admins can view and manage students of their own events
CREATE POLICY "Admins can view students of own events"
    ON students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = students.event_id
            AND events.admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert students into own events"
    ON students FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = students.event_id
            AND events.admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update students of own events"
    ON students FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = students.event_id
            AND events.admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete students of own events"
    ON students FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = students.event_id
            AND events.admin_id = auth.uid()
        )
    );

-- 4. Scanner Accounts Policies
-- Admins manage scanners of their events
CREATE POLICY "Admins can manage scanners of own events"
    ON scanner_accounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = scanner_accounts.event_id
            AND events.admin_id = auth.uid()
        )
    );

-- 5. Check-Ins Policies
CREATE POLICY "Admins can view check_ins of own events"
    ON check_ins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = check_ins.event_id
            AND events.admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete check_ins of own events"
    ON check_ins FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = check_ins.event_id
            AND events.admin_id = auth.uid()
        )
    );

-- 6. Scan Attempts Policies
CREATE POLICY "Admins can view scan_attempts of own events"
    ON scan_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = scan_attempts.event_id
            AND events.admin_id = auth.uid()
        )
    );

-- 7. Activity Logs Policies
CREATE POLICY "Admins can view activity_logs of own events"
    ON activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = activity_logs.event_id
            AND events.admin_id = auth.uid()
        )
    );

-- <<< END 002_rls.sql <<<


-- >>> START 003_indexes.sql >>>
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

-- <<< END 003_indexes.sql <<<


-- >>> START 004_functions.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE STORED FUNCTIONS & RPC
-- Migration: 004_functions.sql
-- ==========================================================

CREATE OR REPLACE FUNCTION process_check_in_atomic(
    p_event_id UUID,
    p_scanned_value TEXT,
    p_scan_type TEXT,
    p_scanner_id UUID DEFAULT NULL,
    p_client_scan_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'online'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scanner scanner_accounts%ROWTYPE;
    v_student students%ROWTYPE;
    v_existing_checkin check_ins%ROWTYPE;
    v_checkin_id UUID;
    v_response JSONB;
BEGIN
    -- 1. Validate Scanner if scanner_id provided
    IF p_scanner_id IS NOT NULL THEN
        SELECT * INTO v_scanner FROM scanner_accounts WHERE id = p_scanner_id;
        IF NOT FOUND THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, p_scanned_value, p_scan_type, 'scanner_disabled', 'Scanner account not found', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'SCANNER_NOT_FOUND', 'message', 'Scanner account not found.');
        END IF;

        IF v_scanner.event_id != p_event_id THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, p_scanned_value, p_scan_type, 'wrong_event', 'Scanner does not belong to this event', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'WRONG_EVENT', 'message', 'Scanner not authorized for this event.');
        END IF;

        IF NOT v_scanner.is_active THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, p_scanned_value, p_scan_type, 'scanner_disabled', 'Scanner account is disabled', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'SCANNER_DISABLED', 'message', 'Scanner account has been disabled by admin.');
        END IF;

        IF v_scanner.expires_at IS NOT NULL AND v_scanner.expires_at < NOW() THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, p_scanned_value, p_scan_type, 'scanner_disabled', 'Scanner access expired', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'SCANNER_EXPIRED', 'message', 'Scanner access code has expired.');
        END IF;
    END IF;

    -- 2. Check Idempotency via client_scan_id
    IF p_client_scan_id IS NOT NULL THEN
        SELECT * INTO v_existing_checkin FROM check_ins
        WHERE event_id = p_event_id AND client_scan_id = p_client_scan_id;
        IF FOUND THEN
            SELECT * INTO v_student FROM students WHERE id = v_existing_checkin.student_id;
            RETURN jsonb_build_object(
                'success', true,
                'status', 'IDEMPOTENT_SUCCESS',
                'message', 'Check-in was already recorded previously.',
                'student', row_to_json(v_student),
                'check_in_at', v_existing_checkin.check_in_at
            );
        END IF;
    END IF;

    -- 3. Match Attendee by QR or Barcode in this Event
    IF p_scan_type = 'QR' THEN
        SELECT * INTO v_student FROM students
        WHERE event_id = p_event_id AND (qr_code = p_scanned_value OR usn = p_scanned_value);
    ELSE
        SELECT * INTO v_student FROM students
        WHERE event_id = p_event_id AND (barcode = p_scanned_value OR usn = p_scanned_value);
    END IF;

    IF NOT FOUND THEN
        -- Check if student belongs to another event to give helpful diagnostics
        PERFORM 1 FROM students WHERE qr_code = p_scanned_value OR barcode = p_scanned_value;
        IF FOUND THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, p_scanned_value, p_scan_type, 'wrong_event', 'Token belongs to a different event', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'WRONG_EVENT', 'message', 'This token belongs to a different event.');
        ELSE
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, p_scanned_value, p_scan_type, 'invalid', 'Token not recognized in attendee list', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'INVALID_TOKEN', 'message', 'Invalid token. Attendee not found.');
        END IF;
    END IF;

    -- 4. Check if student already checked in (Duplicate check)
    SELECT * INTO v_existing_checkin FROM check_ins
    WHERE event_id = p_event_id AND student_id = v_student.id;
    IF FOUND THEN
        INSERT INTO scan_attempts(event_id, student_id, scanned_value, scan_type, result, reason, scanner_id)
        VALUES (p_event_id, v_student.id, p_scanned_value, p_scan_type, 'duplicate', 'Attendee already checked in earlier', p_scanner_id);

        INSERT INTO activity_logs(event_id, actor_id, actor_name, type, message, meta)
        VALUES (
            p_event_id,
            p_scanner_id,
            COALESCE(v_scanner.name, 'Admin'),
            'checkin_duplicate',
            'Duplicate check-in attempt for ' || v_student.name || ' (' || v_student.usn || ')',
            jsonb_build_object('student_id', v_student.id, 'usn', v_student.usn, 'initial_check_in', v_existing_checkin.check_in_at)
        );

        RETURN jsonb_build_object(
            'success', false,
            'status', 'DUPLICATE_CHECKIN',
            'message', 'ALREADY CHECKED IN at ' || to_char(v_existing_checkin.check_in_at, 'HH12:MI:SS AM'),
            'student', row_to_json(v_student),
            'check_in_at', v_existing_checkin.check_in_at
        );
    END IF;

    -- 5. Atomic Insert into check_ins
    BEGIN
        INSERT INTO check_ins (event_id, student_id, scanner_id, scan_type, check_in_at, status, source, client_scan_id)
        VALUES (p_event_id, v_student.id, p_scanner_id, p_scan_type, NOW(), 'SUCCESS', p_source, p_client_scan_id)
        RETURNING id INTO v_checkin_id;

        -- Record successful attempt
        INSERT INTO scan_attempts(event_id, student_id, scanned_value, scan_type, result, reason, scanner_id)
        VALUES (p_event_id, v_student.id, p_scanned_value, p_scan_type, 'success', 'Valid token verified', p_scanner_id);

        -- Record activity log
        INSERT INTO activity_logs(event_id, actor_id, actor_name, type, message, meta)
        VALUES (
            p_event_id,
            p_scanner_id,
            COALESCE(v_scanner.name, 'Admin'),
            'checkin_success',
            'Checked in: ' || v_student.name || ' (' || v_student.usn || ')',
            jsonb_build_object(
                'student_id', v_student.id,
                'usn', v_student.usn,
                'name', v_student.name,
                'branch', v_student.branch,
                'scan_type', p_scan_type,
                'source', p_source
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'status', 'SUCCESS',
            'message', 'CHECK-IN SUCCESSFUL',
            'student', row_to_json(v_student),
            'check_in_id', v_checkin_id,
            'check_in_at', NOW()
        );
    EXCEPTION WHEN unique_violation THEN
        -- Caught concurrent check-in race condition!
        RETURN jsonb_build_object(
            'success', false,
            'status', 'DUPLICATE_CHECKIN',
            'message', 'ALREADY CHECKED IN (Concurrent scan detected)',
            'student', row_to_json(v_student)
        );
    END;
END;
$$;

-- <<< END 004_functions.sql <<<


-- >>> START 005_scanner_referral_and_requests.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE MIGRATION: 005_scanner_referral_and_requests.sql
-- Admin-Approved Scanner Access via Referral Codes
-- ==========================================================

-- 1. Scanner Referral Codes Table
CREATE TABLE IF NOT EXISTS scanner_referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'EXPIRED')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_referral_code UNIQUE (event_id, code)
);

-- 2. Scanner Access Requests Table
CREATE TABLE IF NOT EXISTS scanner_access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    referral_code_id UUID REFERENCES scanner_referral_codes(id) ON DELETE SET NULL,
    scanner_id UUID REFERENCES scanner_accounts(id) ON DELETE SET NULL,
    gate_name TEXT DEFAULT 'Main Gate',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_event_request UNIQUE (user_id, event_id)
);

-- 3. Indexes for fast lookup & query performance
CREATE INDEX IF NOT EXISTS idx_referral_code_lookup ON scanner_referral_codes(code, status);
CREATE INDEX IF NOT EXISTS idx_referral_event_id ON scanner_referral_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_scanner_requests_user ON scanner_access_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scanner_requests_event ON scanner_access_requests(event_id, status);
CREATE INDEX IF NOT EXISTS idx_scanner_requests_status ON scanner_access_requests(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE scanner_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_access_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for scanner_referral_codes
CREATE POLICY "Admins can view referral codes of own events"
    ON scanner_referral_codes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = scanner_referral_codes.event_id
            AND events.admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage referral codes of own events"
    ON scanner_referral_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = scanner_referral_codes.event_id
            AND events.admin_id = auth.uid()
        )
    );

-- 6. RLS Policies for scanner_access_requests
CREATE POLICY "Admins can manage scanner requests of own events"
    ON scanner_access_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = scanner_access_requests.event_id
            AND events.admin_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own scanner requests"
    ON scanner_access_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scanner requests"
    ON scanner_access_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- <<< END 005_scanner_referral_and_requests.sql <<<


-- >>> START 006_configurable_scan_keys_and_qr_modes.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE POSTGRESQL SCHEMA
-- Migration: 006_configurable_scan_keys_and_qr_modes.sql
-- ==========================================================

-- 1. Extend events table with scanning and QR configuration
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS primary_scan_field TEXT NOT NULL DEFAULT 'usn',
ADD COLUMN IF NOT EXISTS secondary_scan_field TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS qr_mode TEXT NOT NULL DEFAULT 'SECURE_TOKEN' CHECK (qr_mode IN ('SECURE_TOKEN', 'FULL_DATA')),
ADD COLUMN IF NOT EXISTS barcode_field TEXT NOT NULL DEFAULT 'usn',
ADD COLUMN IF NOT EXISTS scan_config JSONB DEFAULT '{}'::jsonb;

-- 2. Extend students table with metadata JSONB for dynamic custom columns
ALTER TABLE students
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- 3. Update unique constraint on students to avoid blocking non-USN primary keys
-- Drop old constraint if present to allow flex keys
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_event_usn'
    ) THEN
        ALTER TABLE students DROP CONSTRAINT unique_event_usn;
    END IF;
END $$;

-- 4. Create or replace atomic check-in stored procedure supporting configurable keys & tokens
CREATE OR REPLACE FUNCTION process_check_in_atomic(
    p_event_id UUID,
    p_scanned_value TEXT,
    p_scan_type TEXT,
    p_scanner_id UUID DEFAULT NULL,
    p_client_scan_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'online',
    p_secondary_value TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scanner scanner_accounts%ROWTYPE;
    v_event events%ROWTYPE;
    v_student students%ROWTYPE;
    v_existing_checkin check_ins%ROWTYPE;
    v_checkin_id UUID;
    v_clean_val TEXT;
    v_sec_val TEXT;
    v_matched_count INT;
    v_qr_json JSONB;
    v_extracted_token TEXT;
BEGIN
    v_clean_val := trim(p_scanned_value);
    v_sec_val := trim(COALESCE(p_secondary_value, ''));

    -- 1. Fetch Event Configuration
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
    IF NOT FOUND OR v_event.status = 'DELETED' THEN
        RETURN jsonb_build_object('success', false, 'status', 'WRONG_EVENT', 'message', 'Event does not exist or has been deleted.');
    END IF;

    -- 2. Validate Scanner if scanner_id provided
    IF p_scanner_id IS NOT NULL THEN
        SELECT * INTO v_scanner FROM scanner_accounts WHERE id = p_scanner_id;
        IF NOT FOUND THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, v_clean_val, p_scan_type, 'scanner_disabled', 'Scanner account not found', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'SCANNER_NOT_FOUND', 'message', 'Scanner account not found.');
        END IF;

        IF v_scanner.event_id != p_event_id THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, v_clean_val, p_scan_type, 'wrong_event', 'Scanner does not belong to this event', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'WRONG_EVENT', 'message', 'Scanner not authorized for this event.');
        END IF;

        IF NOT v_scanner.is_active THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, v_clean_val, p_scan_type, 'scanner_disabled', 'Scanner account is disabled', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'SCANNER_DISABLED', 'message', 'Scanner account has been disabled by admin.');
        END IF;

        IF v_scanner.expires_at IS NOT NULL AND v_scanner.expires_at < NOW() THEN
            INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
            VALUES (p_event_id, v_clean_val, p_scan_type, 'scanner_disabled', 'Scanner access expired', p_scanner_id);
            RETURN jsonb_build_object('success', false, 'status', 'SCANNER_EXPIRED', 'message', 'Scanner access code has expired.');
        END IF;
    END IF;

    -- 3. Check Idempotency via client_scan_id
    IF p_client_scan_id IS NOT NULL THEN
        SELECT * INTO v_existing_checkin FROM check_ins
        WHERE event_id = p_event_id AND client_scan_id = p_client_scan_id;
        IF FOUND THEN
            SELECT * INTO v_student FROM students WHERE id = v_existing_checkin.student_id;
            RETURN jsonb_build_object(
                'success', true,
                'status', 'IDEMPOTENT_SUCCESS',
                'message', 'Check-in was already recorded previously.',
                'student', row_to_json(v_student),
                'check_in_at', v_existing_checkin.check_in_at
            );
        END IF;
    END IF;

    -- 4. Try parsing JSON QR token if scanned payload is JSON
    v_extracted_token := v_clean_val;
    IF v_clean_val LIKE '{%' AND v_clean_val LIKE '%}' THEN
        BEGIN
            v_qr_json := v_clean_val::jsonb;
            IF v_qr_json ? 'attendee_token' THEN
                v_extracted_token := v_qr_json->>'attendee_token';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_extracted_token := v_clean_val;
        END;
    END IF;

    -- 5. Match Attendee by QR token, Barcode, USN, or dynamic configured primary field
    -- First try direct QR or Barcode exact match
    SELECT * INTO v_student FROM students
    WHERE event_id = p_event_id 
      AND (
          qr_code = v_clean_val 
          OR qr_code = v_extracted_token 
          OR barcode = v_clean_val
      )
    LIMIT 1;

    -- If not matched by exact QR/Barcode, match by configured Primary Key (and Secondary if needed)
    IF NOT FOUND THEN
        IF v_event.primary_scan_field = 'usn' THEN
            SELECT COUNT(*) INTO v_matched_count FROM students WHERE event_id = p_event_id AND UPPER(usn) = UPPER(v_clean_val);
            IF v_matched_count = 1 THEN
                SELECT * INTO v_student FROM students WHERE event_id = p_event_id AND UPPER(usn) = UPPER(v_clean_val);
            ELSIF v_matched_count > 1 AND v_sec_val != '' THEN
                SELECT * INTO v_student FROM students 
                WHERE event_id = p_event_id 
                  AND UPPER(usn) = UPPER(v_clean_val)
                  AND (
                      (v_event.secondary_scan_field = 'email' AND UPPER(COALESCE(email, '')) = UPPER(v_sec_val))
                      OR (v_event.secondary_scan_field = 'phone_number' AND COALESCE(phone_number, '') = v_sec_val)
                      OR (v_event.secondary_scan_field = 'name' AND UPPER(name) = UPPER(v_sec_val))
                      OR (meta->>v_event.secondary_scan_field = v_sec_val)
                  )
                LIMIT 1;
            ELSIF v_matched_count > 1 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'AMBIGUOUS_MATCH',
                    'message', 'Multiple attendees found with this ' || v_event.primary_scan_field || '. Additional verification required.',
                    'requires_secondary', true,
                    'secondary_field', v_event.secondary_scan_field,
                    'primary_value', v_clean_val
                );
            END IF;
        ELSIF v_event.primary_scan_field = 'email' THEN
            SELECT COUNT(*) INTO v_matched_count FROM students WHERE event_id = p_event_id AND UPPER(COALESCE(email, '')) = UPPER(v_clean_val);
            IF v_matched_count = 1 THEN
                SELECT * INTO v_student FROM students WHERE event_id = p_event_id AND UPPER(COALESCE(email, '')) = UPPER(v_clean_val);
            ELSIF v_matched_count > 1 AND v_sec_val != '' THEN
                SELECT * INTO v_student FROM students 
                WHERE event_id = p_event_id 
                  AND UPPER(COALESCE(email, '')) = UPPER(v_clean_val)
                  AND (
                      (v_event.secondary_scan_field = 'usn' AND UPPER(usn) = UPPER(v_sec_val))
                      OR (v_event.secondary_scan_field = 'phone_number' AND COALESCE(phone_number, '') = v_sec_val)
                      OR (v_event.secondary_scan_field = 'name' AND UPPER(name) = UPPER(v_sec_val))
                      OR (meta->>v_event.secondary_scan_field = v_sec_val)
                  )
                LIMIT 1;
            ELSIF v_matched_count > 1 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'AMBIGUOUS_MATCH',
                    'message', 'Multiple attendees found with this ' || v_event.primary_scan_field || '. Additional verification required.',
                    'requires_secondary', true,
                    'secondary_field', v_event.secondary_scan_field,
                    'primary_value', v_clean_val
                );
            END IF;
        ELSIF v_event.primary_scan_field = 'name' THEN
            SELECT COUNT(*) INTO v_matched_count FROM students WHERE event_id = p_event_id AND UPPER(name) = UPPER(v_clean_val);
            IF v_matched_count = 1 THEN
                SELECT * INTO v_student FROM students WHERE event_id = p_event_id AND UPPER(name) = UPPER(v_clean_val);
            ELSIF v_matched_count > 1 AND v_sec_val != '' THEN
                SELECT * INTO v_student FROM students 
                WHERE event_id = p_event_id 
                  AND UPPER(name) = UPPER(v_clean_val)
                  AND (
                      (v_event.secondary_scan_field = 'email' AND UPPER(COALESCE(email, '')) = UPPER(v_sec_val))
                      OR (v_event.secondary_scan_field = 'usn' AND UPPER(usn) = UPPER(v_sec_val))
                      OR (v_event.secondary_scan_field = 'phone_number' AND COALESCE(phone_number, '') = v_sec_val)
                      OR (meta->>v_event.secondary_scan_field = v_sec_val)
                  )
                LIMIT 1;
            ELSIF v_matched_count > 1 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'AMBIGUOUS_MATCH',
                    'message', 'Multiple attendees found with name "' || v_clean_val || '". Additional verification required.',
                    'requires_secondary', true,
                    'secondary_field', v_event.secondary_scan_field,
                    'primary_value', v_clean_val
                );
            END IF;
        ELSE
            -- Custom field lookup from meta JSONB or standard columns
            SELECT COUNT(*) INTO v_matched_count FROM students 
            WHERE event_id = p_event_id 
              AND (
                  meta->>v_event.primary_scan_field = v_clean_val 
                  OR UPPER(COALESCE(meta->>v_event.primary_scan_field, '')) = UPPER(v_clean_val)
                  OR UPPER(usn) = UPPER(v_clean_val)
              );
            IF v_matched_count = 1 THEN
                SELECT * INTO v_student FROM students 
                WHERE event_id = p_event_id 
                  AND (
                      meta->>v_event.primary_scan_field = v_clean_val 
                      OR UPPER(COALESCE(meta->>v_event.primary_scan_field, '')) = UPPER(v_clean_val)
                      OR UPPER(usn) = UPPER(v_clean_val)
                  )
                LIMIT 1;
            ELSIF v_matched_count > 1 AND v_sec_val != '' THEN
                SELECT * INTO v_student FROM students 
                WHERE event_id = p_event_id 
                  AND (
                      meta->>v_event.primary_scan_field = v_clean_val 
                      OR UPPER(COALESCE(meta->>v_event.primary_scan_field, '')) = UPPER(v_clean_val)
                  )
                  AND (
                      (v_event.secondary_scan_field = 'email' AND UPPER(COALESCE(email, '')) = UPPER(v_sec_val))
                      OR (v_event.secondary_scan_field = 'usn' AND UPPER(usn) = UPPER(v_sec_val))
                      OR (v_event.secondary_scan_field = 'phone_number' AND COALESCE(phone_number, '') = v_sec_val)
                      OR (meta->>v_event.secondary_scan_field = v_sec_val)
                  )
                LIMIT 1;
            ELSIF v_matched_count > 1 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'AMBIGUOUS_MATCH',
                    'message', 'Multiple attendees found with ' || v_event.primary_scan_field || ' "' || v_clean_val || '". Additional verification required.',
                    'requires_secondary', true,
                    'secondary_field', v_event.secondary_scan_field,
                    'primary_value', v_clean_val
                );
            END IF;
        END IF;
    END IF;

    -- If still not found
    IF v_student.id IS NULL THEN
        INSERT INTO scan_attempts(event_id, scanned_value, scan_type, result, reason, scanner_id)
        VALUES (p_event_id, v_clean_val, p_scan_type, 'invalid', 'Token/Identifier not recognized in attendee list', p_scanner_id);
        RETURN jsonb_build_object('success', false, 'status', 'INVALID_TOKEN', 'message', 'Invalid token or identifier. Attendee not found.');
    END IF;

    -- 6. Duplicate check
    SELECT * INTO v_existing_checkin FROM check_ins
    WHERE event_id = p_event_id AND student_id = v_student.id;
    IF FOUND THEN
        INSERT INTO scan_attempts(event_id, student_id, scanned_value, scan_type, result, reason, scanner_id)
        VALUES (p_event_id, v_student.id, v_clean_val, p_scan_type, 'duplicate', 'Attendee already checked in earlier', p_scanner_id);

        INSERT INTO activity_logs(event_id, actor_id, actor_name, type, message, meta)
        VALUES (
            p_event_id,
            p_scanner_id,
            COALESCE(v_scanner.name, 'Admin'),
            'checkin_duplicate',
            'Duplicate check-in attempt for ' || v_student.name || ' (' || v_student.usn || ')',
            jsonb_build_object('student_id', v_student.id, 'usn', v_student.usn, 'initial_check_in', v_existing_checkin.check_in_at)
        );

        RETURN jsonb_build_object(
            'success', false,
            'status', 'DUPLICATE_CHECKIN',
            'message', 'ALREADY CHECKED IN at ' || to_char(v_existing_checkin.check_in_at, 'HH12:MI:SS AM'),
            'student', row_to_json(v_student),
            'check_in_at', v_existing_checkin.check_in_at
        );
    END IF;

    -- 7. Atomic Insert into check_ins
    BEGIN
        INSERT INTO check_ins (event_id, student_id, scanner_id, scan_type, check_in_at, status, source, client_scan_id)
        VALUES (
            p_event_id,
            v_student.id,
            p_scanner_id,
            p_scan_type,
            NOW(),
            'SUCCESS',
            p_source,
            p_client_scan_id
        )
        RETURNING id INTO v_checkin_id;
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_existing_checkin FROM check_ins
        WHERE event_id = p_event_id AND student_id = v_student.id;

        RETURN jsonb_build_object(
            'success', false,
            'status', 'DUPLICATE_CHECKIN',
            'message', 'ALREADY CHECKED IN (concurrent scan detected)',
            'student', row_to_json(v_student),
            'check_in_at', v_existing_checkin.check_in_at
        );
    END;

    -- 8. Record Successful Scan Attempt & Activity Log
    INSERT INTO scan_attempts(event_id, student_id, scanned_value, scan_type, result, reason, scanner_id)
    VALUES (p_event_id, v_student.id, v_clean_val, p_scan_type, 'success', 'Verified successfully', p_scanner_id);

    INSERT INTO activity_logs(event_id, actor_id, actor_name, type, message, meta)
    VALUES (
        p_event_id,
        p_scanner_id,
        COALESCE(v_scanner.name, 'Admin'),
        'checkin_success',
        'Verified check-in for ' || v_student.name || ' (' || v_student.usn || ') via ' || p_scan_type,
        jsonb_build_object('student_id', v_student.id, 'checkin_id', v_checkin_id)
    );

    -- 9. Return Verified Response
    RETURN jsonb_build_object(
        'success', true,
        'status', 'SUCCESS',
        'message', 'VERIFIED — Access Granted',
        'student', row_to_json(v_student),
        'check_in_id', v_checkin_id,
        'check_in_at', NOW()
    );
END;
$$;

-- <<< END 006_configurable_scan_keys_and_qr_modes.sql <<<


-- >>> START 007_supabase_auth_integration.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE MIGRATION: 007_supabase_auth_integration.sql
-- Links Supabase Auth (auth.users) to the ADMITTO profiles table
-- so that signing up through Supabase Auth automatically creates
-- an ADMITTO profile with role = 'ADMIN'.
-- ==========================================================

-- 1. Add auth_id column to profiles to link Supabase Auth users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 2. Add password_hash column for backward compat (may already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Index for fast lookup by auth_id
CREATE INDEX IF NOT EXISTS profiles_auth_id_idx ON profiles(auth_id);

-- 4. Auto-create profile when a new Supabase Auth user is created
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'ADMIN'
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_id = EXCLUDED.auth_id
    WHERE profiles.auth_id IS NULL;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- 5. Basic RLS policies (enable RLS if not already done)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_id);

-- Allow service role to do everything (server-side operations)
DROP POLICY IF EXISTS "profiles_service_role_all" ON profiles;
CREATE POLICY "profiles_service_role_all"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own profile
DROP POLICY IF EXISTS "profiles_authenticated_select" ON profiles;
CREATE POLICY "profiles_authenticated_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

-- 6. Update existing profiles to use their email for lookup
-- (Admins who registered via the old system won't have auth_id until they sign up via Supabase Auth)
-- This is intentional — old accounts will get linked on first Supabase Auth signup.

-- <<< END 007_supabase_auth_integration.sql <<<


-- >>> START 008_audit_integrity_and_security_hardening.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE POSTGRESQL SCHEMA
-- Migration: 008_audit_integrity_and_security_hardening.sql
-- ==========================================================

-- 1. Enforce Immutability on activity_logs
-- Drop any potential DELETE policy on activity_logs to ensure audit logs can never be deleted
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activity_logs' AND policyname = 'Admins can delete activity_logs of own events'
    ) THEN
        DROP POLICY "Admins can delete activity_logs of own events" ON activity_logs;
    END IF;
END $$;

-- Explicitly revoke DELETE privileges on activity_logs from public, anon, and authenticated roles
REVOKE DELETE ON TABLE activity_logs FROM PUBLIC, anon, authenticated;

-- 2. Scanner Referral Codes Redemption Limit & Tracking
ALTER TABLE scanner_referral_codes
ADD COLUMN IF NOT EXISTS max_uses INT NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS times_used INT NOT NULL DEFAULT 0;

-- 3. Attendant Metadata (meta JSONB) Size Limit Constraint
-- Restrict meta payload size to a maximum of 32 Kilobytes (32768 bytes) to prevent database denial-of-service / bloat
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_student_meta_size'
    ) THEN
        ALTER TABLE students
        ADD CONSTRAINT check_student_meta_size 
        CHECK (octet_length(meta::text) <= 32768);
    END IF;
END $$;

-- 4. Architectural Note on SECURITY DEFINER:
-- The function process_check_in_atomic(...) executes with SECURITY DEFINER privileges.
-- Rationale:
-- Gate volunteers (role 'SCANNER') and external laser check-in sessions do not have direct
-- permission to update the attendees registry or delete logs. Executing with SECURITY DEFINER
-- allows the database engine to safely and atomically insert records into check_ins,
-- scan_attempts, and activity_logs under strict function-defined constraints without granting
-- broad table-level write permissions to the caller's database role.

-- <<< END 008_audit_integrity_and_security_hardening.sql <<<


-- >>> START 009_referral_code_and_limits.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE POSTGRESQL SCHEMA
-- Migration: 009_referral_code_and_limits.sql
-- ==========================================================

-- 1. Ensure max_uses and times_used exist on scanner_referral_codes
ALTER TABLE scanner_referral_codes
ADD COLUMN IF NOT EXISTS max_uses INT NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS times_used INT NOT NULL DEFAULT 0;

-- 2. Ensure referral_code exists on scanner_access_requests
ALTER TABLE scanner_access_requests
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- <<< END 009_referral_code_and_limits.sql <<<


-- >>> START 010_attendee_type_and_terminology.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE POSTGRESQL SCHEMA
-- Migration: 010_attendee_type_and_terminology.sql
-- ==========================================================

-- 1. Extend events table with attendee terminology & audience type
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS attendee_type TEXT NOT NULL DEFAULT 'STUDENTS',
ADD COLUMN IF NOT EXISTS attendee_label_singular TEXT NOT NULL DEFAULT 'Student',
ADD COLUMN IF NOT EXISTS attendee_label_plural TEXT NOT NULL DEFAULT 'Students';

-- 2. Add comment for documentation
COMMENT ON COLUMN events.attendee_type IS 'Audience preset: STUDENTS, EMPLOYEES, DELEGATES, GUESTS, PARTICIPANTS, ATTENDEES, or CUSTOM';
COMMENT ON COLUMN events.attendee_label_singular IS 'Singular noun for attendees in this event (e.g. Student, Employee, Guest, Delegate)';
COMMENT ON COLUMN events.attendee_label_plural IS 'Plural noun for attendees in this event (e.g. Students, Employees, Guests, Delegates)';

-- <<< END 010_attendee_type_and_terminology.sql <<<


-- >>> START 011_scanner_access_re_request_and_blocking.sql >>>
-- ==========================================================
-- ADMITTO SUPABASE POSTGRESQL SCHEMA
-- Migration: 011_scanner_access_re_request_and_blocking.sql
-- Scanner Access Re-Request History, Partial Unique Active Index,
-- and Admin Blocking/Unblocking
-- ==========================================================

-- 1. Drop the legacy rigid unique constraint that prevented request history
ALTER TABLE scanner_access_requests
DROP CONSTRAINT IF EXISTS unique_user_event_request;

-- 2. Add is_blocked column to track admin blocking
ALTER TABLE scanner_access_requests
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Update status check constraint to include BLOCKED
ALTER TABLE scanner_access_requests
DROP CONSTRAINT IF EXISTS scanner_access_requests_status_check;

ALTER TABLE scanner_access_requests
ADD CONSTRAINT scanner_access_requests_status_check
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED', 'BLOCKED'));

-- 4. Create partial unique index: AT MOST ONE active (PENDING or APPROVED) request per user/event
-- Historical records (REJECTED, REVOKED, EXPIRED, BLOCKED) are preserved for full audit trail
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_user_event_request
ON scanner_access_requests (user_id, event_id)
WHERE status IN ('PENDING', 'APPROVED');

-- 5. Create index for fast retrieval of latest request attempt per user/event
CREATE INDEX IF NOT EXISTS idx_scanner_requests_history
ON scanner_access_requests (user_id, event_id, requested_at DESC);

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- <<< END 011_scanner_access_re_request_and_blocking.sql <<<

