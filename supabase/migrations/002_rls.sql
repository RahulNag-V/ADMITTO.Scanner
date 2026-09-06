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
