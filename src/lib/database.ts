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
  SessionPaymentItem,
  InventorySettings,
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
  if (index === -1) {
    throw new Error('Categoria non trovata');
  }
  categories[index] = { ...categories[index], ...category };
  setLocalData('categories', categories);
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
  if (index === -1) {
    throw new Error('Prodotto non trovato');
  }
  items[index] = { ...items[index], ...item };
  setLocalData('menu_items', items);
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

// Ottieni ordini per range di date
export async function getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, tables(name), table_sessions(status)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(order => ({
      ...order,
      table_name: order.tables?.name,
      session_status: order.table_sessions?.status,
    }));
  }
  const orders = getLocalData<Order[]>('orders', []);
  const tables = getLocalData<Table[]>('tables', []);
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  return orders
    .filter(o => o.date >= startDate && o.date <= endDate)
    .map(order => ({
      ...order,
      table_name: tables.find(t => t.id === order.table_id)?.name,
      session_status: order.session_id ? sessions.find(s => s.id === order.session_id)?.status : undefined,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Aggiorna stato di più ordini in massa
export async function updateOrderStatusBulk(orderIds: number[], status: Order['status'], updatedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const updateData: { status: Order['status']; updated_by?: string } = { status };
    if (updatedBy) updateData.updated_by = updatedBy;
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .in('id', orderIds);
    if (error) throw error;
    return;
  }
  const orders = getLocalData<Order[]>('orders', []);
  const updatedOrders = orders.map(order =>
    orderIds.includes(order.id) ? { ...order, status, updated_by: updatedBy } : order
  );
  setLocalData('orders', updatedOrders);
}

// Elimina più ordini in massa
export async function deleteOrdersBulk(orderIds: number[], deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Prima aggiorna updated_by per tracciare chi ha eliminato
    if (deletedBy) {
      await supabase.from('orders').update({ updated_by: deletedBy }).in('id', orderIds);
    }
    // Elimina gli order_items
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds);
    if (itemsError) throw itemsError;

    // Poi elimina gli ordini
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds);
    if (error) throw error;
    return;
  }
  const orders = getLocalData<Order[]>('orders', []);
  const orderItems = getLocalData<OrderItem[]>('order_items', []);
  setLocalData('orders', orders.filter(o => !orderIds.includes(o.id)));
  setLocalData('order_items', orderItems.filter(i => !orderIds.includes(i.order_id)));
  // Notify UI listeners (local mode)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
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

    // Remove any placeholder orders created for this session (supabase)
    try {
      if (orderData.session_id) {
        await supabase.from('orders').delete().match({ session_id: orderData.session_id, created_by: 'session-placeholder' });
      }
    } catch (err) {
      console.error('Error removing placeholder orders (supabase):', err);
    }

    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }

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

  // Remove any placeholder orders for this session (local mode)
  let cleanedOrders = orders;
  if (newOrder.session_id) {
    cleanedOrders = orders.filter(o => !(o.session_id === newOrder.session_id && o.created_by === 'session-placeholder'));
  }
  setLocalData('orders', [...cleanedOrders, newOrder]);
  setLocalData('order_items', [...orderItems, ...newItems]);

  // Scala automaticamente l'inventario
  await consumeIngredientsForOrderInternal(items, newOrder.id);

  // Notify UI listeners (local mode)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }

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

export async function updateOrderStatus(id: number, status: Order['status'], updatedBy?: string): Promise<Order> {
  if (isSupabaseConfigured && supabase) {
    const updateData: { status: Order['status']; updated_by?: string } = { status };
    if (updatedBy) updateData.updated_by = updatedBy;
    const { data, error } = await supabase.from('orders').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }
    return data;
  }
  const orders = getLocalData<Order[]>('orders', []);
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index] = { ...orders[index], status, updated_by: updatedBy };
    setLocalData('orders', orders);
  }
  // Notify UI listeners (local mode)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
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

    // Se ci sono nuovi items, gestisci l'inventario e sostituisci
    if (newItems) {
      // Ottieni i vecchi items per ripristinare l'inventario
      const { data: oldItems } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity')
        .eq('order_id', id);

      // Ripristina l'inventario dei vecchi items
      if (oldItems && oldItems.length > 0) {
        await restoreIngredientsForItems(oldItems, id);
      }

      // Elimina i vecchi items
      await supabase.from('order_items').delete().eq('order_id', id);

      // Inserisci i nuovi items
      const orderItems = newItems.map(item => ({ ...item, order_id: id }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Scala l'inventario per i nuovi items
      await consumeIngredientsForOrder(
        newItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
        id
      );
    }

    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
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

      // Ottieni i vecchi items per ripristinare l'inventario
      const oldItems = orderItems.filter(i => i.order_id === id);
      if (oldItems.length > 0) {
        await restoreIngredientsForItems(
          oldItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
          id
        );
      }

      // Rimuovi vecchi items
      const filteredItems = orderItems.filter(i => i.order_id !== id);
      // Aggiungi nuovi items
      const newOrderItems = newItems.map((item, idx) => ({
        ...item,
        id: Date.now() + idx + 1,
        order_id: id,
      }));
      setLocalData('order_items', [...filteredItems, ...newOrderItems]);

      // Scala l'inventario per i nuovi items
      await consumeIngredientsForOrderInternal(
        newItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
        id
      );
    }

    // Notify UI listeners (local mode)
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }
    return orders[index];
  }

  throw new Error('Ordine non trovato');
}

export async function deleteOrder(id: number, deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Get order to find session id
    const { data: orderData, error: orderErr } = await supabase.from('orders').select('id, session_id').eq('id', id).single();
    if (orderErr && orderErr.code !== 'PGRST116') throw orderErr;
    const sessionId = orderData?.session_id as number | undefined;

    // Prima ottieni tutti gli items per ripristinare l'inventario
    const { data: items } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity')
      .eq('order_id', id);

    // Ripristina inventario prima di eliminare
    if (items && items.length > 0) {
      await restoreIngredientsForItems(items, id);
    }

    // Prima aggiorna updated_by per tracciare chi ha eliminato (sarà visibile in payload.old)
    if (deletedBy) {
      await supabase.from('orders').update({ updated_by: deletedBy }).eq('id', id);
    }
    await supabase.from('order_items').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;

    // If the order belonged to a session, decide whether to delete the session.
    // We should NOT delete the session if the only remaining orders are placeholder orders
    // created when opening the session (created_by = 'session-placeholder').
    if (sessionId) {
      const { data: remaining } = await supabase.from('orders').select('id, created_by').eq('session_id', sessionId);
      const nonPlaceholder = (remaining || []).filter((r: any) => r.created_by !== 'session-placeholder');
      if (!remaining || nonPlaceholder.length === 0) {
        // If there are no non-placeholder orders left, keep the session (do not auto-delete)
        // but update its total so UI remains consistent.
        await updateSessionTotal(sessionId, true);
      } else {
        // There are real orders remaining: just recalc the session total.
        await updateSessionTotal(sessionId, true);
      }
    }

    // Notify UI listeners (supabase)
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }

    return;
  }

  // LocalStorage mode
  const orders = getLocalData<Order[]>('orders', []);
  const orderItems = getLocalData<OrderItem[]>('order_items', []);

  // LocalStorage mode
  const order = orders.find(o => o.id === id);
  const sessionId = order?.session_id;

  // Ripristina inventario prima di eliminare
  const itemsToRestore = orderItems.filter(i => i.order_id === id);
  if (itemsToRestore.length > 0) {
    await restoreIngredientsForItems(
      itemsToRestore.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
      id
    );
  }

  const remainingOrders = orders.filter(o => o.id !== id);
  const remainingOrderItems = orderItems.filter(i => i.order_id !== id);

  // Save
  setLocalData('orders', remainingOrders);
  setLocalData('order_items', remainingOrderItems);

  // If the order belonged to a session, check if other non-placeholder orders remain.
  // Do NOT auto-delete the session when the only remaining orders are placeholders.
  if (sessionId) {
    const still = remainingOrders.filter(o => o.session_id === sessionId);
    const nonPlaceholder = still.filter(o => o.created_by !== 'session-placeholder');
    if (nonPlaceholder.length === 0) {
      // No real orders remain; keep the session and recalculate total (may remain 0).
      await updateSessionTotal(sessionId, true);
    } else {
      // There are real orders remaining: recalc as usual.
      await updateSessionTotal(sessionId, true);
    }
  }
  // Notify UI listeners (local mode)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
}

