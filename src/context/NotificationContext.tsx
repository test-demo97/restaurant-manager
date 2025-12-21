/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Notification {
  id: string;
  type: 'order_new' | 'order_update' | 'order_delete' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  orderId?: number;
  actionBy?: string; // Nome utente che ha fatto l'azione
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isRealtimeConnected: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'kebab_notifications';
const MAX_NOTIFICATIONS = 100; // Limite massimo notifiche salvate

// Funzione per caricare notifiche da localStorage
function loadStoredNotifications(): Notification[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((n: Notification) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return [];
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Usa lazy initializer per evitare warning ESLint
  const [notifications, setNotifications] = useState<Notification[]>(() => loadStoredNotifications());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Save notifications to localStorage when they change (con limite)
  useEffect(() => {
    // Mantieni solo le ultime MAX_NOTIFICATIONS
    const toStore = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Supabase Realtime subscription for orders (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const orderTypeLabels: Record<string, string> = {
      dine_in: 'Tavolo',
      takeaway: 'Asporto',
      delivery: 'Domicilio',
    };

    const statusLabels: Record<string, string> = {
      pending: 'In Attesa',
      preparing: 'In Preparazione',
      ready: 'Pronto',
      delivered: 'Consegnato',
      cancelled: 'Cancellato',
    };

    const channel = supabase
      .channel('notifications-orders')
      // Nuovo ordine
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('New order received:', payload);
          const newOrder = payload.new as {
            id: number;
            customer_name?: string;
            total: number;
            order_type: string;
            created_by?: string;
          };

          addNotification({
            type: 'order_new',
            title: 'Nuovo Ordine',
            message: `Ordine #${newOrder.id} - ${orderTypeLabels[newOrder.order_type] || newOrder.order_type}${newOrder.customer_name ? ` - ${newOrder.customer_name}` : ''} - €${newOrder.total?.toFixed(2) || '0.00'}`,
            orderId: newOrder.id,
            actionBy: newOrder.created_by,
          });
        }
      )
      // Ordine modificato
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order updated:', payload);
          const oldOrder = payload.old as { id: number; status?: string; total?: number };
          const updatedOrder = payload.new as {
            id: number;
            status: string;
            total: number;
            order_type: string;
            updated_by?: string;
          };

          // Determina cosa è cambiato
          let changeDescription = '';
          if (oldOrder.status !== updatedOrder.status) {
            changeDescription = `Stato: ${statusLabels[updatedOrder.status] || updatedOrder.status}`;
          } else if (oldOrder.total !== updatedOrder.total) {
            changeDescription = `Totale: €${updatedOrder.total?.toFixed(2)}`;
          } else {
            changeDescription = 'Dettagli modificati';
          }

          addNotification({
            type: 'order_update',
            title: 'Ordine Modificato',
            message: `Ordine #${updatedOrder.id} - ${changeDescription}`,
            orderId: updatedOrder.id,
            actionBy: updatedOrder.updated_by,
          });
        }
      )
      // Ordine eliminato
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order deleted:', payload);
          const deletedOrder = payload.old as {
            id: number;
            total?: number;
            order_type?: string;
            updated_by?: string;
          };

          addNotification({
            type: 'order_delete',
            title: 'Ordine Eliminato',
            message: `Ordine #${deletedOrder.id}${deletedOrder.total ? ` - €${deletedOrder.total.toFixed(2)}` : ''} è stato eliminato`,
            orderId: deletedOrder.id,
            actionBy: deletedOrder.updated_by,
          });
        }
      )
      .subscribe((status) => {
        console.log('Notification realtime status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isRealtimeConnected,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Re-export useNotifications from hooks for backward compatibility
export { useNotifications } from '../hooks/useNotifications';
