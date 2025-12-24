// ============== AUTH TYPES ==============
export type UserRole = 'superadmin' | 'admin' | 'staff';

export interface User {
  id: number;
  username: string;
  password: string; // In produzione: hash
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  last_login?: string;
  employee_id?: number; // Collegamento al dipendente (per staff)
}

// Permessi per ruolo
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  superadmin: [
    'dashboard', 'orders', 'orders.new', 'menu', 'tables',
    'inventory', 'recipes', 'staff', 'staff.full', 'reports', 'smac',
    'settings', 'users', 'cash-register', 'dish-costs', 'guide'
  ],
  admin: [
    'dashboard', 'orders', 'orders.new', 'menu', 'tables',
    'inventory', 'recipes', 'staff', 'staff.full', 'cash-register', 'dish-costs', 'guide'
  ],
  staff: [
    'orders.new', 'orders', 'tables', 'staff', 'guide'
  ],
};

// Labels per i ruoli
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

// ============== DATABASE TYPES ==============
export interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  price: number;
  description?: string;
  image_url?: string;
  available: boolean;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  cost: number;
  // Per EOQ
  lead_time_days?: number; // Tempo di consegna fornitore
  order_cost?: number; // Costo fisso per ordine
  holding_cost_percent?: number; // Costo di stoccaggio (% del valore)
}

// Ricetta: collega piatti del menu agli ingredienti
export interface MenuItemIngredient {
  id: number;
  menu_item_id: number;
  menu_item_name?: string;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number; // Quantità di ingrediente per 1 porzione
  unit?: string;
}

// Storico consumi per calcolo EOQ
export interface IngredientConsumption {
  id: number;
  ingredient_id: number;
  ingredient_name?: string;
  date: string;
  quantity_used: number;
  order_id?: number;
}

// Risultato calcolo EOQ
export interface EOQResult {
  ingredient_id: number;
  ingredient_name: string;
  current_stock: number;
  avg_daily_consumption: number;
  eoq: number; // Quantità ottimale da ordinare
  reorder_point: number; // Quando riordinare
  safety_stock: number; // Scorta di sicurezza
  days_until_reorder: number;
  annual_demand: number;
  order_frequency: number; // Ordini per anno
  total_annual_cost: number;
}

export interface InventoryItem {
  id: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  threshold: number; // Soglia manuale impostata dall'utente
  unit?: string;
  threshold_mode?: 'manual' | 'eoq'; // Modalità soglia: manuale o calcolata EOQ
  eoq_threshold?: number; // Soglia calcolata dall'EOQ (reorder_point)
}

export interface Supply {
  id: number;
  date: string;
  supplier_name?: string;
  total_cost: number;
  notes?: string;
  created_at?: string;
}

export interface SupplyItem {
  id: number;
  supply_id: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
  unit?: string;
}

export interface Order {
  id: number;
  date: string;
  total: number;
  payment_method: 'cash' | 'card' | 'online';
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  pickup_time?: string;
  table_id?: number;
  table_name?: string;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  smac_passed: boolean;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  // Campi per sessione tavolo (conto aperto)
  session_id?: number;
  order_number?: number; // Numero comanda nella sessione (1, 2, 3...)
  session_status?: 'open' | 'closed' | 'paid'; // Stato della sessione associata
  // Tracciamento utente per audit
  created_by?: string; // Nome utente che ha creato l'ordine
  updated_by?: string; // Nome utente che ha modificato l'ordine
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item_name?: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Employee {
  id: number;
  name: string;
  role: string;
  hourly_rate: number;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface WorkShift {
  id: number;
  employee_id: number;
  employee_name?: string;
  date: string;
  hours_worked: number;
  status: 'scheduled' | 'completed' | 'absent';
  shift_type: 'worked' | 'sick' | 'vacation' | 'other';
  notes?: string;
  start_time: string;
  end_time: string;
}

export interface Table {
  id: number;
  name: string;
  capacity: number;
  status?: 'available' | 'occupied' | 'reserved';
  current_order_id?: number;
}

export interface Reservation {
  id: number;
  table_id: number;
  table_name?: string;
  // Supporto per più tavoli uniti
  table_ids?: number[]; // Array di ID tavoli uniti
  table_names?: string[]; // Array di nomi tavoli uniti
  date: string;
  time: string;
  customer_name: string;
  phone: string;
  guests: number;
  notes?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface Settings {
  shop_name: string;
  menu_slogan?: string;
  currency: string;
  iva_rate: number;
  iva_included: boolean; // true = IVA inclusa nei prezzi (default), false = IVA aggiunta al totale
  default_threshold: number;
  language: string;
  address?: string;
  phone?: string;
  email?: string;
  smac_enabled: boolean; // true = mostra campi SMAC (solo San Marino), false = nascondi
  cover_charge: number; // Costo coperto per persona (es. 1.50€)
}

// UI Types
export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface DailyStats {
  date: string;
  orders_count: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface TopProduct {
  menu_item_id: number;
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  profit: number;
  period_start: string;
  period_end: string;
}

// ============== CHIUSURA CASSA ==============
export interface CashClosure {
  id: number;
  date: string;
  opening_cash: number;
  closing_cash: number;
  expected_cash: number;
  difference: number;
  total_orders: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  online_revenue: number;
  smac_total: number;
  non_smac_total: number;
  notes?: string;
  closed_by?: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  order_id: number;
  receipt_number: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  subtotal: number;
  iva_rate: number;
  iva_amount: number;
  total: number;
  payment_method: string;
  smac_passed: boolean;
  shop_info: {
    name: string;
    address?: string;
    phone?: string;
  };
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// ============== COSTO PIATTO ==============
export interface DishCost {
  menu_item_id: number;
  menu_item_name: string;
  selling_price: number;
  ingredient_cost: number;
  profit_margin: number;
  profit_margin_percent: number;
  ingredients: DishIngredientCost[];
}

export interface DishIngredientCost {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

// ============== FATTURE ==============
export interface Invoice {
  id: number;
  date: string;
  invoice_number: string;
  supplier_name: string;
  description: string;
  amount: number;
  vat_amount: number;
  total: number;
  category: string;
  paid: boolean;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

// ============== SESSIONE TAVOLO (CONTO APERTO) ==============
export interface TableSession {
  id: number;
  table_id: number;
  table_name?: string;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed' | 'paid';
  total: number;
  payment_method?: 'cash' | 'card' | 'online' | 'split';
  customer_name?: string;
  customer_phone?: string;
  covers: number; // Numero coperti
  notes?: string;
  smac_passed: boolean;
  include_cover?: boolean; // Se il coperto è stato applicato al conto
}

// Item pagato in un pagamento parziale
export interface SessionPaymentItem {
  order_item_id: number;
  quantity: number;
  menu_item_name: string;
  price: number;
}

// Pagamento parziale per split bill
export interface SessionPayment {
  id: number;
  session_id: number;
  amount: number;
  payment_method: 'cash' | 'card' | 'online';
  paid_at: string;
  notes?: string; // es. "Marco", "Ragazza bionda"
  smac_passed?: boolean; // Se questo pagamento è stato smaccato
  paid_items?: SessionPaymentItem[]; // Items pagati con questo pagamento
}

// ============== IMPOSTAZIONI COSTO INGREDIENTI ==============
export type CostCalculationMethod = 'fixed' | 'last' | 'weighted_avg' | 'moving_avg';

export interface InventorySettings {
  cost_calculation_method: CostCalculationMethod;
  moving_avg_months: number; // Numero di mesi per media mobile (1-12)
}