// Ottieni l'ordine singolo di una sessione (per aggiungere comande)
export async function getSessionOrder(sessionId: number): Promise<Order | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, tables(name)')
      .eq('session_id', sessionId)
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data ? { ...data, table_name: data.tables?.name } : null;
  }
  const orders = getLocalData<Order[]>('orders', []);
  const tables = getLocalData<Table[]>('tables', []);
  const order = orders.find(o => o.session_id === sessionId);
  if (!order) return null;
  return { ...order, table_name: tables.find(t => t.id === order.table_id)?.name };
}

// Aggiungi items a un ordine esistente (per comande aggiuntive in sessione)
export async function addItemsToOrder(
  orderId: number,
  items: Omit<OrderItem, 'id' | 'order_id'>[],
  additionalTotal: number
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Aggiungi items
    const orderItems = items.map(item => ({ ...item, order_id: orderId }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // Aggiorna totale ordine
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .single();

    if (currentOrder) {
      await supabase
        .from('orders')
        .update({ total: currentOrder.total + additionalTotal })
        .eq('id', orderId);
    }

    // Scala inventario
    await consumeIngredientsForOrderInternal(items, orderId);
    return;
  }

  // LocalStorage
  const orders = getLocalData<Order[]>('orders', []);
  const orderItems = getLocalData<OrderItem[]>('order_items', []);

  // Aggiungi items
  const newItems = items.map((item, index) => ({
    ...item,
    id: Date.now() + index + 1,
    order_id: orderId,
  }));
  setLocalData('order_items', [...orderItems, ...newItems]);

  // Aggiorna totale ordine
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].total += additionalTotal;
    setLocalData('orders', orders);
  }

  // Scala inventario
  await consumeIngredientsForOrderInternal(items, orderId);
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

export async function updateOrderItem(itemId: number, updates: { quantity?: number; notes?: string }): Promise<OrderItem> {
  if (isSupabaseConfigured && supabase) {
    // Prima ottieni l'item corrente per calcolare il delta
    const { data: oldItem } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity, order_id')
      .eq('id', itemId)
      .single();

    // Se cambia la quantità, aggiorna l'inventario
    if (oldItem && updates.quantity !== undefined && updates.quantity !== oldItem.quantity) {
      const delta = updates.quantity - oldItem.quantity;
      if (delta > 0) {
        // Quantità aumentata: scala inventario per il delta
        await consumeIngredientsForOrder(
          [{ menu_item_id: oldItem.menu_item_id, quantity: delta }],
          oldItem.order_id
        );
      } else if (delta < 0) {
        // Quantità diminuita: ripristina inventario per il delta
        await restoreIngredientsForItems(
          [{ menu_item_id: oldItem.menu_item_id, quantity: Math.abs(delta) }],
          oldItem.order_id
        );
      }
    }

    const { data, error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', itemId)
      .select('*, menu_items(name)')
      .single();
    if (error) throw error;
    return { ...data, menu_item_name: data.menu_items?.name };
  }

  // LocalStorage mode
  const orderItems = getLocalData<OrderItem[]>('order_items', []);
  const menuItems = getLocalData<MenuItem[]>('menu_items', []);
  const index = orderItems.findIndex(i => i.id === itemId);
  if (index === -1) throw new Error('Item not found');

  const oldItem = orderItems[index];

  // Se cambia la quantità, aggiorna l'inventario
  if (updates.quantity !== undefined && updates.quantity !== oldItem.quantity) {
    const delta = updates.quantity - oldItem.quantity;
    if (delta > 0) {
      // Quantità aumentata: scala inventario per il delta
      await consumeIngredientsForOrderInternal(
        [{ menu_item_id: oldItem.menu_item_id, quantity: delta }],
        oldItem.order_id
      );
    } else if (delta < 0) {
      // Quantità diminuita: ripristina inventario per il delta
      await restoreIngredientsForItems(
        [{ menu_item_id: oldItem.menu_item_id, quantity: Math.abs(delta) }],
        oldItem.order_id
      );
    }
  }

  orderItems[index] = { ...orderItems[index], ...updates };
  setLocalData('order_items', orderItems);
  return { ...orderItems[index], menu_item_name: menuItems.find(m => m.id === orderItems[index].menu_item_id)?.name };
}

export async function deleteOrderItem(itemId: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Prima ottieni l'item per ripristinare l'inventario
    const { data: item } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity, order_id')
      .eq('id', itemId)
      .single();

    // Ripristina inventario prima di eliminare
    if (item) {
      await restoreIngredientsForItems(
        [{ menu_item_id: item.menu_item_id, quantity: item.quantity }],
        item.order_id
      );
    }

    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
    return;
  }

  // LocalStorage mode
  const orderItems = getLocalData<OrderItem[]>('order_items', []);
  const item = orderItems.find(i => i.id === itemId);

  // Ripristina inventario prima di eliminare
  if (item) {
    await restoreIngredientsForItems(
      [{ menu_item_id: item.menu_item_id, quantity: item.quantity }],
      item.order_id
    );
  }

  setLocalData('order_items', orderItems.filter(i => i.id !== itemId));
}

// Ricalcola e aggiorna il totale dell'ordine basato sugli items
export async function recalculateOrderTotal(orderId: number): Promise<number> {
  const items = await getOrderItems(orderId);
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('orders')
      .update({ total })
      .eq('id', orderId);
  } else {
    const orders = getLocalData<Order[]>('orders', []);
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index].total = total;
      setLocalData('orders', orders);
    }
  }

  return total;
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
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('tables-updated'));
      }
    } catch (e) {
      // ignore
    }
    return data;
  }
  const tables = getLocalData<Table[]>('tables', []);
  const newTable = { ...table, id: Date.now() };
  setLocalData('tables', [...tables, newTable]);
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('tables-updated'));
    }
  } catch (e) {
    // ignore
  }
  return newTable;
}

export async function updateTable(id: number, table: Partial<Table>): Promise<Table> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('tables').update(table).eq('id', id).select().single();
    if (error) throw error;
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('tables-updated'));
      }
    } catch (e) {
      // ignore
    }
    return data;
  }
  const tables = getLocalData<Table[]>('tables', []);
  const index = tables.findIndex(t => t.id === id);
  if (index !== -1) {
    tables[index] = { ...tables[index], ...table };
    setLocalData('tables', tables);
  }
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('tables-updated'));
    }
  } catch (e) {
    // ignore
  }
  return tables[index];
}

export async function deleteTable(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw error;
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('tables-updated'));
      }
    } catch (e) {
      // ignore
    }
    return;
  }
  const tables = getLocalData<Table[]>('tables', []);
  setLocalData('tables', tables.filter(t => t.id !== id));
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('tables-updated'));
    }
  } catch (e) {
    // ignore
  }
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
  return inventory.filter(item => {
    // Usa la soglia appropriata in base alla modalità
    const effectiveThreshold = item.threshold_mode === 'eoq' && item.eoq_threshold != null
      ? item.eoq_threshold
      : item.threshold;
    return item.quantity <= effectiveThreshold;
  });
}

