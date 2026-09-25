-- Migration 013: Configurable Barcode Identification
-- Add barcode_config JSONB column to events table

ALTER TABLE events ADD COLUMN IF NOT EXISTS barcode_config JSONB DEFAULT NULL;

COMMENT ON COLUMN events.barcode_config IS 'Configurable barcode matching rules: mode (prefix/suffix/full), fixed value, identifier_field, case_sensitive, min_length, max_length';
