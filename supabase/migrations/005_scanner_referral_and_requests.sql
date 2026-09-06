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