// Aggiorna la modalità soglia per un ingrediente (manuale o EOQ)
export async function updateInventoryThresholdMode(
  ingredientId: number,
  mode: 'manual' | 'eoq',
  eoqThreshold?: number
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const updateData: { threshold_mode: string; eoq_threshold?: number } = { threshold_mode: mode };
    if (eoqThreshold != null) updateData.eoq_threshold = eoqThreshold;

    const { error } = await supabase
      .from('inventory')
      .update(updateData)
      .eq('ingredient_id', ingredientId);
    if (error) throw error;
    return;
  }

  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const index = inventory.findIndex(i => i.ingredient_id === ingredientId);
  if (index !== -1) {
    inventory[index].threshold_mode = mode;
    if (eoqThreshold != null) inventory[index].eoq_threshold = eoqThreshold;
    setLocalData('inventory', inventory);
  }
}

// Aggiorna la soglia manuale per un ingrediente
export async function updateInventoryThreshold(ingredientId: number, threshold: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('inventory')
      .update({ threshold })
      .eq('ingredient_id', ingredientId);
    if (error) throw error;
    return;
  }

  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const index = inventory.findIndex(i => i.ingredient_id === ingredientId);
  if (index !== -1) {
    inventory[index].threshold = threshold;
    setLocalData('inventory', inventory);
  }
}

export async function createIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
  // Ottieni la soglia di default dalle impostazioni
  const settings = await getSettings();
  const defaultThreshold = settings?.default_threshold ?? 10;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('ingredients').insert(ingredient).select().single();
    if (error) throw error;

    // Also create inventory entry with default threshold from settings
    await supabase.from('inventory').insert({ ingredient_id: data.id, quantity: 0, threshold: defaultThreshold });

    return data;
  }
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const newIngredient = { ...ingredient, id: Date.now() };
  setLocalData('ingredients', [...ingredients, newIngredient]);
  setLocalData('inventory', [...inventory, { id: Date.now() + 1, ingredient_id: newIngredient.id, quantity: 0, threshold: defaultThreshold }]);
  return newIngredient;
}

export async function updateIngredientCost(ingredientId: number, cost: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('ingredients')
      .update({ cost })
      .eq('id', ingredientId);
    if (error) throw error;
    return;
  }
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  const index = ingredients.findIndex(i => i.id === ingredientId);
  if (index !== -1) {
    ingredients[index] = { ...ingredients[index], cost };
    setLocalData('ingredients', ingredients);
  }
}

export async function deleteIngredient(ingredientId: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', ingredientId);
    if (error) throw error;
    // Rimuovi anche da inventory
    await supabase.from('inventory').delete().eq('ingredient_id', ingredientId);
    return;
  }
  // LocalStorage fallback
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  setLocalData('ingredients', ingredients.filter(i => i.id !== ingredientId));
  setLocalData('inventory', inventory.filter(i => i.ingredient_id !== ingredientId));
}

export async function updateInventoryQuantity(ingredientId: number, quantity: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('inventory')
      .update({ quantity })
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
    // Prima ottieni tutte le prenotazioni
    let query = supabase.from('reservations').select('*').order('date').order('time');
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;

    // Poi ottieni tutti i tavoli per costruire i nomi
    const { data: tablesData } = await supabase.from('tables').select('id, name');
    const tables = tablesData || [];

    return (data || []).map(res => {
      // Supporto multi-tavoli
      const tableIds = res.table_ids && res.table_ids.length > 0 ? res.table_ids : [res.table_id];
      const tableNames = tableIds.map((id: number) => tables.find(t => t.id === id)?.name || '').filter(Boolean);
      return {
        ...res,
        table_ids: tableIds,
        table_name: tableNames.join(' + ') || tables.find(t => t.id === res.table_id)?.name,
        table_names: tableNames,
      };
    });
  }
  let reservations = getLocalData<Reservation[]>('reservations', []);
  if (date) reservations = reservations.filter(r => r.date === date);
  const tables = getLocalData<Table[]>('tables', []);
  const result = reservations.map(res => {
    // Supporto multi-tavoli - assicura che table_ids sia sempre un array valido
    const tableIds = res.table_ids && res.table_ids.length > 0 ? res.table_ids : [res.table_id];
    const tableNames = tableIds.map(id => tables.find(t => t.id === id)?.name || '').filter(Boolean);
    return {
      ...res,
      table_ids: tableIds, // Assicura che table_ids sia sempre presente nel risultato
      table_name: tableNames.join(' + ') || tables.find(t => t.id === res.table_id)?.name,
      table_names: tableNames,
    };
  });
  return result;
}

export async function createReservation(reservation: Omit<Reservation, 'id'>, options?: { force?: boolean }): Promise<Reservation> {
  // Prima valida conflitti: non permettere prenotazioni per gli stessi tavoli
  // entro +/- 2.5 ore (150 minuti) dalla prenotazione esistente
  const conflictWindowMinutes = 150;
  const targetDate = reservation.date;
  // Carica prenotazioni esistenti per la stessa data
  const existing = await getReservations(targetDate);

  const newTableIds = reservation.table_ids && reservation.table_ids.length > 0 ? reservation.table_ids : [reservation.table_id];
  const parseTime = (t?: string) => {
    if (!t) return null;
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + (mm || 0);
  };
  const newTime = parseTime(reservation.time);
  const conflicts: Reservation[] = [];
  if (newTime !== null) {
    for (const ex of existing) {
      const exTableIds = ex.table_ids && ex.table_ids.length > 0 ? ex.table_ids : [ex.table_id];
      const overlap = exTableIds.some(id => newTableIds.includes(id));
      if (!overlap) continue;
      const exTime = parseTime(ex.time);
      if (exTime === null) continue;
      const diff = Math.abs(exTime - newTime);
      if (diff < conflictWindowMinutes) {
        conflicts.push(ex);
      }
    }
  }

  if (conflicts.length > 0 && !options?.force) {
    const err: any = new Error('Conflitto prenotazione');
    err.conflicts = conflicts;
    throw err;
  }

  if (isSupabaseConfigured && supabase) {
    // Salva table_ids come array (richiede colonna table_ids di tipo integer[] in Supabase)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { table_names: _tableNames, ...reservationData } = reservation;
    const { data, error } = await supabase.from('reservations').insert({
      ...reservationData,
      table_id: reservation.table_ids?.[0] || reservation.table_id,
      table_ids: reservation.table_ids || [reservation.table_id],
    }).select().single();
    if (error) throw error;
    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('reservations-updated'));
      }
    } catch (e) {
      // ignore
    }
    return data;
  }
  const reservations = getLocalData<Reservation[]>('reservations', []);
  const newReservation = { ...reservation, id: Date.now() };
  setLocalData('reservations', [...reservations, newReservation]);
  // Notify UI listeners (local)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('reservations-updated'));
    }
  } catch (e) {
    // ignore
  }
  return newReservation;
}

export async function updateReservation(id: number, updates: Partial<Omit<Reservation, 'id'>>, options?: { force?: boolean }): Promise<Reservation> {
  // When updating reservation, ensure conflict window rule still holds
  const conflictWindowMinutes = 150;
  const conflicts: Reservation[] = [];
  if (updates.date && updates.time) {
    const existing = await getReservations(updates.date);
    const newTableIds = updates.table_ids && updates.table_ids.length > 0 ? updates.table_ids : (updates.table_id ? [updates.table_id] : []);
    const parseTime = (t?: string) => {
      if (!t) return null;
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + (mm || 0);
    };
    const newTime = parseTime(updates.time);
    if (newTime !== null) {
      for (const ex of existing) {
        if (ex.id === id) continue; // skip self
        const exTableIds = ex.table_ids && ex.table_ids.length > 0 ? ex.table_ids : [ex.table_id];
        const overlap = exTableIds.some(idt => newTableIds.includes(idt));
        if (!overlap) continue;
        const exTime = parseTime(ex.time);
        if (exTime === null) continue;
        const diff = Math.abs(exTime - newTime);
        if (diff < conflictWindowMinutes) {
          conflicts.push(ex);
        }
      }
    }
  }

  if (conflicts.length > 0 && !options?.force) {
    const err: any = new Error('Conflitto prenotazione');
    err.conflicts = conflicts;
    throw err;
  }

  if (isSupabaseConfigured && supabase) {
    // Aggiorna anche table_ids su Supabase
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { table_names: _tableNames, ...updatesData } = updates;
    const { data, error } = await supabase
      .from('reservations')
      .update({
        ...updatesData,
        table_id: updates.table_ids?.[0] || updates.table_id,
        table_ids: updates.table_ids || (updates.table_id ? [updates.table_id] : null),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('reservations-updated'));
      }
    } catch (e) {
      // ignore
    }
    return data;
  }
  const reservations = getLocalData<Reservation[]>('reservations', []);
  const index = reservations.findIndex(r => r.id === id);
  if (index !== -1) {
    reservations[index] = { ...reservations[index], ...updates };
    setLocalData('reservations', reservations);
    // Notify UI listeners (local)
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('reservations-updated'));
      }
    } catch (e) {
      // ignore
    }
    return reservations[index];
  }
  throw new Error('Prenotazione non trovata');
}

