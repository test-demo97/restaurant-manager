-- Migration: Add auto print settings columns to settings table
-- Date: 2026-01-03
-- Description: Adds columns for automatic order printing feature

-- Add auto_print_enabled column
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS auto_print_enabled BOOLEAN DEFAULT false;

-- Add printer_type column (thermal or standard)
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS printer_type TEXT DEFAULT 'thermal';

-- Add printer_model column
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS printer_model TEXT DEFAULT '';

-- Add print_agent_url column
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS print_agent_url TEXT DEFAULT '';

-- Add printer_ip column
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS printer_ip TEXT DEFAULT '';

-- Update existing settings row with default values (if exists)
UPDATE settings 
SET 
  auto_print_enabled = COALESCE(auto_print_enabled, false),
  printer_type = COALESCE(printer_type, 'thermal'),
  printer_model = COALESCE(printer_model, ''),
  print_agent_url = COALESCE(print_agent_url, ''),
  printer_ip = COALESCE(printer_ip, '')
WHERE id = 1;

-- Add comment to document the columns
COMMENT ON COLUMN settings.auto_print_enabled IS 'Enable automatic printing of orders when created';
COMMENT ON COLUMN settings.printer_type IS 'Type of printer: thermal or standard';
COMMENT ON COLUMN settings.printer_model IS 'Printer model name for reference';
COMMENT ON COLUMN settings.print_agent_url IS 'URL of local Print Agent server (e.g., http://192.168.1.100:3000)';
COMMENT ON COLUMN settings.printer_ip IS 'Direct IP address of network printer (for direct connection via Print Agent)';
