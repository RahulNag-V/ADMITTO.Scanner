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