export async function deleteReservation(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('reservations-updated'));
      }
    } catch (e) {
      // ignore
    }
    return;
  }
  const reservations = getLocalData<Reservation[]>('reservations', []);
  setLocalData('reservations', reservations.filter(r => r.id !== id));
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('reservations-updated'));
    }
  } catch (e) {
    // ignore
  }
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
        iva_included: true, // Default: IVA inclusa nei prezzi
        default_threshold: 10,
        language: 'it',
        smac_enabled: true, // Default: SMAC abilitato
        cover_charge: 0, // Default: nessun coperto
      };
    }
    return {
      shop_name: data?.shop_name || 'Il Mio Ristorante',
      menu_slogan: data?.menu_slogan,
      currency: data?.currency || '€',
      iva_rate: data?.iva_rate ?? 17,
      iva_included: data?.iva_included ?? true, // Default: IVA inclusa nei prezzi
      default_threshold: data?.default_threshold ?? 10,
      language: data?.language || 'it',
      address: data?.address,
      phone: data?.phone,
      email: data?.email,
      smac_enabled: data?.smac_enabled ?? true, // Default: SMAC abilitato
      cover_charge: data?.cover_charge ?? 0, // Default: nessun coperto
    };
  }
  // Carica settings da localStorage e unisce con i default per garantire che tutti i campi esistano
  const defaults: Settings = {
    shop_name: 'Il Mio Ristorante',
    menu_slogan: '',
    currency: '€',
    iva_rate: 17,
    iva_included: true, // Default: IVA inclusa nei prezzi
    default_threshold: 10,
    language: 'it',
    smac_enabled: true, // Default: SMAC abilitato
    cover_charge: 0, // Default: nessun coperto
  };
  const saved = getLocalData<Partial<Settings>>('settings', {});
  return { ...defaults, ...saved };
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Prima verifica se esiste una riga nella tabella settings
    const { data: existing } = await supabase.from('settings').select('id').limit(1).single();

    // Prepara i dati per il salvataggio - rimuove campi undefined/null
    const cleanSettings = Object.fromEntries(
      Object.entries(settings).filter(([, v]) => v !== undefined)
    );

    if (existing) {
      // Aggiorna la riga esistente
      const { error } = await supabase.from('settings').update(cleanSettings).eq('id', existing.id);
      if (error) {
        console.error('Supabase update error:', error);
        // Se l'errore è dovuto a colonne mancanti, prova a salvare solo i campi base
        if (error.message?.includes('column') || error.code === '42703') {
          const basicSettings = {
            shop_name: settings.shop_name,
            currency: settings.currency,
            iva_rate: settings.iva_rate,
            default_threshold: settings.default_threshold,
            language: settings.language,
            address: settings.address,
            phone: settings.phone,
            email: settings.email,
            cover_charge: settings.cover_charge,
          };
          const filteredBasic = Object.fromEntries(
            Object.entries(basicSettings).filter(([, v]) => v !== undefined)
          );
          const { error: retryError } = await supabase.from('settings').update(filteredBasic).eq('id', existing.id);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
    } else {
      // Inserisci una nuova riga con i valori di default + le modifiche
      const newSettings = {
        shop_name: 'Il Mio Ristorante',
        currency: '€',
        iva_rate: 17,
        iva_included: true,
        default_threshold: 10,
        language: 'it',
        smac_enabled: true,
        cover_charge: 0,
        ...cleanSettings
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

// ============== INVENTORY SETTINGS ==============
const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  cost_calculation_method: 'fixed',
  moving_avg_months: 3,
};

export async function getInventorySettings(): Promise<InventorySettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('inventory_settings').select('*').limit(1).single();
    if (error || !data) return DEFAULT_INVENTORY_SETTINGS;
    return data;
  }
  return getLocalData<InventorySettings>('inventory_settings', DEFAULT_INVENTORY_SETTINGS);
}

export async function updateInventorySettings(settings: Partial<InventorySettings>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: existing } = await supabase.from('inventory_settings').select('id').limit(1).single();

    if (existing) {
      const { error } = await supabase.from('inventory_settings').update(settings).eq('id', existing.id);
      if (error) throw error;
    } else {
      const newSettings = { ...DEFAULT_INVENTORY_SETTINGS, ...settings };
      const { error } = await supabase.from('inventory_settings').insert(newSettings);
      if (error) throw error;
    }
    return;
  }
  const currentSettings = getLocalData<InventorySettings>('inventory_settings', DEFAULT_INVENTORY_SETTINGS);
  const newSettings = { ...currentSettings, ...settings };
  setLocalData('inventory_settings', newSettings);
}

