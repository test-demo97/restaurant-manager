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

  // ESEMPIO di migrazione futura:
  // {
  //   version: '002',
  //   name: 'add_customer_loyalty_table',
  //   sql: `
  //     CREATE TABLE IF NOT EXISTS customer_loyalty (
  //       id SERIAL PRIMARY KEY,
  //       customer_name VARCHAR(100) NOT NULL,
  //       points INTEGER DEFAULT 0,
  //       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  //     );
  //
  //     ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
  //     DROP POLICY IF EXISTS "Allow all on customer_loyalty" ON customer_loyalty;
  //     CREATE POLICY "Allow all on customer_loyalty" ON customer_loyalty FOR ALL USING (true) WITH CHECK (true);
  //   `
  // },
];

// Versione corrente del database (ultima migrazione applicata nel setup iniziale)
export const CURRENT_DB_VERSION = '001';
