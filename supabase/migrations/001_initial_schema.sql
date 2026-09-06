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
