-- Migration 002: add include_cover to table_sessions if missing
-- Date: 2025-12-24

ALTER TABLE public.table_sessions
ADD COLUMN IF NOT EXISTS include_cover BOOLEAN DEFAULT false;

-- Register migration (safe to run multiple times)
INSERT INTO db_migrations (version, name)
VALUES ('002', 'add_include_cover_to_table_sessions')
ON CONFLICT (version) DO NOTHING;
