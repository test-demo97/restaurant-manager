import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Category,
  MenuItem,
  Ingredient,
  InventoryItem,
  Order,
  OrderItem,
  Employee,
  WorkShift,
  Table,
  Reservation,
  Expense,
  Settings,
  MenuItemIngredient,
  IngredientConsumption,
  EOQResult,
  Supply,
  SupplyItem,
  CashClosure,
  Receipt,
  DishCost,
  DishIngredientCost,
  Invoice,
  TableSession,
  SessionPayment,
} from '../types';

// Local storage fallback for demo mode
const STORAGE_PREFIX = 'kebab_';

function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    if (!data) return defaultValue;
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error parsing localStorage key ${key}:`, error);
    return defaultValue;
  }
}

function setLocalData<T>(key: string, data: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

// Helper function to initialize data only if not exists
function initIfNotExists<T>(key: string, defaultValue: T): void {
  if (!localStorage.getItem(STORAGE_PREFIX + key)) {
    setLocalData(key, defaultValue);
  }
}

// Initialize demo data - only creates data that doesn't exist yet
function initDemoData() {
  // Categories
  initIfNotExists('categories', [
    { id: 1, name: 'Kebab', icon: 'utensils', color: '#f97316' },
    { id: 2, name: 'Piadine', icon: 'sandwich', color: '#eab308' },
    { id: 3, name: 'Bibite', icon: 'coffee', color: '#3b82f6' },
    { id: 4, name: 'Contorni', icon: 'salad', color: '#22c55e' },
    { id: 5, name: 'Dolci', icon: 'cake', color: '#ec4899' },
  ]);

  // Menu items
  initIfNotExists('menu_items', [
    { id: 1, name: 'Kebab Classico', category_id: 1, price: 6.50, description: 'Carne di vitello, insalata, pomodori, cipolla, salsa yogurt', available: true },
    { id: 2, name: 'Kebab Durum', category_id: 1, price: 7.00, description: 'Kebab avvolto in piadina sottile', available: true },
    { id: 3, name: 'Kebab Box', category_id: 1, price: 8.00, description: 'Kebab con patatine in box', available: true },
    { id: 4, name: 'Kebab Falafel', category_id: 1, price: 7.50, description: 'Versione vegetariana con falafel', available: true },
    { id: 5, name: 'Piadina Classica', category_id: 2, price: 5.50, description: 'Prosciutto, formaggio, insalata', available: true },
    { id: 6, name: 'Piadina Kebab', category_id: 2, price: 7.00, description: 'Carne kebab in piadina', available: true },
    { id: 7, name: 'Coca Cola', category_id: 3, price: 2.50, description: '33cl', available: true },
    { id: 8, name: 'Fanta', category_id: 3, price: 2.50, description: '33cl', available: true },
    { id: 9, name: 'Acqua', category_id: 3, price: 1.50, description: '50cl', available: true },
    { id: 10, name: 'Birra', category_id: 3, price: 3.50, description: '33cl', available: true },
    { id: 11, name: 'Patatine Fritte', category_id: 4, price: 3.00, description: 'Porzione abbondante', available: true },
    { id: 12, name: 'Insalata Mista', category_id: 4, price: 4.00, description: 'Insalata fresca di stagione', available: true },
    { id: 13, name: 'Baklava', category_id: 5, price: 3.50, description: 'Dolce turco con miele e noci', available: true },
  ]);

  // Tables
  initIfNotExists('tables', [
    { id: 1, name: 'Tavolo 1', capacity: 4 },
    { id: 2, name: 'Tavolo 2', capacity: 4 },
    { id: 3, name: 'Tavolo 3', capacity: 2 },
    { id: 4, name: 'Tavolo 4', capacity: 6 },
    { id: 5, name: 'Tavolo 5', capacity: 4 },
    { id: 6, name: 'Tavolo 6', capacity: 8 },
  ]);

  // Ingredients
  initIfNotExists('ingredients', [
    { id: 1, name: 'Carne Kebab', unit: 'kg', cost: 12.00, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 2, name: 'Pane Pita', unit: 'pz', cost: 0.30, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 3, name: 'Piadina', unit: 'pz', cost: 0.40, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 4, name: 'Insalata', unit: 'kg', cost: 3.00, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 5, name: 'Pomodori', unit: 'kg', cost: 2.50, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 6, name: 'Cipolla', unit: 'kg', cost: 1.50, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 7, name: 'Salsa Yogurt', unit: 'lt', cost: 5.00, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 8, name: 'Salsa Piccante', unit: 'lt', cost: 6.00, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 9, name: 'Patatine Surgelate', unit: 'kg', cost: 2.00, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
    { id: 10, name: 'Coca Cola 33cl', unit: 'pz', cost: 0.80, lead_time_days: 2, order_cost: 15, holding_cost_percent: 20 },
  ]);

  // Inventory
  initIfNotExists('inventory', [
    { id: 1, ingredient_id: 1, quantity: 15, threshold: 5 },
    { id: 2, ingredient_id: 2, quantity: 100, threshold: 30 },
    { id: 3, ingredient_id: 3, quantity: 80, threshold: 25 },
    { id: 4, ingredient_id: 4, quantity: 8, threshold: 3 },
    { id: 5, ingredient_id: 5, quantity: 10, threshold: 3 },
    { id: 6, ingredient_id: 6, quantity: 5, threshold: 2 },
    { id: 7, ingredient_id: 7, quantity: 4, threshold: 2 },
    { id: 8, ingredient_id: 8, quantity: 3, threshold: 2 },
    { id: 9, ingredient_id: 9, quantity: 20, threshold: 5 },
    { id: 10, ingredient_id: 10, quantity: 48, threshold: 20 },
  ]);

  // Employees
  initIfNotExists('employees', [
    { id: 1, name: 'Marco Rossi', role: 'Cuoco', hourly_rate: 12.00, active: true },
    { id: 2, name: 'Luca Bianchi', role: 'Cameriere', hourly_rate: 10.00, active: true },
    { id: 3, name: 'Sara Verdi', role: 'Cassiere', hourly_rate: 10.00, active: true },
  ]);

  // Settings - IMPORTANTE: non sovrascrive se già esistenti!
  initIfNotExists('settings', {
    shop_name: 'Il Mio Ristorante',
    currency: '€',
    iva_rate: 17,
    default_threshold: 10,
    language: 'it',
    address: 'Via Example 123, San Marino',
    phone: '+378 0549 123456',
  });

  // Orders (empty initially)
  initIfNotExists('orders', []);
  initIfNotExists('order_items', []);
  initIfNotExists('work_shifts', []);
  initIfNotExists('reservations', []);
  initIfNotExists('expenses', []);
  initIfNotExists('supplies', []);
  initIfNotExists('supply_items', []);

  // Ricette (collegamento menu-ingredienti) con dati demo
  initIfNotExists('menu_item_ingredients', [
    // Kebab Classico (id: 1)
    { id: 1, menu_item_id: 1, ingredient_id: 1, quantity: 0.15 },
    { id: 2, menu_item_id: 1, ingredient_id: 2, quantity: 1 },
    { id: 3, menu_item_id: 1, ingredient_id: 4, quantity: 0.05 },
    { id: 4, menu_item_id: 1, ingredient_id: 5, quantity: 0.03 },
    { id: 5, menu_item_id: 1, ingredient_id: 6, quantity: 0.02 },
    { id: 6, menu_item_id: 1, ingredient_id: 7, quantity: 0.03 },
    // Kebab Durum (id: 2)
    { id: 7, menu_item_id: 2, ingredient_id: 1, quantity: 0.18 },
    { id: 8, menu_item_id: 2, ingredient_id: 3, quantity: 1 },
    { id: 9, menu_item_id: 2, ingredient_id: 4, quantity: 0.05 },
    { id: 10, menu_item_id: 2, ingredient_id: 5, quantity: 0.03 },
    { id: 11, menu_item_id: 2, ingredient_id: 7, quantity: 0.03 },
    // Kebab Box (id: 3)
    { id: 12, menu_item_id: 3, ingredient_id: 1, quantity: 0.20 },
    { id: 13, menu_item_id: 3, ingredient_id: 9, quantity: 0.15 },
    { id: 14, menu_item_id: 3, ingredient_id: 4, quantity: 0.04 },
    { id: 15, menu_item_id: 3, ingredient_id: 7, quantity: 0.04 },
    // Piadina Kebab (id: 6)
    { id: 16, menu_item_id: 6, ingredient_id: 1, quantity: 0.12 },
    { id: 17, menu_item_id: 6, ingredient_id: 3, quantity: 1 },
    { id: 18, menu_item_id: 6, ingredient_id: 4, quantity: 0.04 },
    { id: 19, menu_item_id: 6, ingredient_id: 7, quantity: 0.02 },
    // Coca Cola (id: 7)
    { id: 20, menu_item_id: 7, ingredient_id: 10, quantity: 1 },
    // Patatine Fritte (id: 11)
    { id: 21, menu_item_id: 11, ingredient_id: 9, quantity: 0.20 },
  ]);

  // Storico consumi (inizialmente vuoto)
  initIfNotExists('ingredient_consumptions', []);

  // Sessioni tavolo e pagamenti (inizialmente vuoti)
  // Queste chiavi vengono sempre inizializzate se non esistono (per supportare update da versioni precedenti)
  initIfNotExists('table_sessions', []);
  initIfNotExists('session_payments', []);

  // Flag initialized non è più necessario perché usiamo initIfNotExists
  setLocalData('initialized', true);
}

// Assicura che le nuove chiavi esistano sempre (per utenti con localStorage esistente)
function ensureNewKeysExist() {
  initIfNotExists('table_sessions', []);
  initIfNotExists('session_payments', []);
}

// Esegui sempre per garantire compatibilità
ensureNewKeysExist();

// Initialize on load
initDemoData();

// ============== CATEGORIES ==============
export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data || [];
  }
  return getLocalData('categories', []);
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<Category> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('categories').insert(category).select().single();
    if (error) throw error;
    return data;
  }
  const categories = getLocalData<Category[]>('categories', []);
  const newCategory = { ...category, id: Date.now() };
  setLocalData('categories', [...categories, newCategory]);
  return newCategory;
}

export async function updateCategory(id: number, category: Partial<Category>): Promise<Category> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('categories').update(category).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const categories = getLocalData<Category[]>('categories', []);
  const index = categories.findIndex(c => c.id === id);
  if (index !== -1) {
    categories[index] = { ...categories[index], ...category };
    setLocalData('categories', categories);
  }
  return categories[index];
}

export async function deleteCategory(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const categories = getLocalData<Category[]>('categories', []);
  setLocalData('categories', categories.filter(c => c.id !== id));
}

// ============== MENU ITEMS ==============
export async function getMenuItems(): Promise<MenuItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .order('category_id')
      .order('name');
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      category_name: item.categories?.name,
    }));
  }
  const items = getLocalData<MenuItem[]>('menu_items', []);
  const categories = getLocalData<Category[]>('categories', []);
  return items.map(item => ({
    ...item,
    category_name: categories.find(c => c.id === item.category_id)?.name,
  }));
}

export async function getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
  const items = await getMenuItems();
  return items.filter(item => item.category_id === categoryId);
}

export async function createMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('menu_items').insert(item).select().single();
    if (error) throw error;
    return data;
  }
  const items = getLocalData<MenuItem[]>('menu_items', []);
  const newItem = { ...item, id: Date.now() };
  setLocalData('menu_items', [...items, newItem]);
  return newItem;
}

export async function updateMenuItem(id: number, item: Partial<MenuItem>): Promise<MenuItem> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('menu_items').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const items = getLocalData<MenuItem[]>('menu_items', []);
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...item };
    setLocalData('menu_items', items);
  }
  return items[index];
}

export async function deleteMenuItem(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const items = getLocalData<MenuItem[]>('menu_items', []);
  setLocalData('menu_items', items.filter(i => i.id !== id));
}

// ============== ORDERS ==============
export async function getOrders(date?: string): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('orders').select('*, tables(name), table_sessions(status)').order('created_at', { ascending: false });
    if (date) {
      query = query.eq('date', date);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(order => ({
      ...order,
      table_name: order.tables?.name,
      session_status: order.table_sessions?.status,
    }));
  }
  let orders = getLocalData<Order[]>('orders', []);
  if (date) {
    orders = orders.filter(o => o.date === date);
  }
  const tables = getLocalData<Table[]>('tables', []);
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  return orders.map(order => ({
    ...order,
    table_name: tables.find(t => t.id === order.table_id)?.name,
    session_status: order.session_id ? sessions.find(s => s.id === order.session_id)?.status : undefined,
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getOrdersByStatus(status: Order['status']): Promise<Order[]> {
  const orders = await getOrders();
  return orders.filter(o => o.status === status);
}

export async function getTodayOrders(): Promise<Order[]> {
  const today = new Date().toISOString().split('T')[0];
  return getOrders(today);
}

export async function createOrder(order: Omit<Order, 'id' | 'created_at'>, items: Omit<OrderItem, 'id' | 'order_id'>[]): Promise<Order> {
  if (isSupabaseConfigured && supabase) {
    const { data: orderData, error: orderError } = await supabase.from('orders').insert(order).select().single();
    if (orderError) throw orderError;

    const orderItems = items.map(item => ({ ...item, order_id: orderData.id }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // Scala automaticamente l'inventario
    await consumeIngredientsForOrderInternal(items, orderData.id);

    return orderData;
  }

  const orders = getLocalData<Order[]>('orders', []);
  const orderItems = getLocalData<OrderItem[]>('order_items', []);

  const newOrder: Order = {
    ...order,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };

  const newItems = items.map((item, index) => ({
    ...item,
    id: Date.now() + index + 1,
    order_id: newOrder.id,
  }));

  setLocalData('orders', [...orders, newOrder]);
  setLocalData('order_items', [...orderItems, ...newItems]);

  // Scala automaticamente l'inventario
  await consumeIngredientsForOrderInternal(items, newOrder.id);

  return newOrder;
}

// Funzione interna per evitare import circolare
async function consumeIngredientsForOrderInternal(
  orderItems: { menu_item_id: number; quantity: number }[],
  orderId: number
): Promise<void> {
  const recipes = getLocalData<MenuItemIngredient[]>('menu_item_ingredients', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);

  // Calcola consumo totale per ogni ingrediente
  const consumptionMap: Record<number, number> = {};

  for (const orderItem of orderItems) {
    const itemRecipe = recipes.filter(r => r.menu_item_id === orderItem.menu_item_id);
    for (const recipeItem of itemRecipe) {
      const totalConsumption = recipeItem.quantity * orderItem.quantity;
      consumptionMap[recipeItem.ingredient_id] =
        (consumptionMap[recipeItem.ingredient_id] || 0) + totalConsumption;
    }
  }

  // Scala inventario e registra consumi
  const consumptions = getLocalData<IngredientConsumption[]>('ingredient_consumptions', []);
  const today = new Date().toISOString().split('T')[0];

  for (const [ingredientId, consumed] of Object.entries(consumptionMap)) {
    const invIndex = inventory.findIndex(i => i.ingredient_id === Number(ingredientId));
    if (invIndex !== -1) {
      // Scala quantità
      inventory[invIndex].quantity = Math.max(0, inventory[invIndex].quantity - consumed);

      // Registra consumo
      consumptions.push({
        id: Date.now() + Math.random(),
        ingredient_id: Number(ingredientId),
        ingredient_name: ingredients.find(i => i.id === Number(ingredientId))?.name,
        date: today,
        quantity_used: consumed,
        order_id: orderId,
      });
    }
  }

  setLocalData('inventory', inventory);
  setLocalData('ingredient_consumptions', consumptions);
}

export async function updateOrderStatus(id: number, status: Order['status']): Promise<Order> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const orders = getLocalData<Order[]>('orders', []);
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index] = { ...orders[index], status };
    setLocalData('orders', orders);
  }
  return orders[index];
}

export async function updateOrder(
  id: number,
  orderUpdates: Partial<Omit<Order, 'id' | 'created_at'>>,
  newItems?: Omit<OrderItem, 'id' | 'order_id'>[]
): Promise<Order> {
  if (isSupabaseConfigured && supabase) {
    // Aggiorna l'ordine
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update(orderUpdates)
      .eq('id', id)
      .select()
      .single();
    if (orderError) throw orderError;

    // Se ci sono nuovi items, sostituisci quelli esistenti
    if (newItems) {
      // Elimina i vecchi items
      await supabase.from('order_items').delete().eq('order_id', id);

      // Inserisci i nuovi items
      const orderItems = newItems.map(item => ({ ...item, order_id: id }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
    }

    return orderData;
  }

  // LocalStorage mode
  const orders = getLocalData<Order[]>('orders', []);
  const index = orders.findIndex(o => o.id === id);

  if (index !== -1) {
    orders[index] = { ...orders[index], ...orderUpdates };
    setLocalData('orders', orders);

    if (newItems) {
      const orderItems = getLocalData<OrderItem[]>('order_items', []);
      // Rimuovi vecchi items
      const filteredItems = orderItems.filter(i => i.order_id !== id);
      // Aggiungi nuovi items
      const newOrderItems = newItems.map((item, idx) => ({
        ...item,
        id: Date.now() + idx + 1,
        order_id: id,
      }));
      setLocalData('order_items', [...filteredItems, ...newOrderItems]);
    }

    return orders[index];
  }

  throw new Error('Ordine non trovato');
}

export async function deleteOrder(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('order_items').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const orders = getLocalData<Order[]>('orders', []);
  const orderItems = getLocalData<OrderItem[]>('order_items', []);
  setLocalData('orders', orders.filter(o => o.id !== id));
  setLocalData('order_items', orderItems.filter(i => i.order_id !== id));
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('order_items')
      .select('*, menu_items(name)')
      .eq('order_id', orderId);
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      menu_item_name: item.menu_items?.name,
    }));
  }
  const orderItems = getLocalData<OrderItem[]>('order_items', []);
  const menuItems = getLocalData<MenuItem[]>('menu_items', []);
  return orderItems
    .filter(i => i.order_id === orderId)
    .map(item => ({
      ...item,
      menu_item_name: menuItems.find(m => m.id === item.menu_item_id)?.name,
    }));
}

// ============== TABLES ==============
export async function getTables(): Promise<Table[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('tables').select('*').order('name');
    if (error) throw error;
    return data || [];
  }
  return getLocalData('tables', []);
}

export async function createTable(table: Omit<Table, 'id'>): Promise<Table> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('tables').insert(table).select().single();
    if (error) throw error;
    return data;
  }
  const tables = getLocalData<Table[]>('tables', []);
  const newTable = { ...table, id: Date.now() };
  setLocalData('tables', [...tables, newTable]);
  return newTable;
}

export async function updateTable(id: number, table: Partial<Table>): Promise<Table> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('tables').update(table).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const tables = getLocalData<Table[]>('tables', []);
  const index = tables.findIndex(t => t.id === id);
  if (index !== -1) {
    tables[index] = { ...tables[index], ...table };
    setLocalData('tables', tables);
  }
  return tables[index];
}

export async function deleteTable(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const tables = getLocalData<Table[]>('tables', []);
  setLocalData('tables', tables.filter(t => t.id !== id));
}

// ============== INVENTORY & INGREDIENTS ==============
export async function getIngredients(): Promise<Ingredient[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('ingredients').select('*').order('name');
    if (error) throw error;
    return data || [];
  }
  return getLocalData('ingredients', []);
}

export async function getInventory(): Promise<InventoryItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('inventory')
      .select('*, ingredients(name, unit)')
      .order('id');
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      ingredient_name: item.ingredients?.name,
      unit: item.ingredients?.unit,
    }));
  }
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  return inventory.map(item => ({
    ...item,
    ingredient_name: ingredients.find(i => i.id === item.ingredient_id)?.name,
    unit: ingredients.find(i => i.id === item.ingredient_id)?.unit,
  }));
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const inventory = await getInventory();
  return inventory.filter(item => item.quantity <= item.threshold);
}

export async function createIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('ingredients').insert(ingredient).select().single();
    if (error) throw error;

    // Also create inventory entry
    await supabase.from('inventory').insert({ ingredient_id: data.id, quantity: 0, threshold: 10 });

    return data;
  }
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const newIngredient = { ...ingredient, id: Date.now() };
  setLocalData('ingredients', [...ingredients, newIngredient]);
  setLocalData('inventory', [...inventory, { id: Date.now() + 1, ingredient_id: newIngredient.id, quantity: 0, threshold: 10 }]);
  return newIngredient;
}

export async function updateInventoryQuantity(ingredientId: number, quantity: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('inventory')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('ingredient_id', ingredientId);
    if (error) throw error;
    return;
  }
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const index = inventory.findIndex(i => i.ingredient_id === ingredientId);
  if (index !== -1) {
    inventory[index] = { ...inventory[index], quantity };
    setLocalData('inventory', inventory);
  }
}

// ============== EMPLOYEES ==============
export async function getEmployees(): Promise<Employee[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw error;
    return data || [];
  }
  return getLocalData('employees', []);
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('employees').insert(employee).select().single();
    if (error) throw error;
    return data;
  }
  const employees = getLocalData<Employee[]>('employees', []);
  const newEmployee = { ...employee, id: Date.now() };
  setLocalData('employees', [...employees, newEmployee]);
  return newEmployee;
}

export async function updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('employees').update(employee).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const employees = getLocalData<Employee[]>('employees', []);
  const index = employees.findIndex(e => e.id === id);
  if (index !== -1) {
    employees[index] = { ...employees[index], ...employee };
    setLocalData('employees', employees);
  }
  return employees[index];
}

export async function deleteEmployee(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const employees = getLocalData<Employee[]>('employees', []);
  setLocalData('employees', employees.filter(e => e.id !== id));
}

// ============== WORK SHIFTS ==============
export async function getWorkShifts(startDate?: string, endDate?: string): Promise<WorkShift[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('work_shifts').select('*, employees(name)').order('date', { ascending: false });
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(shift => ({
      ...shift,
      employee_name: shift.employees?.name,
    }));
  }
  let shifts = getLocalData<WorkShift[]>('work_shifts', []);
  if (startDate) shifts = shifts.filter(s => s.date >= startDate);
  if (endDate) shifts = shifts.filter(s => s.date <= endDate);
  const employees = getLocalData<Employee[]>('employees', []);
  return shifts.map(shift => ({
    ...shift,
    employee_name: employees.find(e => e.id === shift.employee_id)?.name,
  }));
}

export async function createWorkShift(shift: Omit<WorkShift, 'id'>): Promise<WorkShift> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('work_shifts').insert(shift).select().single();
    if (error) throw error;
    return data;
  }
  const shifts = getLocalData<WorkShift[]>('work_shifts', []);
  const newShift = { ...shift, id: Date.now() };
  setLocalData('work_shifts', [...shifts, newShift]);
  return newShift;
}

// ============== RESERVATIONS ==============
export async function getReservations(date?: string): Promise<Reservation[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('reservations').select('*, tables(name)').order('date').order('time');
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(res => ({
      ...res,
      table_name: res.tables?.name,
    }));
  }
  let reservations = getLocalData<Reservation[]>('reservations', []);
  console.log('Raw reservations from localStorage:', reservations);
  if (date) reservations = reservations.filter(r => r.date === date);
  const tables = getLocalData<Table[]>('tables', []);
  const result = reservations.map(res => {
    // Supporto multi-tavoli - assicura che table_ids sia sempre un array valido
    const tableIds = res.table_ids && res.table_ids.length > 0 ? res.table_ids : [res.table_id];
    const tableNames = tableIds.map(id => tables.find(t => t.id === id)?.name || '').filter(Boolean);
    console.log('Reservation', res.id, 'table_ids:', res.table_ids, '-> resolved tableIds:', tableIds);
    return {
      ...res,
      table_ids: tableIds, // Assicura che table_ids sia sempre presente nel risultato
      table_name: tableNames.join(' + ') || tables.find(t => t.id === res.table_id)?.name,
      table_names: tableNames,
    };
  });
  return result;
}

export async function createReservation(reservation: Omit<Reservation, 'id'>): Promise<Reservation> {
  if (isSupabaseConfigured && supabase) {
    // Per Supabase, escludi table_ids e table_names (non esistono nel DB)
    // Salva solo il primo table_id per retrocompatibilità
    const { table_ids, table_names, ...reservationWithoutArrays } = reservation;
    const { data, error } = await supabase.from('reservations').insert({
      ...reservationWithoutArrays,
      table_id: table_ids?.[0] || reservation.table_id,
    }).select().single();
    if (error) throw error;
    return data;
  }
  const reservations = getLocalData<Reservation[]>('reservations', []);
  const newReservation = { ...reservation, id: Date.now() };
  setLocalData('reservations', [...reservations, newReservation]);
  return newReservation;
}

export async function updateReservation(id: number, updates: Partial<Omit<Reservation, 'id'>>): Promise<Reservation> {
  if (isSupabaseConfigured && supabase) {
    // Per Supabase, escludi table_ids e table_names (non esistono nel DB)
    const { table_ids, table_names, ...updatesWithoutArrays } = updates;
    const { data, error } = await supabase
      .from('reservations')
      .update({
        ...updatesWithoutArrays,
        table_id: table_ids?.[0] || updates.table_id,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const reservations = getLocalData<Reservation[]>('reservations', []);
  const index = reservations.findIndex(r => r.id === id);
  if (index !== -1) {
    reservations[index] = { ...reservations[index], ...updates };
    setLocalData('reservations', reservations);
    return reservations[index];
  }
  throw new Error('Prenotazione non trovata');
}

export async function deleteReservation(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const reservations = getLocalData<Reservation[]>('reservations', []);
  setLocalData('reservations', reservations.filter(r => r.id !== id));
}

// ============== EXPENSES ==============
export async function getExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  let expenses = getLocalData<Expense[]>('expenses', []);
  if (startDate) expenses = expenses.filter(e => e.date >= startDate);
  if (endDate) expenses = expenses.filter(e => e.date <= endDate);
  return expenses;
}

export async function createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('expenses').insert(expense).select().single();
    if (error) throw error;
    return data;
  }
  const expenses = getLocalData<Expense[]>('expenses', []);
  const newExpense = { ...expense, id: Date.now() };
  setLocalData('expenses', [...expenses, newExpense]);
  return newExpense;
}

export async function updateExpense(id: number, updates: Partial<Omit<Expense, 'id'>>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) throw error;
    return;
  }
  const expenses = getLocalData<Expense[]>('expenses', []);
  const index = expenses.findIndex(e => e.id === id);
  if (index !== -1) {
    expenses[index] = { ...expenses[index], ...updates };
    setLocalData('expenses', expenses);
  }
}

export async function deleteExpense(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const expenses = getLocalData<Expense[]>('expenses', []);
  setLocalData('expenses', expenses.filter(e => e.id !== id));
}

// ============== SETTINGS ==============
export async function getSettings(): Promise<Settings> {
  if (isSupabaseConfigured && supabase) {
    // La tabella settings ha una singola riga con colonne dirette
    const { data, error } = await supabase.from('settings').select('*').limit(1).single();
    if (error) {
      console.warn('Error fetching settings from Supabase, using defaults:', error);
      // Ritorna valori di default se la tabella è vuota o c'è un errore
      return {
        shop_name: 'Il Mio Ristorante',
        currency: '€',
        iva_rate: 17,
        default_threshold: 10,
        language: 'it',
      };
    }
    return {
      shop_name: data?.shop_name || 'Il Mio Ristorante',
      currency: data?.currency || '€',
      iva_rate: data?.iva_rate ?? 17,
      default_threshold: data?.default_threshold ?? 10,
      language: data?.language || 'it',
      address: data?.address,
      phone: data?.phone,
      email: data?.email,
    };
  }
  return getLocalData('settings', {
    shop_name: 'Il Mio Ristorante',
    currency: '€',
    iva_rate: 17,
    default_threshold: 10,
    language: 'it',
  });
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Prima verifica se esiste una riga nella tabella settings
    const { data: existing } = await supabase.from('settings').select('id').limit(1).single();

    if (existing) {
      // Aggiorna la riga esistente
      const { error } = await supabase.from('settings').update(settings).eq('id', existing.id);
      if (error) throw error;
    } else {
      // Inserisci una nuova riga con i valori di default + le modifiche
      const newSettings = {
        shop_name: 'Il Mio Ristorante',
        currency: '€',
        iva_rate: 17,
        default_threshold: 10,
        language: 'it',
        ...settings
      };
      const { error } = await supabase.from('settings').insert(newSettings);
      if (error) throw error;
    }

    // Emetti l'evento anche per Supabase
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
    return;
  }
  const currentSettings = getLocalData<Settings>('settings', {} as Settings);
  const newSettings = { ...currentSettings, ...settings };
  setLocalData('settings', newSettings);

  // Emetti un evento custom per notificare i componenti che le settings sono cambiate
  window.dispatchEvent(new CustomEvent('settings-updated', { detail: newSettings }));
}

// ============== STATISTICS ==============
export async function getDailyStats(date: string): Promise<{ orders: number; revenue: number; avgOrder: number }> {
  const orders = await getOrders(date);
  const completedOrders = orders.filter(o => o.status !== 'cancelled');
  const revenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  return {
    orders: completedOrders.length,
    revenue,
    avgOrder: completedOrders.length > 0 ? revenue / completedOrders.length : 0,
  };
}

export async function getWeeklyStats(): Promise<{ date: string; orders: number; revenue: number }[]> {
  const stats: { date: string; orders: number; revenue: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStats = await getDailyStats(dateStr);
    stats.push({
      date: dateStr,
      orders: dayStats.orders,
      revenue: dayStats.revenue,
    });
  }

  return stats;
}

export async function getTopProducts(limit: number = 5): Promise<{ name: string; quantity: number; revenue: number }[]> {
  const orders = await getOrders();
  const productStats: Record<number, { name: string; quantity: number; revenue: number }> = {};

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const items = await getOrderItems(order.id);
    for (const item of items) {
      if (!productStats[item.menu_item_id]) {
        productStats[item.menu_item_id] = {
          name: item.menu_item_name || 'Unknown',
          quantity: 0,
          revenue: 0,
        };
      }
      productStats[item.menu_item_id].quantity += item.quantity;
      productStats[item.menu_item_id].revenue += item.quantity * item.price;
    }
  }

  return Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

// ============== RICETTE (Menu-Ingredienti) ==============
export async function getMenuItemIngredients(menuItemId?: number): Promise<MenuItemIngredient[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('menu_item_ingredients').select('*, menu_items(name), ingredients(name, unit)');
    if (menuItemId) query = query.eq('menu_item_id', menuItemId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      menu_item_name: item.menu_items?.name,
      ingredient_name: item.ingredients?.name,
      unit: item.ingredients?.unit,
    }));
  }
  let items = getLocalData<MenuItemIngredient[]>('menu_item_ingredients', []);
  if (menuItemId) items = items.filter(i => i.menu_item_id === menuItemId);
  const menuItems = getLocalData<MenuItem[]>('menu_items', []);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  return items.map(item => ({
    ...item,
    menu_item_name: menuItems.find(m => m.id === item.menu_item_id)?.name,
    ingredient_name: ingredients.find(i => i.id === item.ingredient_id)?.name,
    unit: ingredients.find(i => i.id === item.ingredient_id)?.unit,
  }));
}

export async function addMenuItemIngredient(data: Omit<MenuItemIngredient, 'id'>): Promise<MenuItemIngredient> {
  if (isSupabaseConfigured && supabase) {
    const { data: result, error } = await supabase.from('menu_item_ingredients').insert(data).select().single();
    if (error) throw error;
    return result;
  }
  const items = getLocalData<MenuItemIngredient[]>('menu_item_ingredients', []);
  const newItem = { ...data, id: Date.now() };
  setLocalData('menu_item_ingredients', [...items, newItem]);
  return newItem;
}

export async function updateMenuItemIngredient(id: number, data: Partial<MenuItemIngredient>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('menu_item_ingredients').update(data).eq('id', id);
    if (error) throw error;
    return;
  }
  const items = getLocalData<MenuItemIngredient[]>('menu_item_ingredients', []);
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...data };
    setLocalData('menu_item_ingredients', items);
  }
}

export async function deleteMenuItemIngredient(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('menu_item_ingredients').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const items = getLocalData<MenuItemIngredient[]>('menu_item_ingredients', []);
  setLocalData('menu_item_ingredients', items.filter(i => i.id !== id));
}

// ============== CONSUMI INGREDIENTI ==============
export async function recordIngredientConsumption(
  ingredientId: number,
  quantityUsed: number,
  orderId?: number
): Promise<void> {
  const consumption: Omit<IngredientConsumption, 'id'> = {
    ingredient_id: ingredientId,
    date: new Date().toISOString().split('T')[0],
    quantity_used: quantityUsed,
    order_id: orderId,
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('ingredient_consumptions').insert(consumption);
    if (error) throw error;
    return;
  }
  const consumptions = getLocalData<IngredientConsumption[]>('ingredient_consumptions', []);
  setLocalData('ingredient_consumptions', [...consumptions, { ...consumption, id: Date.now() }]);
}

export async function getIngredientConsumptions(
  ingredientId?: number,
  startDate?: string,
  endDate?: string
): Promise<IngredientConsumption[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('ingredient_consumptions').select('*, ingredients(name)');
    if (ingredientId) query = query.eq('ingredient_id', ingredientId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      ingredient_name: c.ingredients?.name,
    }));
  }
  let consumptions = getLocalData<IngredientConsumption[]>('ingredient_consumptions', []);
  if (ingredientId) consumptions = consumptions.filter(c => c.ingredient_id === ingredientId);
  if (startDate) consumptions = consumptions.filter(c => c.date >= startDate);
  if (endDate) consumptions = consumptions.filter(c => c.date <= endDate);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  return consumptions.map(c => ({
    ...c,
    ingredient_name: ingredients.find(i => i.id === c.ingredient_id)?.name,
  }));
}

// ============== SCALARE INVENTARIO AUTOMATICO ==============
export async function consumeIngredientsForOrder(
  orderItems: { menu_item_id: number; quantity: number }[],
  orderId: number
): Promise<void> {
  const recipes = await getMenuItemIngredients();
  const inventory = await getInventory();

  // Calcola consumo totale per ogni ingrediente
  const consumptionMap: Record<number, number> = {};

  for (const orderItem of orderItems) {
    const itemRecipe = recipes.filter(r => r.menu_item_id === orderItem.menu_item_id);
    for (const recipeItem of itemRecipe) {
      const totalConsumption = recipeItem.quantity * orderItem.quantity;
      consumptionMap[recipeItem.ingredient_id] =
        (consumptionMap[recipeItem.ingredient_id] || 0) + totalConsumption;
    }
  }

  // Scala inventario e registra consumi
  for (const [ingredientId, consumed] of Object.entries(consumptionMap)) {
    const invItem = inventory.find(i => i.ingredient_id === Number(ingredientId));
    if (invItem) {
      const newQuantity = Math.max(0, invItem.quantity - consumed);
      await updateInventoryQuantity(Number(ingredientId), newQuantity);
      await recordIngredientConsumption(Number(ingredientId), consumed, orderId);
    }
  }
}

// ============== CALCOLO EOQ ==============
export async function calculateEOQ(): Promise<EOQResult[]> {
  const ingredients = await getIngredients();
  const inventory = await getInventory();
  const consumptions = await getIngredientConsumptions();

  // Calcola consumo medio giornaliero degli ultimi 30 giorni
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];

  const results: EOQResult[] = [];

  for (const ingredient of ingredients) {
    const invItem = inventory.find(i => i.ingredient_id === ingredient.id);
    if (!invItem) continue;

    // Consumi degli ultimi 30 giorni per questo ingrediente
    const recentConsumptions = consumptions.filter(
      c => c.ingredient_id === ingredient.id && c.date >= startDate
    );

    // Consumo totale e medio giornaliero
    const totalConsumed = recentConsumptions.reduce((sum, c) => sum + c.quantity_used, 0);
    const daysWithData = Math.max(1, new Set(recentConsumptions.map(c => c.date)).size);
    const avgDailyConsumption = totalConsumed / Math.max(daysWithData, 1);

    // Se non c'è consumo, salta
    if (avgDailyConsumption === 0) {
      results.push({
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        current_stock: invItem.quantity,
        avg_daily_consumption: 0,
        eoq: 0,
        reorder_point: invItem.threshold,
        safety_stock: invItem.threshold,
        days_until_reorder: invItem.quantity > 0 ? Infinity : 0,
        annual_demand: 0,
        order_frequency: 0,
        total_annual_cost: 0,
      });
      continue;
    }

    // Parametri EOQ
    const annualDemand = avgDailyConsumption * 365;
    const orderCost = ingredient.order_cost || 15; // Costo fisso per ordine
    const holdingCostPercent = (ingredient.holding_cost_percent || 20) / 100;
    const unitCost = ingredient.cost;
    const holdingCost = unitCost * holdingCostPercent;
    const leadTimeDays = ingredient.lead_time_days || 2;

    // Formula EOQ: sqrt(2 * D * S / H)
    // D = domanda annuale, S = costo per ordine, H = costo mantenimento per unità
    const eoq = holdingCost > 0
      ? Math.sqrt((2 * annualDemand * orderCost) / holdingCost)
      : annualDemand / 12; // Fallback: ordine mensile

    // Scorta di sicurezza (50% del consumo durante lead time)
    const safetyStock = avgDailyConsumption * leadTimeDays * 0.5;

    // Punto di riordino = consumo durante lead time + scorta sicurezza
    const reorderPoint = (avgDailyConsumption * leadTimeDays) + safetyStock;

    // Giorni fino al punto di riordino
    const daysUntilReorder = avgDailyConsumption > 0
      ? Math.max(0, (invItem.quantity - reorderPoint) / avgDailyConsumption)
      : Infinity;

    // Frequenza ordini annua
    const orderFrequency = eoq > 0 ? annualDemand / eoq : 0;

    // Costo totale annuo = costo ordini + costo mantenimento
    const totalAnnualCost = (orderFrequency * orderCost) + ((eoq / 2) * holdingCost);

    results.push({
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      current_stock: invItem.quantity,
      avg_daily_consumption: Math.round(avgDailyConsumption * 1000) / 1000,
      eoq: Math.round(eoq * 10) / 10,
      reorder_point: Math.round(reorderPoint * 10) / 10,
      safety_stock: Math.round(safetyStock * 10) / 10,
      days_until_reorder: Math.round(daysUntilReorder),
      annual_demand: Math.round(annualDemand),
      order_frequency: Math.round(orderFrequency * 10) / 10,
      total_annual_cost: Math.round(totalAnnualCost * 100) / 100,
    });
  }

  // Ordina per urgenza (giorni fino al riordino)
  return results.sort((a, b) => a.days_until_reorder - b.days_until_reorder);
}

// ============== FORNITURE (SUPPLIES) ==============
export async function getSupplies(startDate?: string, endDate?: string): Promise<Supply[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('supplies').select('*').order('date', { ascending: false });
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  let supplies = getLocalData<Supply[]>('supplies', []);
  if (startDate) supplies = supplies.filter(s => s.date >= startDate);
  if (endDate) supplies = supplies.filter(s => s.date <= endDate);
  return supplies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getSupplyById(id: number): Promise<Supply | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('supplies').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }
  const supplies = getLocalData<Supply[]>('supplies', []);
  return supplies.find(s => s.id === id) || null;
}

export async function getSupplyItems(supplyId: number): Promise<SupplyItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('supply_items')
      .select('*, ingredients(name, unit)')
      .eq('supply_id', supplyId);
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      ingredient_name: item.ingredients?.name,
      unit: item.ingredients?.unit,
      total_cost: item.quantity * item.unit_cost,
    }));
  }
  const supplyItems = getLocalData<SupplyItem[]>('supply_items', []);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  return supplyItems
    .filter(si => si.supply_id === supplyId)
    .map(item => ({
      ...item,
      ingredient_name: ingredients.find(i => i.id === item.ingredient_id)?.name,
      unit: ingredients.find(i => i.id === item.ingredient_id)?.unit,
      total_cost: item.quantity * item.unit_cost,
    }));
}

export async function createSupply(
  supply: Omit<Supply, 'id' | 'created_at' | 'total_cost'>,
  items: Omit<SupplyItem, 'id' | 'supply_id'>[]
): Promise<Supply> {
  // Calcola il costo totale (unit_cost è già il costo totale per quell'ingrediente)
  const totalCost = items.reduce((sum, item) => sum + item.unit_cost, 0);

  if (isSupabaseConfigured && supabase) {
    // Crea la fornitura
    const { data: supplyData, error: supplyError } = await supabase
      .from('supplies')
      .insert({ ...supply, total_cost: totalCost })
      .select()
      .single();
    if (supplyError) throw supplyError;

    // Crea gli item della fornitura
    const supplyItems = items.map(item => ({
      ...item,
      supply_id: supplyData.id,
    }));
    const { error: itemsError } = await supabase.from('supply_items').insert(supplyItems);
    if (itemsError) throw itemsError;

    // Aggiorna l'inventario
    for (const item of items) {
      const { data: invData } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('ingredient_id', item.ingredient_id)
        .single();

      if (invData) {
        await supabase
          .from('inventory')
          .update({ quantity: invData.quantity + item.quantity })
          .eq('ingredient_id', item.ingredient_id);
      }

      // Aggiorna anche il costo dell'ingrediente (costo unitario = costo totale / quantità)
      const unitCost = item.quantity > 0 ? item.unit_cost / item.quantity : item.unit_cost;
      await supabase
        .from('ingredients')
        .update({ cost: unitCost })
        .eq('id', item.ingredient_id);
    }

    return supplyData;
  }

  // Modalità locale
  const supplies = getLocalData<Supply[]>('supplies', []);
  const supplyItemsList = getLocalData<SupplyItem[]>('supply_items', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);

  const newSupply: Supply = {
    ...supply,
    id: Date.now(),
    total_cost: totalCost,
    created_at: new Date().toISOString(),
  };

  // Aggiungi la fornitura
  supplies.push(newSupply);
  setLocalData('supplies', supplies);

  // Aggiungi gli item della fornitura
  const newItems = items.map((item, index) => ({
    ...item,
    id: Date.now() + index + 1,
    supply_id: newSupply.id,
  }));
  setLocalData('supply_items', [...supplyItemsList, ...newItems]);

  // Aggiorna l'inventario e i costi ingredienti
  for (const item of items) {
    // Aggiorna quantità inventario
    const invIndex = inventory.findIndex(i => i.ingredient_id === item.ingredient_id);
    if (invIndex !== -1) {
      inventory[invIndex].quantity += item.quantity;
    }

    // Aggiorna costo ingrediente (costo unitario = costo totale / quantità)
    const ingIndex = ingredients.findIndex(i => i.id === item.ingredient_id);
    if (ingIndex !== -1) {
      const unitCost = item.quantity > 0 ? item.unit_cost / item.quantity : item.unit_cost;
      ingredients[ingIndex].cost = unitCost;
    }
  }
  setLocalData('inventory', inventory);
  setLocalData('ingredients', ingredients);

  return newSupply;
}

export async function deleteSupply(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Prima elimina gli items
    await supabase.from('supply_items').delete().eq('supply_id', id);
    // Poi elimina la fornitura
    const { error } = await supabase.from('supplies').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const supplies = getLocalData<Supply[]>('supplies', []);
  const supplyItems = getLocalData<SupplyItem[]>('supply_items', []);

  setLocalData('supplies', supplies.filter(s => s.id !== id));
  setLocalData('supply_items', supplyItems.filter(si => si.supply_id !== id));
}

// Statistiche forniture
export async function getSupplyStats(startDate?: string, endDate?: string): Promise<{
  totalSpent: number;
  suppliesCount: number;
  avgSupplyCost: number;
  topIngredients: { ingredient_name: string; quantity: number; total_cost: number }[];
}> {
  const supplies = await getSupplies(startDate, endDate);
  const totalSpent = supplies.reduce((sum, s) => sum + s.total_cost, 0);
  const suppliesCount = supplies.length;
  const avgSupplyCost = suppliesCount > 0 ? totalSpent / suppliesCount : 0;

  // Calcola top ingredienti acquistati
  const ingredientStats: Record<number, { ingredient_name: string; quantity: number; total_cost: number }> = {};

  for (const supply of supplies) {
    const items = await getSupplyItems(supply.id);
    for (const item of items) {
      if (!ingredientStats[item.ingredient_id]) {
        ingredientStats[item.ingredient_id] = {
          ingredient_name: item.ingredient_name || 'Sconosciuto',
          quantity: 0,
          total_cost: 0,
        };
      }
      ingredientStats[item.ingredient_id].quantity += item.quantity;
      ingredientStats[item.ingredient_id].total_cost += item.quantity * item.unit_cost;
    }
  }

  const topIngredients = Object.values(ingredientStats)
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 5);

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    suppliesCount,
    avgSupplyCost: Math.round(avgSupplyCost * 100) / 100,
    topIngredients,
  };
}

// ============== CHIUSURA CASSA ==============
export async function getDailyCashSummary(date: string): Promise<{
  total_orders: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  online_revenue: number;
  smac_total: number;
  non_smac_total: number;
  orders_by_type: { dine_in: number; takeaway: number; delivery: number };
  orders_by_status: Record<string, number>;
}> {
  const orders = await getOrders(date);
  const completedOrders = orders.filter(o => o.status !== 'cancelled');

  const cash_revenue = completedOrders
    .filter(o => o.payment_method === 'cash')
    .reduce((sum, o) => sum + o.total, 0);

  const card_revenue = completedOrders
    .filter(o => o.payment_method === 'card')
    .reduce((sum, o) => sum + o.total, 0);

  const online_revenue = completedOrders
    .filter(o => o.payment_method === 'online')
    .reduce((sum, o) => sum + o.total, 0);

  const smac_total = completedOrders
    .filter(o => o.smac_passed)
    .reduce((sum, o) => sum + o.total, 0);

  const non_smac_total = completedOrders
    .filter(o => !o.smac_passed)
    .reduce((sum, o) => sum + o.total, 0);

  const orders_by_type = {
    dine_in: completedOrders.filter(o => o.order_type === 'dine_in').length,
    takeaway: completedOrders.filter(o => o.order_type === 'takeaway').length,
    delivery: completedOrders.filter(o => o.order_type === 'delivery').length,
  };

  const orders_by_status: Record<string, number> = {};
  for (const order of orders) {
    orders_by_status[order.status] = (orders_by_status[order.status] || 0) + 1;
  }

  return {
    total_orders: completedOrders.length,
    total_revenue: Math.round((cash_revenue + card_revenue + online_revenue) * 100) / 100,
    cash_revenue: Math.round(cash_revenue * 100) / 100,
    card_revenue: Math.round(card_revenue * 100) / 100,
    online_revenue: Math.round(online_revenue * 100) / 100,
    smac_total: Math.round(smac_total * 100) / 100,
    non_smac_total: Math.round(non_smac_total * 100) / 100,
    orders_by_type,
    orders_by_status,
  };
}

export async function getCashClosures(): Promise<CashClosure[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('cash_closures')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      console.warn('Error fetching cash closures:', error);
      return [];
    }
    return data || [];
  }
  return getLocalData<CashClosure[]>('cash_closures', []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function saveCashClosure(closure: Omit<CashClosure, 'id' | 'created_at'>): Promise<CashClosure> {
  const newClosure: CashClosure = {
    ...closure,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('cash_closures')
      .insert(newClosure)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const closures = getLocalData<CashClosure[]>('cash_closures', []);
  closures.push(newClosure);
  setLocalData('cash_closures', closures);
  return newClosure;
}

export async function generateReceipt(orderId: number): Promise<Receipt | null> {
  const orders = await getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  const orderItems = await getOrderItems(orderId);
  const settings = await getSettings();

  const subtotal = order.total / (1 + settings.iva_rate / 100);
  const iva_amount = order.total - subtotal;

  const receipt: Receipt = {
    id: Date.now(),
    order_id: orderId,
    receipt_number: `R-${order.date.replace(/-/g, '')}-${orderId}`,
    date: order.date,
    time: new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    items: orderItems.map(item => ({
      name: item.menu_item_name || 'Prodotto',
      quantity: item.quantity,
      unit_price: item.price,
      total: item.quantity * item.price,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    iva_rate: settings.iva_rate,
    iva_amount: Math.round(iva_amount * 100) / 100,
    total: order.total,
    payment_method: order.payment_method,
    smac_passed: order.smac_passed,
    shop_info: {
      name: settings.shop_name,
      address: settings.address,
      phone: settings.phone,
    },
  };

  return receipt;
}

// ============== COSTO PIATTO DINAMICO ==============
export async function calculateDishCost(menuItemId: number): Promise<DishCost | null> {
  const menuItems = await getMenuItems();
  const menuItem = menuItems.find(m => m.id === menuItemId);
  if (!menuItem) return null;

  const recipe = await getMenuItemIngredients(menuItemId);
  const ingredients = await getIngredients();

  let totalIngredientCost = 0;
  const ingredientCosts: DishIngredientCost[] = [];

  for (const recipeItem of recipe) {
    const ingredient = ingredients.find(i => i.id === recipeItem.ingredient_id);
    if (ingredient) {
      const itemCost = recipeItem.quantity * ingredient.cost;
      totalIngredientCost += itemCost;

      ingredientCosts.push({
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        quantity: recipeItem.quantity,
        unit: ingredient.unit,
        unit_cost: ingredient.cost,
        total_cost: Math.round(itemCost * 100) / 100,
      });
    }
  }

  const profitMargin = menuItem.price - totalIngredientCost;
  const profitMarginPercent = menuItem.price > 0
    ? (profitMargin / menuItem.price) * 100
    : 0;

  return {
    menu_item_id: menuItem.id,
    menu_item_name: menuItem.name,
    selling_price: menuItem.price,
    ingredient_cost: Math.round(totalIngredientCost * 100) / 100,
    profit_margin: Math.round(profitMargin * 100) / 100,
    profit_margin_percent: Math.round(profitMarginPercent * 10) / 10,
    ingredients: ingredientCosts,
  };
}

export async function calculateAllDishCosts(): Promise<DishCost[]> {
  const menuItems = await getMenuItems();
  const costs: DishCost[] = [];

  for (const menuItem of menuItems) {
    const cost = await calculateDishCost(menuItem.id);
    if (cost) {
      costs.push(cost);
    }
  }

  return costs.sort((a, b) => b.profit_margin_percent - a.profit_margin_percent);
}

export async function getDishCostSummary(): Promise<{
  totalDishes: number;
  avgProfitMargin: number;
  highMarginDishes: DishCost[];
  lowMarginDishes: DishCost[];
  dishesWithoutRecipe: MenuItem[];
}> {
  const menuItems = await getMenuItems();
  const allCosts = await calculateAllDishCosts();

  const dishesWithRecipe = allCosts.filter(c => c.ingredients.length > 0);
  const dishesWithoutRecipe = menuItems.filter(
    m => !allCosts.find(c => c.menu_item_id === m.id && c.ingredients.length > 0)
  );

  const avgProfitMargin = dishesWithRecipe.length > 0
    ? dishesWithRecipe.reduce((sum, d) => sum + d.profit_margin_percent, 0) / dishesWithRecipe.length
    : 0;

  const highMarginDishes = dishesWithRecipe
    .filter(d => d.profit_margin_percent >= 60)
    .slice(0, 5);

  const lowMarginDishes = dishesWithRecipe
    .filter(d => d.profit_margin_percent < 40)
    .slice(0, 5);

  return {
    totalDishes: menuItems.length,
    avgProfitMargin: Math.round(avgProfitMargin * 10) / 10,
    highMarginDishes,
    lowMarginDishes,
    dishesWithoutRecipe,
  };
}

// ============== FATTURE ==============
// Nota: le fatture usano localStorage per ora (la tabella Supabase può essere aggiunta in seguito)

function getInvoicesFromLocal(startDate?: string, endDate?: string): Invoice[] {
  let invoices = getLocalData<Invoice[]>('invoices', []);
  if (startDate) invoices = invoices.filter(i => i.date >= startDate);
  if (endDate) invoices = invoices.filter(i => i.date <= endDate);
  return invoices.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getInvoices(startDate?: string, endDate?: string): Promise<Invoice[]> {
  // Usa sempre localStorage per le fatture (tabella Supabase opzionale)
  return getInvoicesFromLocal(startDate, endDate);
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice> {
  const invoices = getLocalData<Invoice[]>('invoices', []);
  const newInvoice: Invoice = {
    ...invoice,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };
  setLocalData('invoices', [...invoices, newInvoice]);
  return newInvoice;
}

export async function updateInvoice(id: number, updates: Partial<Omit<Invoice, 'id' | 'created_at'>>): Promise<void> {
  const invoices = getLocalData<Invoice[]>('invoices', []);
  const index = invoices.findIndex(i => i.id === id);
  if (index !== -1) {
    invoices[index] = { ...invoices[index], ...updates };
    setLocalData('invoices', invoices);
  }
}

export async function deleteInvoice(id: number): Promise<void> {
  const invoices = getLocalData<Invoice[]>('invoices', []);
  setLocalData('invoices', invoices.filter(i => i.id !== id));
}

// ============== STATS PER PERIODO ==============
export async function getStatsForPeriod(startDate: string, endDate: string): Promise<{
  dailyStats: { date: string; orders: number; revenue: number }[];
  revenueByPaymentMethod: { method: string; total: number }[];
  ordersByType: { type: string; count: number }[];
}> {
  const orders = await getOrders();
  const periodOrders = orders.filter(
    o => o.date >= startDate && o.date <= endDate && o.status !== 'cancelled'
  );

  // Daily stats
  const dailyMap: Record<string, { orders: number; revenue: number }> = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dailyMap[dateStr] = { orders: 0, revenue: 0 };
  }

  for (const order of periodOrders) {
    if (dailyMap[order.date]) {
      dailyMap[order.date].orders++;
      dailyMap[order.date].revenue += order.total;
    }
  }

  const dailyStats = Object.entries(dailyMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Revenue by payment method
  const paymentMap: Record<string, number> = { cash: 0, card: 0, online: 0 };
  for (const order of periodOrders) {
    paymentMap[order.payment_method] = (paymentMap[order.payment_method] || 0) + order.total;
  }
  const revenueByPaymentMethod = Object.entries(paymentMap).map(([method, total]) => ({ method, total }));

  // Orders by type
  const typeMap: Record<string, number> = { dine_in: 0, takeaway: 0, delivery: 0 };
  for (const order of periodOrders) {
    typeMap[order.order_type] = (typeMap[order.order_type] || 0) + 1;
  }
  const ordersByType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

  return { dailyStats, revenueByPaymentMethod, ordersByType };
}

// ============== SESSIONI TAVOLO (CONTO APERTO) ==============

export async function createTableSession(
  tableId: number,
  covers: number = 1,
  customerName?: string,
  customerPhone?: string
): Promise<TableSession> {
  const tables = await getTables();
  const table = tables.find(t => t.id === tableId);

  const newSession: TableSession = {
    id: Date.now(),
    table_id: tableId,
    table_name: table?.name,
    opened_at: new Date().toISOString(),
    status: 'open',
    total: 0,
    covers,
    customer_name: customerName,
    customer_phone: customerPhone,
    smac_passed: false,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .insert({
        table_id: tableId,
        covers,
        customer_name: customerName,
        customer_phone: customerPhone,
        status: 'open',
        total: 0,
        smac_passed: false,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...data, table_name: table?.name };
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  sessions.push(newSession);
  setLocalData('table_sessions', sessions);
  return newSession;
}

export async function getTableSession(sessionId: number): Promise<TableSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .select('*, tables(name)')
      .eq('id', sessionId)
      .single();
    if (error) return null;
    return { ...data, table_name: data.tables?.name };
  }
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const tables = getLocalData<Table[]>('tables', []);
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    return { ...session, table_name: tables.find(t => t.id === session.table_id)?.name };
  }
  return null;
}

export async function getActiveSessionForTable(tableId: number): Promise<TableSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .select('*, tables(name)')
      .eq('table_id', tableId)
      .eq('status', 'open')
      .single();
    if (error) return null;
    return { ...data, table_name: data.tables?.name };
  }
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const tables = getLocalData<Table[]>('tables', []);
  const session = sessions.find(s => s.table_id === tableId && s.status === 'open');
  if (session) {
    return { ...session, table_name: tables.find(t => t.id === session.table_id)?.name };
  }
  return null;
}

export async function getActiveSessions(): Promise<TableSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .select('*, tables(name)')
      .eq('status', 'open')
      .order('opened_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(s => ({ ...s, table_name: s.tables?.name }));
  }
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const tables = getLocalData<Table[]>('tables', []);
  return sessions
    .filter(s => s.status === 'open')
    .map(s => ({ ...s, table_name: tables.find(t => t.id === s.table_id)?.name }))
    .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
}

export async function getSessionOrders(sessionId: number): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, tables(name)')
      .eq('session_id', sessionId)
      .order('order_number', { ascending: true });
    if (error) throw error;
    return (data || []).map(o => ({ ...o, table_name: o.tables?.name }));
  }
  const orders = getLocalData<Order[]>('orders', []);
  const tables = getLocalData<Table[]>('tables', []);
  return orders
    .filter(o => o.session_id === sessionId)
    .map(o => ({ ...o, table_name: tables.find(t => t.id === o.table_id)?.name }))
    .sort((a, b) => (a.order_number || 1) - (b.order_number || 1));
}

export async function updateSessionTotal(sessionId: number): Promise<void> {
  const orders = await getSessionOrders(sessionId);
  const total = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('table_sessions')
      .update({ total })
      .eq('id', sessionId);
    return;
  }
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index].total = total;
    setLocalData('table_sessions', sessions);
  }
}

export async function closeTableSession(
  sessionId: number,
  paymentMethod: 'cash' | 'card' | 'online' | 'split',
  smacPassed: boolean
): Promise<TableSession> {
  // Aggiorna totale prima di chiudere
  await updateSessionTotal(sessionId);

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        smac_passed: smacPassed,
        closed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = {
      ...sessions[index],
      status: 'paid',
      payment_method: paymentMethod,
      smac_passed: smacPassed,
      closed_at: new Date().toISOString(),
    };
    setLocalData('table_sessions', sessions);
    return sessions[index];
  }
  throw new Error('Sessione non trovata');
}

export async function transferTableSession(sessionId: number, newTableId: number): Promise<TableSession> {
  const tables = await getTables();
  const newTable = tables.find(t => t.id === newTableId);

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .update({ table_id: newTableId })
      .eq('id', sessionId)
      .select()
      .single();
    if (error) throw error;
    return { ...data, table_name: newTable?.name };
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index].table_id = newTableId;
    sessions[index].table_name = newTable?.name;
    setLocalData('table_sessions', sessions);
    return sessions[index];
  }
  throw new Error('Sessione non trovata');
}

// Calcola il prossimo numero di comanda per una sessione
export async function getNextOrderNumber(sessionId: number): Promise<number> {
  const orders = await getSessionOrders(sessionId);
  if (orders.length === 0) return 1;
  const maxOrderNumber = Math.max(...orders.map(o => o.order_number || 1));
  return maxOrderNumber + 1;
}

// ============== PAGAMENTI SESSIONE (SPLIT BILL) ==============

export async function addSessionPayment(
  sessionId: number,
  amount: number,
  paymentMethod: 'cash' | 'card' | 'online',
  notes?: string
): Promise<SessionPayment> {
  const newPayment: SessionPayment = {
    id: Date.now(),
    session_id: sessionId,
    amount,
    payment_method: paymentMethod,
    paid_at: new Date().toISOString(),
    notes,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('session_payments')
      .insert({
        session_id: sessionId,
        amount,
        payment_method: paymentMethod,
        notes,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  payments.push(newPayment);
  setLocalData('session_payments', payments);
  return newPayment;
}

export async function getSessionPayments(sessionId: number): Promise<SessionPayment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('session_payments')
      .select('*')
      .eq('session_id', sessionId)
      .order('paid_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  return payments
    .filter(p => p.session_id === sessionId)
    .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
}

export async function getSessionRemainingAmount(sessionId: number): Promise<number> {
  const session = await getTableSession(sessionId);
  if (!session) return 0;

  const payments = await getSessionPayments(sessionId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return Math.max(0, session.total - totalPaid);
}

export async function deleteSessionPayment(paymentId: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('session_payments')
      .delete()
      .eq('id', paymentId);
    if (error) throw error;
    return;
  }
  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  setLocalData('session_payments', payments.filter(p => p.id !== paymentId));
}