// Calcola il nuovo costo unitario basato sul metodo impostato
export async function calculateNewUnitCost(
  ingredientId: number,
  currentCost: number,
  currentQuantity: number,
  newQuantity: number,
  newUnitCost: number
): Promise<number> {
  const settings = await getInventorySettings();

  switch (settings.cost_calculation_method) {
    case 'fixed':
      // Costo fisso - non cambia mai
      return currentCost;

    case 'last':
      // Ultimo costo - usa sempre il costo dell'ultima fornitura
      return newUnitCost;

    case 'weighted_avg': {
      // Media ponderata - calcola la media basata sulle quantità
      const totalQuantity = currentQuantity + newQuantity;
      if (totalQuantity === 0) return newUnitCost;
      const weightedCost = ((currentCost * currentQuantity) + (newUnitCost * newQuantity)) / totalQuantity;
      return Math.round(weightedCost * 100) / 100; // Arrotonda a 2 decimali
    }

    case 'moving_avg': {
      // Media mobile - calcola la media delle ultime N mesi di forniture
      const months = settings.moving_avg_months;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Ottieni le forniture degli ultimi N mesi per questo ingrediente
      const supplies = await getSupplies();
      const supplyIds = supplies
        .filter(s => s.date >= startDateStr)
        .map(s => s.id);

      if (supplyIds.length === 0) {
        // Nessuna fornitura nel periodo, usa il nuovo costo
        return newUnitCost;
      }

      // Ottieni i dettagli delle forniture per questo ingrediente
      let totalCost = 0;
      let totalQty = 0;

      for (const supplyId of supplyIds) {
        const items = await getSupplyItems(supplyId);
        const item = items.find(i => i.ingredient_id === ingredientId);
        if (item) {
          totalCost += item.unit_cost;
          totalQty += item.quantity;
        }
      }

      // Aggiungi la nuova fornitura al calcolo
      totalCost += newUnitCost * newQuantity;
      totalQty += newQuantity;

      if (totalQty === 0) return newUnitCost;
      const avgCost = totalCost / totalQty;
      return Math.round(avgCost * 100) / 100;
    }

    default:
      return currentCost;
  }
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

// ============== RIPRISTINARE INVENTARIO (per modifiche/eliminazioni) ==============
export async function restoreIngredientsForItems(
  orderItems: { menu_item_id: number; quantity: number }[],
  orderId?: number
): Promise<void> {
  const recipes = await getMenuItemIngredients();
  const inventory = await getInventory();

  // Calcola quanto ripristinare per ogni ingrediente
  const restoreMap: Record<number, number> = {};

  for (const orderItem of orderItems) {
    const itemRecipe = recipes.filter(r => r.menu_item_id === orderItem.menu_item_id);
    for (const recipeItem of itemRecipe) {
      const totalRestore = recipeItem.quantity * orderItem.quantity;
      restoreMap[recipeItem.ingredient_id] =
        (restoreMap[recipeItem.ingredient_id] || 0) + totalRestore;
    }
  }

  // Ripristina inventario e registra il ripristino (consumo negativo)
  for (const [ingredientId, restored] of Object.entries(restoreMap)) {
    const invItem = inventory.find(i => i.ingredient_id === Number(ingredientId));
    if (invItem) {
      const newQuantity = invItem.quantity + restored;
      await updateInventoryQuantity(Number(ingredientId), newQuantity);
      // Registra come consumo negativo per tracciabilità
      if (orderId) {
        await recordIngredientConsumption(Number(ingredientId), -restored, orderId);
      }
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

    // Aggiorna l'inventario e i costi
    for (const item of items) {
      // Ottieni dati attuali inventario e ingrediente
      const { data: invData } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('ingredient_id', item.ingredient_id)
        .single();

      const { data: ingData } = await supabase
        .from('ingredients')
        .select('cost')
        .eq('id', item.ingredient_id)
        .single();

      const currentQuantity = invData?.quantity || 0;
      const currentCost = ingData?.cost || 0;

      // Aggiorna quantità inventario
      if (invData) {
        await supabase
          .from('inventory')
          .update({ quantity: currentQuantity + item.quantity })
          .eq('ingredient_id', item.ingredient_id);
      }

      // Calcola il nuovo costo unitario in base alle impostazioni
      const newUnitCostPerUnit = item.quantity > 0 ? item.unit_cost / item.quantity : item.unit_cost;
      const calculatedCost = await calculateNewUnitCost(
        item.ingredient_id,
        currentCost,
        currentQuantity,
        item.quantity,
        newUnitCostPerUnit
      );

      await supabase
        .from('ingredients')
        .update({ cost: calculatedCost })
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
    const currentQuantity = invIndex !== -1 ? inventory[invIndex].quantity : 0;
    if (invIndex !== -1) {
      inventory[invIndex].quantity += item.quantity;
    }

    // Calcola e aggiorna costo ingrediente in base alle impostazioni
    const ingIndex = ingredients.findIndex(i => i.id === item.ingredient_id);
    if (ingIndex !== -1) {
      const currentCost = ingredients[ingIndex].cost;
      const newUnitCostPerUnit = item.quantity > 0 ? item.unit_cost / item.quantity : item.unit_cost;
      const calculatedCost = await calculateNewUnitCost(
        item.ingredient_id,
        currentCost,
        currentQuantity,
        item.quantity,
        newUnitCostPerUnit
      );
      ingredients[ingIndex].cost = calculatedCost;
    }
  }
  setLocalData('inventory', inventory);
  setLocalData('ingredients', ingredients);

  return newSupply;
}

export async function deleteSupply(id: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Prima ottieni gli items per ripristinare l'inventario
    const { data: supplyItems } = await supabase
      .from('supply_items')
      .select('*')
      .eq('supply_id', id);

    // Ripristina (sottrai) le quantità dall'inventario
    if (supplyItems && supplyItems.length > 0) {
      for (const item of supplyItems) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('ingredient_id', item.ingredient_id)
          .single();

        if (invData) {
          const newQuantity = Math.max(0, invData.quantity - item.quantity);
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('ingredient_id', item.ingredient_id);
        }
      }
    }

    // Poi elimina gli items
    await supabase.from('supply_items').delete().eq('supply_id', id);
    // Poi elimina la fornitura
    const { error } = await supabase.from('supplies').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  // Modalità locale
  const supplies = getLocalData<Supply[]>('supplies', []);
  const supplyItems = getLocalData<SupplyItem[]>('supply_items', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);

  // Trova gli items di questa fornitura e ripristina l'inventario
  const itemsToRemove = supplyItems.filter(si => si.supply_id === id);
  for (const item of itemsToRemove) {
    const invIndex = inventory.findIndex(i => i.ingredient_id === item.ingredient_id);
    if (invIndex !== -1) {
      inventory[invIndex].quantity = Math.max(0, inventory[invIndex].quantity - item.quantity);
    }
  }
  setLocalData('inventory', inventory);

  setLocalData('supplies', supplies.filter(s => s.id !== id));
  setLocalData('supply_items', supplyItems.filter(si => si.supply_id !== id));
}

export async function updateSupply(
  id: number,
  supply: Partial<Omit<Supply, 'id' | 'created_at'>>,
  newItems: Omit<SupplyItem, 'id' | 'supply_id'>[]
): Promise<Supply> {
  // Calcola il nuovo costo totale
  const totalCost = newItems.reduce((sum, item) => sum + item.unit_cost, 0);

  if (isSupabaseConfigured && supabase) {
    // Ottieni gli items vecchi per calcolare il delta
    const { data: oldItems } = await supabase
      .from('supply_items')
      .select('*')
      .eq('supply_id', id);

    // Calcola il delta per ogni ingrediente (vecchio -> nuovo)
    const deltaMap: Record<number, number> = {};

    // Sottrai le vecchie quantità
    if (oldItems) {
      for (const item of oldItems) {
        deltaMap[item.ingredient_id] = (deltaMap[item.ingredient_id] || 0) - item.quantity;
      }
    }

    // Aggiungi le nuove quantità
    for (const item of newItems) {
      deltaMap[item.ingredient_id] = (deltaMap[item.ingredient_id] || 0) + item.quantity;
    }

    // Applica il delta all'inventario
    for (const [ingredientId, delta] of Object.entries(deltaMap)) {
      const { data: invData } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('ingredient_id', Number(ingredientId))
        .single();

      if (invData) {
        const newQuantity = Math.max(0, invData.quantity + delta);
        await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('ingredient_id', Number(ingredientId));
      }
    }

    // Aggiorna la fornitura
    const { data: supplyData, error: supplyError } = await supabase
      .from('supplies')
      .update({ ...supply, total_cost: totalCost })
      .eq('id', id)
      .select()
      .single();
    if (supplyError) throw supplyError;

    // Elimina i vecchi items
    await supabase.from('supply_items').delete().eq('supply_id', id);

    // Inserisci i nuovi items
    const supplyItems = newItems.map(item => ({
      ...item,
      supply_id: id,
    }));
    const { error: itemsError } = await supabase.from('supply_items').insert(supplyItems);
    if (itemsError) throw itemsError;

    // Aggiorna i costi degli ingredienti per i nuovi items
    for (const item of newItems) {
      const { data: invData } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('ingredient_id', item.ingredient_id)
        .single();

      const { data: ingData } = await supabase
        .from('ingredients')
        .select('cost')
        .eq('id', item.ingredient_id)
        .single();

      const currentQuantity = invData?.quantity || 0;
      const currentCost = ingData?.cost || 0;

      const newUnitCostPerUnit = item.quantity > 0 ? item.unit_cost / item.quantity : item.unit_cost;
      const calculatedCost = await calculateNewUnitCost(
        item.ingredient_id,
        currentCost,
        currentQuantity,
        item.quantity,
        newUnitCostPerUnit
      );

      await supabase
        .from('ingredients')
        .update({ cost: calculatedCost })
        .eq('id', item.ingredient_id);
    }

    return supplyData;
  }

  // Modalità locale
  const supplies = getLocalData<Supply[]>('supplies', []);
  const supplyItemsList = getLocalData<SupplyItem[]>('supply_items', []);
  const inventory = getLocalData<InventoryItem[]>('inventory', []);
  const ingredients = getLocalData<Ingredient[]>('ingredients', []);

  // Trova la fornitura da aggiornare
  const supplyIndex = supplies.findIndex(s => s.id === id);
  if (supplyIndex === -1) throw new Error('Fornitura non trovata');

  // Ottieni i vecchi items
  const oldItems = supplyItemsList.filter(si => si.supply_id === id);

  // Calcola il delta per ogni ingrediente
  const deltaMap: Record<number, number> = {};

  // Sottrai le vecchie quantità
  for (const item of oldItems) {
    deltaMap[item.ingredient_id] = (deltaMap[item.ingredient_id] || 0) - item.quantity;
  }

  // Aggiungi le nuove quantità
  for (const item of newItems) {
    deltaMap[item.ingredient_id] = (deltaMap[item.ingredient_id] || 0) + item.quantity;
  }

  // Applica il delta all'inventario
  for (const [ingredientId, delta] of Object.entries(deltaMap)) {
    const invIndex = inventory.findIndex(i => i.ingredient_id === Number(ingredientId));
    if (invIndex !== -1) {
      inventory[invIndex].quantity = Math.max(0, inventory[invIndex].quantity + delta);
    }
  }
  setLocalData('inventory', inventory);

  // Aggiorna i costi degli ingredienti
  for (const item of newItems) {
    const invItem = inventory.find(i => i.ingredient_id === item.ingredient_id);
    const currentQuantity = invItem?.quantity || 0;
    const ingIndex = ingredients.findIndex(i => i.id === item.ingredient_id);
    if (ingIndex !== -1) {
      const currentCost = ingredients[ingIndex].cost;
      const newUnitCostPerUnit = item.quantity > 0 ? item.unit_cost / item.quantity : item.unit_cost;
      const calculatedCost = await calculateNewUnitCost(
        item.ingredient_id,
        currentCost,
        currentQuantity,
        item.quantity,
        newUnitCostPerUnit
      );
      ingredients[ingIndex].cost = calculatedCost;
    }
  }
  setLocalData('ingredients', ingredients);

  // Aggiorna la fornitura
  supplies[supplyIndex] = {
    ...supplies[supplyIndex],
    ...supply,
    total_cost: totalCost,
  };
  setLocalData('supplies', supplies);

  // Rimuovi i vecchi items e aggiungi i nuovi
  const filteredItems = supplyItemsList.filter(si => si.supply_id !== id);
  const newSupplyItems = newItems.map((item, index) => ({
    ...item,
    id: Date.now() + index + 1,
    supply_id: id,
  }));
  setLocalData('supply_items', [...filteredItems, ...newSupplyItems]);

  return supplies[supplyIndex];
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

  // Calcolo SMAC considerando i pagamenti divisi (session_payments)
  // Raggruppa ordini per session_id
  const sessionIds = [...new Set(completedOrders.filter(o => o.session_id).map(o => o.session_id!))];
  const ordersWithoutSession = completedOrders.filter(o => !o.session_id);

  // Carica i pagamenti per tutte le sessioni
  const sessionPaymentsMap: Record<number, SessionPayment[]> = {};
  await Promise.all(
    sessionIds.map(async (sessionId) => {
      const payments = await getSessionPayments(sessionId);
      if (payments.length > 0) {
        sessionPaymentsMap[sessionId] = payments;
      }
    })
  );

  let smac_total = 0;
  let non_smac_total = 0;

  // Calcola SMAC per ordini senza sessione (ordini singoli)
  for (const order of ordersWithoutSession) {
    if (order.smac_passed) {
      smac_total += order.total;
    } else {
      non_smac_total += order.total;
    }
  }

  // Calcola SMAC per sessioni (considera i pagamenti divisi se presenti)
  const processedSessions = new Set<number>();
  for (const order of completedOrders.filter(o => o.session_id)) {
    const sessionId = order.session_id!;
    if (processedSessions.has(sessionId)) continue;
    processedSessions.add(sessionId);

    const payments = sessionPaymentsMap[sessionId] || [];
    const sessionOrders = completedOrders.filter(o => o.session_id === sessionId);
    const sessionTotal = sessionOrders.reduce((sum, o) => sum + o.total, 0);

    if (payments.length > 0) {
      // Ha pagamenti divisi - usa lo stato SMAC dei pagamenti
      const smacPaymentsTotal = payments.filter(p => p.smac_passed).reduce((sum, p) => sum + p.amount, 0);
      smac_total += smacPaymentsTotal;
      non_smac_total += sessionTotal - smacPaymentsTotal;
    } else {
      // Nessun pagamento diviso - usa lo stato dell'ordine
      const firstOrder = sessionOrders[0];
      if (firstOrder.smac_passed) {
        smac_total += sessionTotal;
      } else {
        non_smac_total += sessionTotal;
      }
    }
  }

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
      .insert({
        date: closure.date,
        opening_cash: closure.opening_cash,
        closing_cash: closure.closing_cash,
        expected_cash: closure.expected_cash,
        difference: closure.difference,
        total_orders: closure.total_orders,
        total_revenue: closure.total_revenue,
        cash_revenue: closure.cash_revenue,
        card_revenue: closure.card_revenue,
        online_revenue: closure.online_revenue,
        smac_total: closure.smac_total,
        non_smac_total: closure.non_smac_total,
        notes: closure.notes,
        closed_by: closure.closed_by,
        created_at: new Date().toISOString(),
      })
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
// Versione ottimizzata: carica dati una sola volta e calcola tutto in memoria

export async function calculateDishCost(menuItemId: number): Promise<DishCost | null> {
  // Per singolo piatto, carichiamo i dati necessari
  const [menuItems, allRecipes, ingredients] = await Promise.all([
    getMenuItems(),
    getMenuItemIngredients(menuItemId),
    getIngredients(),
  ]);

  const menuItem = menuItems.find(m => m.id === menuItemId);
  if (!menuItem) return null;

  return calculateDishCostFromData(menuItem, allRecipes, ingredients);
}

// Funzione interna che calcola il costo usando dati già caricati
function calculateDishCostFromData(
  menuItem: MenuItem,
  allRecipes: MenuItemIngredient[],
  ingredients: Ingredient[]
): DishCost {
  const recipe = allRecipes.filter(r => r.menu_item_id === menuItem.id);

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
  // Carica TUTTI i dati con 3 query parallele (invece di N*3 query sequenziali)
  const [menuItems, allRecipes, ingredients] = await Promise.all([
    getMenuItems(),
    getMenuItemIngredients(), // Senza parametro = tutte le ricette
    getIngredients(),
  ]);

  // Calcola tutti i costi in memoria (nessuna query aggiuntiva)
  const costs: DishCost[] = menuItems.map(menuItem =>
    calculateDishCostFromData(menuItem, allRecipes, ingredients)
  );

  return costs.sort((a, b) => b.profit_margin_percent - a.profit_margin_percent);
}

export async function getDishCostSummary(): Promise<{
  totalDishes: number;
  avgProfitMargin: number;
  highMarginDishes: DishCost[];
  lowMarginDishes: DishCost[];
  dishesWithoutRecipe: MenuItem[];
}> {
  const { allCosts, menuItems } = await getAllDishCostsWithData();

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

// Funzione combinata che ritorna sia i costi che il summary in una sola chiamata
// Usata dalla pagina DishCosts per evitare doppia chiamata
export async function getDishCostsAndSummary(): Promise<{
  costs: DishCost[];
  summary: {
    totalDishes: number;
    avgProfitMargin: number;
    highMarginDishes: DishCost[];
    lowMarginDishes: DishCost[];
    dishesWithoutRecipe: MenuItem[];
  };
}> {
  // Una sola volta: 3 query parallele
  const [menuItems, allRecipes, ingredients] = await Promise.all([
    getMenuItems(),
    getMenuItemIngredients(),
    getIngredients(),
  ]);

  // Calcola tutti i costi in memoria
  const allCosts: DishCost[] = menuItems.map(menuItem =>
    calculateDishCostFromData(menuItem, allRecipes, ingredients)
  );

  const sortedCosts = [...allCosts].sort((a, b) => b.profit_margin_percent - a.profit_margin_percent);

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
    costs: sortedCosts,
    summary: {
      totalDishes: menuItems.length,
      avgProfitMargin: Math.round(avgProfitMargin * 10) / 10,
      highMarginDishes,
      lowMarginDishes,
      dishesWithoutRecipe,
    },
  };
}

// Helper interno per riutilizzare i dati caricati
async function getAllDishCostsWithData(): Promise<{
  allCosts: DishCost[];
  menuItems: MenuItem[];
}> {
  const [menuItems, allRecipes, ingredients] = await Promise.all([
    getMenuItems(),
    getMenuItemIngredients(),
    getIngredients(),
  ]);

  const allCosts: DishCost[] = menuItems.map(menuItem =>
    calculateDishCostFromData(menuItem, allRecipes, ingredients)
  );

  return { allCosts, menuItems };
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
    const createdSession = { ...data, table_name: table?.name } as TableSession;
    // Also create a placeholder order row so Orders list shows the session immediately
    try {
      await supabase.from('orders').insert({
        date: new Date().toISOString().split('T')[0],
        total: 0,
        payment_method: 'cash',
        order_type: 'dine_in',
        table_id: tableId,
        table_name: table?.name,
        notes: 'Conto placeholder',
        status: 'pending',
        smac_passed: false,
        customer_name: customerName || undefined,
        created_at: new Date().toISOString(),
        session_id: createdSession.id,
        created_by: 'session-placeholder',
      });
    } catch (err) {
      console.error('Error creating placeholder order for session:', err);
    }

    // Notify browser UI listeners that sessions/orders changed
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }

    return createdSession;
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  sessions.push(newSession);
  setLocalData('table_sessions', sessions);
  // Create a placeholder order locally so the Orders list reflects the opened session
  try {
    const orders = getLocalData<Order[]>('orders', []);
    const placeholderOrder: Order = {
      id: Date.now() + 1,
      date: new Date().toISOString().split('T')[0],
      total: 0,
      payment_method: 'cash',
      order_type: 'dine_in',
      table_id: tableId,
      table_name: table?.name,
      notes: 'Conto placeholder',
      status: 'pending',
      smac_passed: false,
      customer_name: customerName || undefined,
      created_at: new Date().toISOString(),
      session_id: newSession.id,
      created_by: 'session-placeholder',
    } as Order;
    setLocalData('orders', [...orders, placeholderOrder]);
  } catch (err) {
    console.error('Error creating local placeholder order for session:', err);
  }
  // Notify browser UI listeners that sessions/orders changed (local mode)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
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

export async function updateSessionTotal(sessionId: number, includeCoverCharge: boolean = true): Promise<void> {
  const orders = await getSessionOrders(sessionId);
  const settings = await getSettings();

  // Somma dei totali ordini
  const ordersTotal = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  let total = ordersTotal;

  // Aggiungi coperto solo se richiesto e se c'è un costo coperto impostato.
  // Applichiamo il coperto anche se la sessione è "vuota" quando esiste
  // un ordine segnaposto creato all'apertura della sessione (created_by = 'session-placeholder').
  const hasPlaceholder = orders.some(o => (o as any).created_by === 'session-placeholder');
  if (includeCoverCharge && (settings.cover_charge || 0) > 0 && (ordersTotal > 0 || hasPlaceholder)) {
    // Ottieni il numero di coperti dalla sessione
    let covers = 1;
    if (isSupabaseConfigured && supabase) {
      const { data: sessionData } = await supabase
        .from('table_sessions')
        .select('covers')
        .eq('id', sessionId)
        .single();
      covers = sessionData?.covers || 1;
    } else {
      const sessions = getLocalData<TableSession[]>('table_sessions', []);
      const session = sessions.find(s => s.id === sessionId);
      covers = session?.covers || 1;
    }

    // Calcola coperto (cover_charge * numero coperti)
    const coverCharge = (settings.cover_charge || 0) * covers;
    total = ordersTotal + coverCharge;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('table_sessions')
        .update({ total, include_cover: includeCoverCharge })
        .eq('id', sessionId);
    } catch (err: any) {
      // If the remote PostgREST schema cache doesn't include the column
      // `include_cover` (PGRST204), retry the update without that field.
      if (err && err.code === 'PGRST204') {
        await supabase.from('table_sessions').update({ total }).eq('id', sessionId);
      } else {
        throw err;
      }
    }
    // Notify browser UI listeners that sessions/orders changed
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }
    return;
  }
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index].total = total;
    sessions[index].include_cover = includeCoverCharge;
    setLocalData('table_sessions', sessions);
  }
  // Notify browser UI listeners that sessions/orders changed
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
}

