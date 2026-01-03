/**
 * Database Migrations
 *
 * Ogni migrazione ha:
 * - version: numero progressivo (es. "002", "003")
 * - name: nome descrittivo
 * - sql: script SQL da eseguire
 *
 * IMPORTANTE: Le migrazioni devono essere idempotenti (usare IF NOT EXISTS, ecc.)
 * perché potrebbero essere eseguite più volte in caso di errori.
 *
 * Per aggiungere una nuova migrazione:
 * 1. Aggiungi un nuovo oggetto all'array MIGRATIONS
 * 2. Usa una version incrementale (es. se l'ultima è "002", usa "003")
 * 3. Scrivi SQL idempotente
 * 4. Fai commit e push - i clienti riceveranno l'aggiornamento automaticamente
 */

export interface Migration {
  version: string;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  // La versione 001 è già inserita dal setup iniziale
  // Aggiungi nuove migrazioni qui sotto

  {
    version: '002',
    name: 'add_cover_charge_setting',
    sql: `
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS cover_charge DECIMAL(10, 2) DEFAULT 0;
    `
  },
  {
    version: '003',
    name: 'add_auto_print_settings',
    sql: `
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS auto_print_enabled BOOLEAN DEFAULT false;
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS printer_type TEXT DEFAULT 'thermal';
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS printer_model TEXT DEFAULT '';
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS print_agent_url TEXT DEFAULT '';
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS printer_ip TEXT DEFAULT '';
      -- Ensure defaults on existing row
      UPDATE settings 
      SET 
        auto_print_enabled = COALESCE(auto_print_enabled, false),
        printer_type = COALESCE(printer_type, 'thermal'),
        printer_model = COALESCE(printer_model, ''),
        print_agent_url = COALESCE(print_agent_url, ''),
        printer_ip = COALESCE(printer_ip, '')
      WHERE id = 1;
    `
  },
  {
    version: '004',
    name: 'add_smac_enabled',
    sql: `
      ALTER TABLE settings
      ADD COLUMN IF NOT EXISTS smac_enabled BOOLEAN DEFAULT false;
      UPDATE settings
      SET smac_enabled = COALESCE(smac_enabled, false)
      WHERE id = 1;
    `
  },
];

// Versione corrente del database (ultima migrazione applicata nel setup iniziale)
export const CURRENT_DB_VERSION = '001';
