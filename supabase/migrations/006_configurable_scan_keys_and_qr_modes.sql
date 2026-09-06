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