// Forcibly set the session total (manual override)
export async function setSessionTotal(sessionId: number, total: number): Promise<TableSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('table_sessions')
      .update({ total })
      .eq('id', sessionId)
      .select()
      .single();
    if (error) throw error;
    // Attach table_name if possible
    const tables = getLocalData<Table[]>('tables', []);
    return { ...data, table_name: tables.find(t => t.id === data.table_id)?.name } as TableSession;
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index].total = total;
    setLocalData('table_sessions', sessions);
    const tables = getLocalData<Table[]>('tables', []);
    return { ...sessions[index], table_name: tables.find(t => t.id === sessions[index].table_id)?.name };
  }
  return null;
}

export async function closeTableSession(
  sessionId: number,
  paymentMethod: 'cash' | 'card' | 'online' | 'split',
  smacPassed: boolean,
  includeCoverCharge: boolean = true
): Promise<TableSession> {
  // Aggiorna totale prima di chiudere (con o senza coperto)
  await updateSessionTotal(sessionId, includeCoverCharge);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('table_sessions')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          smac_passed: smacPassed,
          closed_at: new Date().toISOString(),
          include_cover: includeCoverCharge,
        })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      // Notify UI listeners
      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('orders-updated'));
          window.dispatchEvent(new CustomEvent('table-sessions-updated'));
        }
      } catch (e) {
        // ignore
      }
      return data;
    } catch (err: any) {
      if (err && err.code === 'PGRST204') {
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
        try {
          if (typeof window !== 'undefined' && window?.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('orders-updated'));
            window.dispatchEvent(new CustomEvent('table-sessions-updated'));
          }
        } catch (e) {
          // ignore
        }
        return data;
      }
      throw err;
    }
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = {
      ...sessions[index],
      status: 'paid',
      payment_method: paymentMethod,
      smac_passed: smacPassed,
      include_cover: includeCoverCharge,
      closed_at: new Date().toISOString(),
    };
    setLocalData('table_sessions', sessions);
    // Notify UI listeners (local)
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }
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
    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
        window.dispatchEvent(new CustomEvent('tables-updated'));
      }
    } catch (e) {
      // ignore
    }
    return { ...data, table_name: newTable?.name };
  }

  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index].table_id = newTableId;
    sessions[index].table_name = newTable?.name;
    setLocalData('table_sessions', sessions);
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
        window.dispatchEvent(new CustomEvent('tables-updated'));
      }
    } catch (e) {
      // ignore
    }
    return sessions[index];
  }
  throw new Error('Sessione non trovata');
}

