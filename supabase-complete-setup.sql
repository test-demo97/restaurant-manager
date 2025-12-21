-- ============================================
-- RESTAURANT MANAGER - SETUP COMPLETO SUPABASE
-- ============================================
-- Versione: 2.5.0
-- Data: Dicembre 2025
--
-- ISTRUZIONI:
-- 1. Vai su Supabase Dashboard > SQL Editor
-- 2. Clicca "New query"
-- 3. Incolla TUTTO questo script
-- 4. Clicca "Run"
--
-- NOTA: Questo è l'UNICO file SQL necessario per il setup completo.
-- Include tutte le tabelle, colonne, indici e dati di default.
-- ============================================

-- ============== CATEGORIES ==============
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20)
);

-- ============== INGREDIENTS ==============
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  lead_time_days INTEGER DEFAULT 2,
  order_cost DECIMAL(10, 2) DEFAULT 15,
  holding_cost_percent INTEGER DEFAULT 20
);

-- ============== MENU ITEMS ==============
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT true
);

-- ============== MENU ITEM INGREDIENTS (Ricette) ==============
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 3) NOT NULL
);

-- ============== INVENTORY ==============
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  threshold DECIMAL(10, 2) NOT NULL DEFAULT 10,
  threshold_mode VARCHAR(10) DEFAULT 'manual',  -- 'manual' o 'eoq'
  eoq_threshold DECIMAL(10, 2),                 -- Soglia calcolata EOQ (reorder_point)
  UNIQUE(ingredient_id)
);

-- ============== INGREDIENT CONSUMPTIONS ==============
CREATE TABLE IF NOT EXISTS ingredient_consumptions (
  id SERIAL PRIMARY KEY,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_used DECIMAL(10, 3) NOT NULL,
  order_id INTEGER
);

-- ============== TABLES ==============
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available',
  current_order_id INTEGER
);

-- ============== TABLE SESSIONS (Conto Aperto) ==============
CREATE TABLE IF NOT EXISTS table_sessions (
  id SERIAL PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(30),
  covers INTEGER DEFAULT 1,
  notes TEXT,
  smac_passed BOOLEAN DEFAULT false
);

-- ============== ORDERS ==============
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  pickup_time TIME,
  table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  smac_passed BOOLEAN DEFAULT false,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(30),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Campi per sessione tavolo (conto aperto)
  session_id INTEGER REFERENCES table_sessions(id) ON DELETE SET NULL,
  order_number INTEGER DEFAULT 1,
  -- Campi per audit/tracciamento utente
  created_by TEXT,
  updated_by TEXT
);

-- ============== ORDER ITEMS ==============
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  notes TEXT
);

-- ============== SESSION PAYMENTS (Split Bill) ==============
CREATE TABLE IF NOT EXISTS session_payments (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes VARCHAR(100),
  smac_passed BOOLEAN DEFAULT false,
  paid_items JSONB DEFAULT '[]'
);

-- ============== EMPLOYEES ==============
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  phone VARCHAR(30),
  email VARCHAR(100),
  active BOOLEAN DEFAULT true
);

-- ============== WORK SHIFTS ==============
CREATE TABLE IF NOT EXISTS work_shifts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'scheduled',
  shift_type VARCHAR(20) DEFAULT 'worked',
  notes TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- ============== RESERVATIONS ==============
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  guests INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'confirmed'
);

-- ============== EXPENSES ==============
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50)
);

-- ============== INVOICES (Fatture) ==============
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============== SUPPLIES ==============
CREATE TABLE IF NOT EXISTS supplies (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name VARCHAR(100),
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============== SUPPLY ITEMS ==============
CREATE TABLE IF NOT EXISTS supply_items (
  id SERIAL PRIMARY KEY,
  supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL
);

-- ============== SETTINGS ==============
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(100) DEFAULT 'Il Mio Ristorante',
  menu_slogan TEXT,
  currency VARCHAR(10) DEFAULT '€',
  iva_rate DECIMAL(5, 2) DEFAULT 22,
  iva_included BOOLEAN DEFAULT true,
  default_threshold INTEGER DEFAULT 10,
  language VARCHAR(10) DEFAULT 'it',
  address TEXT,
  phone VARCHAR(30),
  email VARCHAR(100)
);

