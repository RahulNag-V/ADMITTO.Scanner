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