export async function deleteTableSession(sessionId: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      // Get orders in the session
      const { data: orders } = await supabase.from('orders').select('id').eq('session_id', sessionId);
      const orderIds = (orders || []).map((o: any) => o.id);

      if (orderIds.length > 0) {
        // delete order_items
        await supabase.from('order_items').delete().in('order_id', orderIds);
        // delete orders
        await supabase.from('orders').delete().in('id', orderIds);
      }

      // delete session payments
      await supabase.from('session_payments').delete().eq('session_id', sessionId);

      // get session to access table_id before deleting
      const { data: sessionData } = await supabase.from('table_sessions').select('id, table_id').eq('id', sessionId).single();

      // delete the session
      await supabase.from('table_sessions').delete().eq('id', sessionId);

      // if we have a table_id, free the table (set status available and clear current_order_id)
      const tableId = sessionData?.table_id;
      if (tableId) {
        try {
          await supabase.from('tables').update({ status: 'available', current_order_id: null }).eq('id', tableId);
        } catch (e) {
          // ignore table update errors, session deletion succeeded
          console.error('Warning: failed to update table status after deleting session', e);
        }
      }
      // notify UI listeners
      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('orders-updated'));
          window.dispatchEvent(new CustomEvent('table-sessions-updated'));
        }
      } catch (e) {
        // ignore in non-browser environments
      }
      return;
    } catch (err) {
      throw err;
    }
  }

  // Local mode: remove orders, order_items, session_payments and session
  const orders = getLocalData<Order[]>('orders', []);
  const orderItems = getLocalData<OrderItem[]>('order_items', []);
  const sessions = getLocalData<TableSession[]>('table_sessions', []);
  const sessionPayments = getLocalData<SessionPayment[]>('kebab_session_payments', []);

  const sessionOrderIds = orders.filter(o => o.session_id === sessionId).map(o => o.id);
  const remainingOrders = orders.filter(o => o.session_id !== sessionId);
  const remainingOrderItems = orderItems.filter(i => !sessionOrderIds.includes(i.order_id));
  const remainingSessions = sessions.filter(s => s.id !== sessionId);
  const remainingPayments = sessionPayments.filter(p => p.session_id !== sessionId);

  setLocalData('orders', remainingOrders);
  setLocalData('order_items', remainingOrderItems);
  setLocalData('table_sessions', remainingSessions);
  setLocalData('kebab_session_payments', remainingPayments as any);
  // Also free the related table in local storage (if present)
  try {
    const tables = getLocalData<Table[]>('tables', []);
    const session = sessions.find(s => s.id === sessionId);
    if (session && session.table_id) {
      const tIndex = tables.findIndex(t => t.id === session.table_id);
      if (tIndex !== -1) {
        tables[tIndex].status = 'available';
        if ('current_order_id' in tables[tIndex]) {
          // @ts-ignore
          tables[tIndex].current_order_id = null;
        }
        setLocalData('tables', tables);
      }
    }
  } catch (e) {
    // ignore local update errors
  }

  // Notify UI listeners in browser
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
}

