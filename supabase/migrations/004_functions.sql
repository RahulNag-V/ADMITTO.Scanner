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