-- ============== USERS (per autenticazione app) ==============
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- ============== CASH CLOSURES (Chiusura Cassa) ==============
CREATE TABLE IF NOT EXISTS cash_closures (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  opening_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  expected_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  difference DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cash_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  card_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  online_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  smac_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  non_smac_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  closed_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- ============== SMAC CARDS ==============
CREATE TABLE IF NOT EXISTS smac_cards (
  id SERIAL PRIMARY KEY,
  card_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(30),
  customer_email VARCHAR(100),
  total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visit TIMESTAMP WITH TIME ZONE
);

-- ============== DB MIGRATIONS (per aggiornamenti automatici) ==============
CREATE TABLE IF NOT EXISTS db_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funzione RPC per eseguire migrazioni dal frontend
CREATE OR REPLACE FUNCTION run_migration(
  migration_sql TEXT,
  migration_version VARCHAR(20),
  migration_name VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
  -- Esegui lo SQL della migrazione
  EXECUTE migration_sql;

  -- Registra la migrazione come completata
  INSERT INTO db_migrations (version, name)
  VALUES (migration_version, migration_name)
  ON CONFLICT (version) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AGGIUNGI COLONNE MANCANTI (per upgrade)
-- ============================================
-- Queste ALTER TABLE gestiscono il caso in cui le tabelle
-- esistono già ma mancano alcune colonne

-- Orders: colonne audit
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES table_sessions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER DEFAULT 1;

-- Settings: colonne aggiuntive
ALTER TABLE settings ADD COLUMN IF NOT EXISTS menu_slogan TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS iva_included BOOLEAN DEFAULT true;

-- Users: collegamento dipendente
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;

-- Session payments: SMAC e items pagati
ALTER TABLE session_payments ADD COLUMN IF NOT EXISTS smac_passed BOOLEAN DEFAULT false;
ALTER TABLE session_payments ADD COLUMN IF NOT EXISTS paid_items JSONB DEFAULT '[]';

-- Inventory: modalità soglia (manuale o EOQ)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS threshold_mode VARCHAR(10) DEFAULT 'manual';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS eoq_threshold DECIMAL(10, 2);

-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_payments_session ON session_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_employee ON work_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_date ON work_shifts(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_smac_cards_number ON smac_cards(card_number);

-- ============================================
-- ABILITA REALTIME (per notifiche live)
-- ============================================
-- Questo permette all'app di ricevere aggiornamenti in tempo reale
-- Usa DO block per evitare errori se già aggiunte
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tables') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tables;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'table_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
  END IF;
END $$;

-- ============================================
-- INSERIMENTO DATI DI DEFAULT
-- ============================================

-- Settings iniziali (solo se tabella vuota)
INSERT INTO settings (shop_name, currency, iva_rate, iva_included, default_threshold, language)
SELECT 'Il Mio Ristorante', '€', 22, true, 10, 'it'
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- Utente admin iniziale (password: admin123) - solo se non esiste
INSERT INTO users (username, password, name, role, active)
VALUES ('admin', 'admin123', 'Amministratore', 'superadmin', true)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- NOTA IMPORTANTE: CATEGORIE E MENU
-- ============================================
-- Le categorie e i piatti del menu NON vengono inseriti automaticamente.
-- Ogni ristorante avrà il proprio menu personalizzato.
-- L'admin può creare categorie e piatti dalla sezione "Menu" dell'app.

-- ============================================
-- ABILITA RLS E CREA POLICY "ALLOW ALL"
-- ============================================
-- Questo abilita RLS ma con policy che permettono tutto.
-- È il modo corretto per usare Supabase con anon key.

-- ABILITA RLS SU TUTTE LE TABELLE
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE smac_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_migrations ENABLE ROW LEVEL SECURITY;

-- POLICY: Permetti tutto con anon key
-- (DROP prima per evitare errori se già esistono)
DROP POLICY IF EXISTS "Allow all on categories" ON categories;
DROP POLICY IF EXISTS "Allow all on ingredients" ON ingredients;
DROP POLICY IF EXISTS "Allow all on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow all on menu_item_ingredients" ON menu_item_ingredients;
DROP POLICY IF EXISTS "Allow all on inventory" ON inventory;
DROP POLICY IF EXISTS "Allow all on ingredient_consumptions" ON ingredient_consumptions;
DROP POLICY IF EXISTS "Allow all on tables" ON tables;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;
DROP POLICY IF EXISTS "Allow all on order_items" ON order_items;
DROP POLICY IF EXISTS "Allow all on employees" ON employees;
DROP POLICY IF EXISTS "Allow all on work_shifts" ON work_shifts;
DROP POLICY IF EXISTS "Allow all on reservations" ON reservations;
DROP POLICY IF EXISTS "Allow all on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow all on invoices" ON invoices;
DROP POLICY IF EXISTS "Allow all on supplies" ON supplies;
DROP POLICY IF EXISTS "Allow all on supply_items" ON supply_items;
DROP POLICY IF EXISTS "Allow all on settings" ON settings;
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on cash_closures" ON cash_closures;
DROP POLICY IF EXISTS "Allow all on table_sessions" ON table_sessions;
DROP POLICY IF EXISTS "Allow all on session_payments" ON session_payments;
DROP POLICY IF EXISTS "Allow all on smac_cards" ON smac_cards;
DROP POLICY IF EXISTS "Allow all on db_migrations" ON db_migrations;

CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ingredients" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on menu_item_ingredients" ON menu_item_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ingredient_consumptions" ON ingredient_consumptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tables" ON tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on work_shifts" ON work_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on supplies" ON supplies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on supply_items" ON supply_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cash_closures" ON cash_closures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on table_sessions" ON table_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on session_payments" ON session_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on smac_cards" ON smac_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on db_migrations" ON db_migrations FOR ALL USING (true) WITH CHECK (true);

-- Inserisci versione iniziale delle migrazioni
INSERT INTO db_migrations (version, name)
VALUES ('001', 'initial_setup')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- FINE SCRIPT - Setup completato!
-- ============================================
-- Dopo aver eseguito questo script:
-- 1. RLS è già disabilitato (fatto automaticamente sopra)
-- 2. Copia l'URL e la anon key da Settings > API
-- 3. Configura il file .env dell'app con questi valori
-- ============================================