// Calcola il prossimo numero di comanda per una sessione
export async function getNextOrderNumber(sessionId: number): Promise<number> {
  const orders = await getSessionOrders(sessionId);
  if (orders.length === 0) return 1;
  const orderNumbers = orders.map(o => o.order_number || 1);
  const maxOrderNumber = orderNumbers.reduce((max, n) => Math.max(max, n), 0);
  return maxOrderNumber + 1;
}

// ============== PAGAMENTI SESSIONE (SPLIT BILL) ==============

export async function addSessionPayment(
  sessionId: number,
  amount: number,
  paymentMethod: 'cash' | 'card' | 'online',
  notes?: string,
  smacPassed?: boolean,
  paidItems?: SessionPaymentItem[]
): Promise<SessionPayment> {
  const newPayment: SessionPayment = {
    id: Date.now(),
    session_id: sessionId,
    amount,
    payment_method: paymentMethod,
    paid_at: new Date().toISOString(),
    notes,
    smac_passed: smacPassed || false,
    paid_items: paidItems || [],
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('session_payments')
      .insert({
        session_id: sessionId,
        amount,
        payment_method: paymentMethod,
        notes,
        smac_passed: smacPassed || false,
        paid_items: paidItems || [],
      })
      .select()
      .single();

    if (error) throw error;
    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }
    return data;
  }

  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  payments.push(newPayment);
  setLocalData('session_payments', payments);
  // Notify UI listeners (local)
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
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
    // Assicura che paid_items sia sempre un array (potrebbe non esistere nella tabella)
    return (data || []).map(p => ({ ...p, paid_items: p.paid_items || [] }));
  }
  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  return payments
    .filter(p => p.session_id === sessionId)
    .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
}

export async function getSessionRemainingAmount(sessionId: number): Promise<number> {
  try {
    // Preferisci usare il totale registrato nella sessione (può includere coperto)
    // se presente; altrimenti ricadi sul calcolo dagli ordini.
    let sessionTotal: number | null = null;
    try {
      const s = await getTableSession(sessionId);
      if (s && typeof s.total === 'number') sessionTotal = s.total;
    } catch (err) {
      // Ignora e ricadi al calcolo dagli ordini
      sessionTotal = null;
    }

    if (sessionTotal === null) {
      const sessionOrders = await getSessionOrders(sessionId);
      sessionTotal = sessionOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0);
    }

    if (sessionTotal === 0) return 0;

    const payments = await getSessionPayments(sessionId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, sessionTotal - totalPaid);
  } catch (error) {
    console.error('Error in getSessionRemainingAmount:', error);
    return 0;
  }
}

export async function deleteSessionPayment(paymentId: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('session_payments')
      .delete()
      .eq('id', paymentId);
    if (error) throw error;
    // Notify UI listeners
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orders-updated'));
        window.dispatchEvent(new CustomEvent('table-sessions-updated'));
      }
    } catch (e) {
      // ignore
    }
    return;
  }
  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  setLocalData('session_payments', payments.filter(p => p.id !== paymentId));
  try {
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-updated'));
      window.dispatchEvent(new CustomEvent('table-sessions-updated'));
    }
  } catch (e) {
    // ignore
  }
}

// Aggiorna lo stato SMAC di un singolo pagamento
export async function updatePaymentSmac(paymentId: number, smacPassed: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('session_payments')
      .update({ smac_passed: smacPassed })
      .eq('id', paymentId);
    if (error) throw error;
    return;
  }
  const payments = getLocalData<SessionPayment[]>('session_payments', []);
  const index = payments.findIndex(p => p.id === paymentId);
  if (index !== -1) {
    payments[index].smac_passed = smacPassed;
    setLocalData('session_payments', payments);
  }
}

// Ottieni la quantità già pagata per ogni item in una sessione
export async function getSessionPaidQuantities(sessionId: number): Promise<Record<number, number>> {
  const payments = await getSessionPayments(sessionId);
  const paidQuantities: Record<number, number> = {};

  payments.forEach(payment => {
    (payment.paid_items || []).forEach(item => {
      paidQuantities[item.order_item_id] = (paidQuantities[item.order_item_id] || 0) + item.quantity;
    });
  });

  return paidQuantities;
}

// Genera scontrino per un pagamento parziale
export async function generatePartialReceipt(payment: SessionPayment): Promise<Receipt | null> {
  const settings = await getSettings();
  const paidAt = new Date(payment.paid_at);
  const dateStr = paidAt.toLocaleDateString('it-IT');
  const timeStr = paidAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  if (!payment.paid_items || payment.paid_items.length === 0) {
    // Pagamento senza dettaglio items (manuale o alla romana)
    return {
      id: payment.id,
      order_id: 0,
      receipt_number: `P-${payment.id}`,
      date: dateStr,
      time: timeStr,
      shop_info: {
        name: settings.shop_name || 'Kebab Restaurant',
        address: settings.address,
        phone: settings.phone,
      },
      items: [{
        name: 'Pagamento parziale',
        quantity: 1,
        unit_price: payment.amount,
        total: payment.amount,
      }],
      subtotal: payment.amount,
      iva_rate: settings.iva_rate || 10,
      iva_amount: 0,
      total: payment.amount,
      payment_method: payment.payment_method,
      smac_passed: payment.smac_passed || false,
    };
  }

  const items = payment.paid_items.map(item => ({
    name: item.menu_item_name,
    quantity: item.quantity,
    unit_price: item.price,
    total: item.price * item.quantity,
  }));

  return {
    id: payment.id,
    order_id: 0,
    receipt_number: `P-${payment.id}`,
    date: dateStr,
    time: timeStr,
    shop_info: {
      name: settings.shop_name || 'Kebab Restaurant',
      address: settings.address,
      phone: settings.phone,
    },
    items,
    subtotal: payment.amount,
    iva_rate: settings.iva_rate || 10,
    iva_amount: 0,
    total: payment.amount,
    payment_method: payment.payment_method,
    smac_passed: payment.smac_passed || false,
  };
}
