import { supabase, isSupabaseConfigured } from './supabase';

let channels: any[] = [];

export function initRealtime() {
  if (!isSupabaseConfigured || !supabase || typeof window === 'undefined') return;

  // Helper to create a subscription for a table and dispatch an event
  const subscribeTable = (table: string, eventName: string) => {
    try {
      const chan = (supabase as any)!
        .channel(`${table}-realtime`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          try {
            window.dispatchEvent(new CustomEvent(eventName));
          } catch (e) {
            // ignore
          }
        });
      // subscribe and keep reference (use Promise.resolve to avoid tight coupling to lib version)
      try {
        Promise.resolve((chan as any).subscribe()).then(() => {}).catch(() => {});
      } catch (e) {
        // ignore
      }
      channels.push(chan);
    } catch (err) {
      // ignore errors during subscription
      console.error('Realtime subscribe error for', table, err);
    }
  };

  // List of tables and events to dispatch
  const mappings: Array<{ table: string; event: string }> = [
    { table: 'orders', event: 'orders-updated' },
    { table: 'table_sessions', event: 'table-sessions-updated' },
    { table: 'reservations', event: 'reservations-updated' },
    { table: 'tables', event: 'tables-updated' },
    { table: 'session_payments', event: 'orders-updated' },
    { table: 'settings', event: 'settings-updated' },
    { table: 'order_items', event: 'orders-updated' },
  ];

  for (const m of mappings) subscribeTable(m.table, m.event);
}

export function stopRealtime() {
  try {
    for (const c of channels) {
      try {
        c.unsubscribe && c.unsubscribe();
      } catch (e) {
        // ignore
      }
    }
  } finally {
    channels = [];
  }
}
