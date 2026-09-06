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
