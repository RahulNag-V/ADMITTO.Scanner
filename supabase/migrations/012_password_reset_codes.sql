-- ==========================================================
-- ADMITTO SUPABASE PASSWORD RESET CODES TABLE
-- Migration: 012_password_reset_codes.sql
-- ==========================================================

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for rapid lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id ON password_reset_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);

-- Row Level Security
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Security Invariant: The frontend (anon and standard authenticated users) must NEVER directly
-- query, insert, or modify password reset codes. All operations are executed server-side via service_role.
