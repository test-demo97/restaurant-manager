-- Migration: Add smac_enabled column to settings table
-- Date: 2026-01-03
-- Description: Adds the smac_enabled boolean column used by UI to toggle SMAC features

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS smac_enabled BOOLEAN DEFAULT false;

-- Ensure existing settings row has a non-null value
UPDATE settings
SET smac_enabled = COALESCE(smac_enabled, false)
WHERE id = 1;

COMMENT ON COLUMN settings.smac_enabled IS 'Enable SMAC related fields and features in the UI';
