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
