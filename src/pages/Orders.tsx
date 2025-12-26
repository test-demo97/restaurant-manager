import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Minus,
  Clock,
  ChefHat,
  CheckCircle,
  Package,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Edit2,
  History,
  CheckSquare,
  Square,
  Filter,
  ChevronDown,
  ChevronRight,
  Receipt,
  Banknote,
  CreditCard,
  Globe,
  Calculator,
  
  ListChecks,
  Printer,
  FileText,
  Calendar,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import {
  getOrders,
  getOrderItems,
  updateOrderStatus,
  deleteOrder,
  updateOrder,
  getOrdersByDateRange,
  updateOrderStatusBulk,
  deleteOrdersBulk,
  closeTableSession,
  getSessionOrders,
  getSettings,
  getTableSession,
  getSessionPayments,
  addSessionPayment,
  getSessionRemainingAmount,
  getSessionPaidQuantities,
  generatePartialReceipt,
  updateOrderItem,
  deleteOrderItem,
  recalculateOrderTotal,
  deleteTableSession,
  setSessionTotal,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import SessionDetailsModal from '../components/session/SessionDetailsModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSmac } from '../context/SmacContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useAuth } from '../context/AuthContext';
import type { Order, OrderItem, Table, SessionPayment, SessionPaymentItem, Receipt as ReceiptType } from '../types';

type OrderStatus = Order['status'];

const statusConfig: Record<OrderStatus, { labelKey: string; icon: any; color: string; next: OrderStatus | null }> = {
  pending: { labelKey: 'orders.pending', icon: Clock, color: 'badge-warning', next: 'preparing' },
  preparing: { labelKey: 'orders.preparing', icon: ChefHat, color: 'badge-info', next: 'ready' },
  ready: { labelKey: 'orders.ready', icon: CheckCircle, color: 'badge-success', next: 'delivered' },
  delivered: { labelKey: 'orders.completed', icon: Package, color: 'badge-success', next: null },
  cancelled: { labelKey: 'orders.cancelled', icon: Trash2, color: 'badge-danger', next: null },
};

const orderTypeLabelKeys = {
  dine_in: 'orders.dineIn',
  takeaway: 'orders.takeaway',
  delivery: 'orders.delivery',
};

export function Orders() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { checkCanWrite } = useDemoGuard();
  const { user } = useAuth();
  const { smacEnabled } = useSmac();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]); // Sempre oggi per tab "Oggi"
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [showDetails, setShowDetails] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Mappa degli items per ogni ordine (per vista cucina)
  const [allOrderItems, setAllOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [allOrderItemsLoading, setAllOrderItemsLoading] = useState<Record<string, boolean>>({});
  // Card espanse per ogni colonna Kanban (multiple per colonna)
  const EXPANDED_STORAGE_KEY = 'kebab_expanded_orders_v1';
  const [expandedByColumn, setExpandedByColumn] = useState<Record<string, Set<number>>>(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw || '{}');
        return {
          pending: new Set(parsed.pending || []),
          preparing: new Set(parsed.preparing || []),
          ready: new Set(parsed.ready || []),
          delivered: new Set(parsed.delivered || []),
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      pending: new Set(),
      preparing: new Set(),
      ready: new Set(),
      delivered: new Set(),
    };
  });

  const persistExpanded = (state: Record<string, Set<number>>) => {
    try {
      const obj: Record<string, number[]> = {
        pending: Array.from(state.pending || []),
        preparing: Array.from(state.preparing || []),
        ready: Array.from(state.ready || []),
        delivered: Array.from(state.delivered || []),
      };
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  };

  // Edit modal state (full - for history/admin)
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editSessionTotal, setEditSessionTotal] = useState('');
  const [tables] = useState<Table[]>([]);
  const [editForm, setEditForm] = useState({
    order_type: 'dine_in' as Order['order_type'],
    table_id: undefined as number | undefined,
    payment_method: 'cash' as Order['payment_method'],
    customer_name: '',
    customer_phone: '',
    notes: '',
    smac_passed: false,
    status: 'pending' as Order['status'],
    total: 0, // Per modifiche manuali al totale (sconti/arrotondamenti)
    originalTotal: 0, // Per mostrare il totale originale
  });

  // Kanban edit modal state (simplified - for kitchen)
  const [showKanbanEditModal, setShowKanbanEditModal] = useState(false);
  const [kanbanEditItems, setKanbanEditItems] = useState<OrderItem[]>([]);
  const [kanbanEditStatus, setKanbanEditStatus] = useState<Order['status']>('pending');
  const [kanbanEditNotes, setKanbanEditNotes] = useState('');

  // Stato per animazioni fluide kanban
  const [transitioningOrders] = useState<Set<number>>(new Set());

  // Lista Ordini tab state
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<Order['status'] | 'delete' | ''>('');

  // Per mostrare le comande di una sessione nei dettagli (stati gestiti nel modal)

  // Per espandere le sessioni nello storico
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  // Per sapere se stiamo modificando una comanda figlia (non il conto principale)
  const [isEditingChildOrder] = useState(false);

  // Payment modal state (per chiudi conto da storico)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sessionToClose, setSessionToClose] = useState<{ id: number; total: number } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    method: 'cash' as 'cash' | 'card' | 'online',
    smac: false,
  });
  const [changeCalculator, setChangeCalculator] = useState({
    customerGives: '',
  });

  // Cover charge modal state (per conferma coperto prima del pagamento)
  const [showCoverChargeModal, setShowCoverChargeModal] = useState(false);
  const [coverChargeAmount] = useState(0);
  const [coverChargeCovers] = useState(0);
  const [coverChargeUnitPrice] = useState(0);
  const [pendingIncludeCoverCharge, setPendingIncludeCoverCharge] = useState(true);

  // Split bill modal state (per dividere conti da storico)
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showBillStatusModal, setShowBillStatusModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [splitMode, setSplitMode] = useState<'manual' | 'items'>('manual');
  const [sessionPayments, setSessionPayments] = useState<SessionPayment[]>([]);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [allSessionItems, setAllSessionItems] = useState<(OrderItem & { order_number?: number })[]>([]);
  const [remainingSessionItems, setRemainingSessionItems] = useState<(OrderItem & { order_number?: number; remainingQty: number })[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [splitPaymentForm, setSplitPaymentForm] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'card' | 'online',
    notes: '',
    smac: false,
  });
  const [pendingPaidItems, setPendingPaidItems] = useState<SessionPaymentItem[]>([]);
  // Session cover state (per-bill apply)
  const [sessionCovers, setSessionCovers] = useState<number>(0);
  const [_sessionIncludesCover, setSessionIncludesCover] = useState<boolean>(false);
  const [sessionCoverUnitPrice, setSessionCoverUnitPrice] = useState<number>(0);
  // Numero di quote di coperto selezionate nella sezione "Per Prodotto" per il split
  const [coverSelectedCount, setCoverSelectedCount] = useState<number>(0);

  const loadOrdersCallback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders(selectedDate);
      // Also fetch active table sessions and include sessions without orders
      let merged: any[] = data || [];
      try {
        const sessions = await (await import('../lib/database')).getActiveSessions();
        if (sessions && sessions.length > 0) {
          const sessionPlaceholders = sessions
            .filter((s: any) => !(merged || []).some((o: any) => o.session_id === s.id))
            .map((s: any) => ({
              // Use negative id to avoid colliding with real orders
              id: -(s.id),
              date: s.opened_at || new Date().toISOString(),
              total: s.total || 0,
              payment_method: 'cash',
              order_type: 'dine_in',
              pickup_time: null,
              table_id: s.table_id,
              notes: '',
              status: 'pending',
              smac_passed: false,
              customer_name: s.customer_name || '',
              customer_phone: s.customer_phone || '',
              created_at: s.opened_at || new Date().toISOString(),
              session_id: s.id,
              table_name: s.table_name || s.tableName || '',
              // custom flag used only in UI to detect placeholders
              __is_session_placeholder: true,
              session_status: s.status || 'open',
            }));
          merged = [...merged, ...sessionPlaceholders];
        }
      } catch (err) {
        // ignore session fetch errors, keep orders only
        console.error('Error loading active sessions for orders list:', err);
      }
      setOrders(merged);
    } catch (err) {
      console.error('Error loading orders:', err);
      showToast('Errore nel caricamento ordini', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

    // Initial load and external refresh listener
    useEffect(() => {
      loadOrdersCallback();
      const handler = () => loadOrdersCallback();
      window.addEventListener('orders-updated', handler);
      window.addEventListener('table-sessions-updated', handler);
      return () => {
        window.removeEventListener('orders-updated', handler);
        window.removeEventListener('table-sessions-updated', handler);
      };
    }, [loadOrdersCallback]);

  // Ensure that if an order is restored as "expanded" from localStorage
  // we also load its items on mount / when orders are loaded.
  useEffect(() => {
    let mounted = true;
    const statuses = ['pending', 'preparing', 'ready', 'delivered'] as const;

    async function loadExpandedItems() {
      for (const status of statuses) {
        const setIds = expandedByColumn[status];
        if (!setIds || setIds.size === 0) continue;

        for (const id of Array.from(setIds)) {
          const key = String(id);
          // Skip if already loading or already have items
          if (allOrderItemsLoading[key]) continue;
          if (allOrderItems[key] && allOrderItems[key].length > 0) continue;

          const order = orders.find(o => o.id === id);
          if (!order) continue;

          try {
            setAllOrderItemsLoading(prev => ({ ...prev, [key]: true }));
            let items = await getOrderItems(order.id);

            if ((items || []).length === 0 && order.session_id) {
              try {
                const childOrders = await getSessionOrders(order.session_id);
                const childItemsArr = await Promise.all((childOrders || []).map((o: any) => getOrderItems(o.id)));
                items = childItemsArr.flat();
                console.debug('Orders: aggregated items for persisted expanded session', order.session_id, 'count', items.length);
              } catch (e) {
                console.error('Error aggregating session child items on mount:', e);
              }
            }

            if (!mounted) return;
            setAllOrderItems(prev => ({ ...prev, [key]: items || [] }));
          } catch (err) {
            console.error('Error loading expanded order items on mount:', err);
            setAllOrderItems(prev => ({ ...prev, [key]: [] }));
          } finally {
            if (!mounted) return;
            setAllOrderItemsLoading(prev => ({ ...prev, [key]: false }));
          }
        }
      }
    }

    // Only attempt loading when we have orders loaded (avoid running too early)
    if (orders && orders.length > 0) {
      loadExpandedItems();
    }

    return () => { mounted = false; };
  }, [orders, expandedByColumn]);

    // Supabase realtime subscription for orders (keeps kanban in sync)
    useEffect(() => {
      if (!isSupabaseConfigured || !supabase) return;

      let chan: any = null;
      try {
        chan = supabase
          .channel('orders-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (_payload: any) => {
            // Trigger existing refresh mechanism
            window.dispatchEvent(new CustomEvent('orders-updated'));
          });

        // Subscribe
        Promise.resolve(chan.subscribe()).then(() => setIsRealtimeConnected(true)).catch(() => setIsRealtimeConnected(false));
      } catch (err) {
        console.error('Realtime subscribe error:', err);
        setIsRealtimeConnected(false);
      }

      return () => {
        try {
          if (chan) {
            // unsubscribe if supported
            chan.unsubscribe && chan.unsubscribe();
          }
        } catch (err) {
          // ignore
        }
        setIsRealtimeConnected(false);
      };
    }, []);

  // ========== STORICO ORDINI ==========
  async function loadHistoryOrders() {
    setHistoryLoading(true);
    try {
      const data = await getOrdersByDateRange(historyStartDate, historyEndDate);
      setHistoryOrders(data);
      setSelectedOrderIds([]);
      // Carica le sessioni (table_sessions) per il range richiesto
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: sessions } = await supabase
            .from('table_sessions')
            .select('*')
            .gte('created_at', `${historyStartDate}T00:00:00`)
            .lte('created_at', `${historyEndDate}T23:59:59`);
          setHistorySessions(sessions || []);
        } else {
          const raw = localStorage.getItem('kebab_table_sessions') || '[]';
          const sessions = JSON.parse(raw).filter((s: any) => {
            const d = s.created_at || s.date || '';
            return d && d.slice(0,10) >= historyStartDate && d.slice(0,10) <= historyEndDate;
          });
          setHistorySessions(sessions || []);
        }
      } catch (err) {
        console.error('Error loading history sessions:', err);
        setHistorySessions([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      showToast('Errore nel caricamento storico', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSaveSessionTotal() {
    if (!editingSessionId) return;
    if (!checkCanWrite()) return;
    const parsed = parseFloat(editSessionTotal.replace(',', '.')) || 0;
    try {
      await setSessionTotal(editingSessionId, parsed);
      showToast('Totale conto aggiornato', 'success');
      setShowEditSessionModal(false);
      // refresh data
      loadOrdersCallback();
      if (activeTab === 'history') loadHistoryOrders();
    } catch (err) {
      console.error('Error saving session total:', err);
      showToast('Errore nel salvataggio totale conto', 'error');
    }
  }

  // Modal semplificato per cucina (solo stato e note)
  async function openKanbanEditModal(order: Order) {
    // If this is a session placeholder, open the session edit modal instead
    // (session placeholders represent an open table session without real orders)
    // @ts-ignore
    if ((order && (order as any).__is_session_placeholder) && order.session_id) {
      openEditSession(order.session_id);
      return;
    }

    setSelectedOrder(order);
    setKanbanEditStatus(order.status);
    setKanbanEditNotes(order.notes || '');

    // Carica items della comanda
    try {
      const items = await getOrderItems(order.id);
      setKanbanEditItems(items);
    } catch (error) {
      console.error('Error loading order items:', error);
      setKanbanEditItems([]);
    }

    setShowKanbanEditModal(true);
  }

  async function handleSaveKanbanEdit() {
    if (!selectedOrder) return;

    try {
      await updateOrder(selectedOrder.id, {
        status: kanbanEditStatus,
        notes: kanbanEditNotes || undefined,
      });

      // Notifica altri componenti dell'aggiornamento
      window.dispatchEvent(new CustomEvent('orders-updated'));

      showToast('Comanda modificata con successo', 'success');
      setShowKanbanEditModal(false);
      loadOrdersCallback();
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('Errore nella modifica', 'error');
    }
  }

  // Funzioni per modificare i prodotti nella comanda (Kanban)
  async function handleKanbanItemQuantityChange(itemId: number, newQuantity: number) {
    if (newQuantity < 1) return;
    try {
      await updateOrderItem(itemId, { quantity: newQuantity });
      // Aggiorna la lista locale
      setKanbanEditItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
      // Ricalcola il totale dell'ordine
      if (selectedOrder) {
        await recalculateOrderTotal(selectedOrder.id);
      }

      // Notifica altri componenti dell'aggiornamento
      window.dispatchEvent(new CustomEvent('orders-updated'));
    } catch (error) {
      console.error('Error updating item quantity:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  async function handleKanbanItemDelete(itemId: number) {
    if (!confirm('Sei sicuro di voler rimuovere questo prodotto dalla comanda?')) return;
    try {
      await deleteOrderItem(itemId);
      // Rimuovi dalla lista locale
      setKanbanEditItems(prev => prev.filter(item => item.id !== itemId));
      // Ricalcola il totale dell'ordine
      if (selectedOrder) {
        await recalculateOrderTotal(selectedOrder.id);
      }

      // Notifica altri componenti dell'aggiornamento
      window.dispatchEvent(new CustomEvent('orders-updated'));

      showToast('Prodotto rimosso', 'success');
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Errore nella rimozione', 'error');
    }
  }

  async function handleSaveEdit() {
    if (!selectedOrder) return;

    try {
      await updateOrder(selectedOrder.id, {
        order_type: editForm.order_type,
        table_id: editForm.order_type === 'dine_in' ? editForm.table_id : undefined,
        payment_method: editForm.payment_method,
        customer_name: editForm.customer_name || undefined,
        customer_phone: editForm.customer_phone || undefined,
        notes: editForm.notes || undefined,
        smac_passed: editForm.smac_passed,
        status: editForm.status,
        total: editForm.total, // Salva il totale modificato (sconto/arrotondamento)
      });

      showToast('Ordine modificato con successo', 'success');
      setShowEditModal(false);
      loadOrdersCallback();
      if (activeTab === 'history') loadHistoryOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('Errore nella modifica', 'error');
    }
  }

  // Apre il modal di pagamento per chiudere il conto
  async function handleOpenPaymentModal() {
    if (!selectedOrder?.session_id) return;

    try {
      // Carica sessione e tutte le comande della sessione
      const session = await getTableSession(selectedOrder.session_id);
      const allSessionOrders = await getSessionOrders(selectedOrder.session_id);

      // Preferisci `session.total` se presente (sessione può includere coperto)
      const sessionTotal = (session && typeof session.total === 'number')
        ? session.total
        : allSessionOrders.reduce((sum, o) => sum + o.total, 0);

      // Se la sessione ha totale a 0, chiudi direttamente senza aprire modal coperto/pagamento
      if (session && (session.total || 0) === 0) {
        const confirmed = window.confirm('Vuoi chiudere questo conto a €0.00?');
        if (confirmed) {
          try {
            await closeTableSession(session.id, 'cash', false, false);
            showToast('Conto chiuso con successo', 'success');
            // Aggiorna lista
            loadOrdersCallback();
            if (activeTab === 'history') loadHistoryOrders();
          } catch (err) {
            console.error('Error closing zero-total session from Orders:', err);
            showToast('Errore nella chiusura del conto', 'error');
          }
        }
        return;
      }

      setSessionToClose({ id: selectedOrder.session_id, total: sessionTotal });

      // Controlla se c'è un coperto configurato e imposta lo stato della sessione
      const settings = await getSettings();
      const coverCharge = settings.cover_charge || 0;
      const covers = session?.covers || 0;
      setSessionCovers(covers);
      setSessionCoverUnitPrice(coverCharge);

      // Determina se il coperto è già applicato (confrontando il totale della sessione)
      const expectedWithCover = (allSessionOrders.reduce((sum, o) => sum + o.total, 0)) + coverCharge * covers;
      const applied = Math.abs((session?.total || 0) - expectedWithCover) < 0.01 || (session?.total || 0) >= expectedWithCover - 0.01;
      setSessionIncludesCover(applied && coverCharge > 0 && covers > 0);

      // Procedi al pagamento usando lo stato corrente della checkbox (non aprire più il modal separato)
      proceedToPayment(applied && coverCharge > 0 && covers > 0);
    } catch (error) {
      console.error('Error loading session orders:', error);
      showToast('Errore nel caricamento del conto', 'error');
    }
  }

  // Procede al pagamento dopo la scelta sul coperto
  function proceedToPayment(includeCover: boolean) {
    setPendingIncludeCoverCharge(includeCover);
    setShowCoverChargeModal(false);
    setPaymentForm({ method: 'cash', smac: false });
    setChangeCalculator({ customerGives: '' });
    setShowEditModal(false);
    setShowPaymentModal(true);
  }


  // Conferma la chiusura del conto con il metodo di pagamento selezionato
  async function confirmCloseSession() {
    if (!sessionToClose) return;

    try {
      await closeTableSession(
        sessionToClose.id,
        paymentForm.method,
        paymentForm.smac,
        pendingIncludeCoverCharge
      );

      // Aggiorna lo stato di tutti gli ordini della sessione a consegnato
      if (selectedOrder) {
        await updateOrderStatus(selectedOrder.id, 'delivered', user?.name);
      }

      showToast('Conto chiuso con successo', 'success');
      setShowPaymentModal(false);
      setSessionToClose(null);
      loadOrdersCallback();
      if (activeTab === 'history') loadHistoryOrders();
    } catch (error) {
      console.error('Error closing session:', error);
      showToast('Errore nella chiusura del conto', 'error');
    }
  }

  // ========== SPLIT BILL FUNCTIONS ==========
  async function handleOpenSplitModal() {
    if (!selectedOrder?.session_id) return;

    try {
      const allSessionOrders = await getSessionOrders(selectedOrder.session_id);
      const sessionTotal = allSessionOrders.reduce((sum, o) => sum + o.total, 0);
      const [payments, remaining, paidQtys] = await Promise.all([
        getSessionPayments(selectedOrder.session_id),
        getSessionRemainingAmount(selectedOrder.session_id),
        getSessionPaidQuantities(selectedOrder.session_id),
      ]);

      // Carica tutti gli items di tutte le comande
      const allItems: (OrderItem & { order_number?: number })[] = [];
      for (const order of allSessionOrders) {
        const items = await getOrderItems(order.id);
        items.forEach(item => {
          allItems.push({ ...item, order_number: order.order_number || 1 });
        });
      }

      setAllSessionItems(allItems);
      setSessionPayments(payments);
      setRemainingAmount(remaining);

      // Calcola items rimanenti
      const remainingItems = allItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(remainingItems);
      // Imposta stato coperto per il modal di split
      try {
        const session = await getTableSession(selectedOrder.session_id);
        const settings = await getSettings();
        const covers = session?.covers || 0;
        const coverUnit = settings.cover_charge || 0;
        const ordersTotal = allSessionOrders.reduce((sum, o) => sum + o.total, 0);
        const expectedWithCover = ordersTotal + coverUnit * covers;
        const applied = Math.abs((session?.total || 0) - expectedWithCover) < 0.01 || (session?.total || 0) >= expectedWithCover - 0.01;
        setSessionCovers(covers);
        setSessionCoverUnitPrice(coverUnit);
        setSessionIncludesCover(applied && coverUnit > 0 && covers > 0);

        // Set the session total preview to include coperto configured at session open
        const baseTotal = (applied && (session?.total || 0) > 0) ? (session?.total || sessionTotal) : (sessionTotal + coverUnit * covers);
        setSessionToClose({ id: selectedOrder.session_id, total: baseTotal });
      } catch (err) {
        console.error('Error loading session info for split modal:', err);
      }
      setSplitPaymentForm({ amount: '', method: 'cash', notes: '', smac: false });
      setSplitMode('manual');
      setSelectedItems({});
      setCoverSelectedCount(0);
      setChangeCalculator({ customerGives: '' });
      setPendingPaidItems([]);

      setShowDetails(false);
      setShowSplitModal(true);
    } catch (error) {
      console.error('Error loading split data:', error);
      showToast('Errore nel caricamento dati', 'error');
    }
  }

  async function handleOpenBillStatus() {
    if (!selectedOrder?.session_id) return;

    try {
      const [payments, remaining, paidQtys] = await Promise.all([
        getSessionPayments(selectedOrder.session_id),
        getSessionRemainingAmount(selectedOrder.session_id),
        getSessionPaidQuantities(selectedOrder.session_id),
      ]);

      const allSessionOrders = await getSessionOrders(selectedOrder.session_id);
      const sessionTotal = allSessionOrders.reduce((sum, o) => sum + o.total, 0);

      // Carica info sessione e imposta stato coperto
      try {
        const session = await getTableSession(selectedOrder.session_id);
        const settings = await getSettings();
        const covers = session?.covers || 0;
        const coverUnit = settings.cover_charge || 0;
        const expectedWithCover = sessionTotal + coverUnit * covers;
        const applied = Math.abs((session?.total || 0) - expectedWithCover) < 0.01 || (session?.total || 0) >= expectedWithCover - 0.01;
        setSessionCovers(covers);
        setSessionCoverUnitPrice(coverUnit);
        setSessionIncludesCover(applied && coverUnit > 0 && covers > 0);
      } catch (err) {
        console.error('Error loading session info for bill status modal:', err);
      }

      // Carica tutti gli items per mostrare i rimanenti
      const allItems: (OrderItem & { order_number?: number })[] = [];
      for (const order of allSessionOrders) {
        const items = await getOrderItems(order.id);
        items.forEach(item => {
          allItems.push({ ...item, order_number: order.order_number || 1 });
        });
      }

      setAllSessionItems(allItems);
      setSessionPayments(payments);
      setRemainingAmount(remaining);
      setSessionToClose({ id: selectedOrder.session_id, total: sessionTotal });

      // Calcola items rimanenti
      const remainingItems = allItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(remainingItems);

      setShowDetails(false);
      setShowBillStatusModal(true);
    } catch (error) {
      console.error('Error loading bill status:', error);
      showToast('Errore nel caricamento stato conto', 'error');
    }
  }

  function calculateSelectedItemsTotal(): number {
    return Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
      const item = remainingSessionItems.find(i => i.id === Number(itemId));
      if (item && qty > 0) {
        return sum + (item.price * qty);
      }
      return sum;
    }, 0);
  }

  function incrementItemSelection(itemId: number) {
    const item = remainingSessionItems.find(i => i.id === itemId);
    if (!item) return;
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      if (current < item.remainingQty) {
        return { ...prev, [itemId]: current + 1 };
      }
      return prev;
    });
  }

  function decrementItemSelection(itemId: number) {
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      if (current > 0) {
        const newValue = current - 1;
        if (newValue === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [itemId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [itemId]: newValue };
      }
      return prev;
    });
  }

  

  function applyItemsSelection() {
    const itemsTotal = calculateSelectedItemsTotal();
    const coverTotal = (coverSelectedCount || 0) * (sessionCoverUnitPrice || 0);
    const amount = itemsTotal + coverTotal;
    if (amount > 0 && amount <= remainingAmount) {
      const parts: string[] = Object.entries(selectedItems)
        .map(([itemId, qty]) => {
          const item = remainingSessionItems.find(i => i.id === Number(itemId));
          return item ? `${qty}x ${item.menu_item_name}` : '';
        })
        .filter(Boolean);
      if (coverSelectedCount && coverSelectedCount > 0) {
        parts.push(`${coverSelectedCount}x Coperto`);
      }
      const itemDescriptions = parts.join(', ');

      const paidItems: SessionPaymentItem[] = Object.entries(selectedItems)
        .map(([itemId, qty]) => {
          const item = remainingSessionItems.find(i => i.id === Number(itemId));
          if (!item) return null;
          return {
            order_item_id: item.id,
            quantity: qty,
            menu_item_name: item.menu_item_name,
            price: item.price,
          };
        })
        .filter((item): item is SessionPaymentItem => item !== null);

      if (coverSelectedCount && coverSelectedCount > 0) {
        paidItems.push({
          // Coperto is a session-level item, not tied to a specific order_item
          order_item_id: undefined as any,
          quantity: coverSelectedCount,
          menu_item_name: 'Coperto',
          price: sessionCoverUnitPrice,
        } as SessionPaymentItem);
      }

      setPendingPaidItems(paidItems);
      setSplitPaymentForm(prev => ({
        ...prev,
        amount: Math.min(amount, remainingAmount).toFixed(2),
        notes: itemDescriptions.length > 40 ? itemDescriptions.substring(0, 40) + '...' : itemDescriptions
      }));
      setSplitMode('manual');
      setSelectedItems({});
      setCoverSelectedCount(0);
    }
  }

  function calculateSplitChange(): number {
    const customerGives = parseFloat(changeCalculator.customerGives) || 0;
    const paymentAmount = parseFloat(splitPaymentForm.amount) || 0;
    return Math.max(0, customerGives - paymentAmount);
  }

  async function addSplitPaymentFromOrders() {
    if (!sessionToClose) {
      showToast('Sessione non trovata', 'error');
      return;
    }
    const amount = parseFloat(splitPaymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Inserisci un importo valido', 'warning');
      return;
    }
    if (amount > remainingAmount + 0.01) { // Tolleranza per arrotondamenti
      showToast('Importo superiore al rimanente', 'warning');
      return;
    }

    try {
      // Aggiungi il pagamento
      await addSessionPayment(
        sessionToClose.id,
        amount,
        splitPaymentForm.method,
        splitPaymentForm.notes || undefined,
        splitPaymentForm.smac,
        pendingPaidItems.length > 0 ? pendingPaidItems : undefined
      );

      // Ricarica i dati della sessione
      const [payments, remaining, paidQtys] = await Promise.all([
        getSessionPayments(sessionToClose.id),
        getSessionRemainingAmount(sessionToClose.id),
        getSessionPaidQuantities(sessionToClose.id),
      ]);
      setSessionPayments(payments);
      setRemainingAmount(remaining);

      const updatedRemaining = allSessionItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(updatedRemaining);

      setSplitPaymentForm({ amount: '', method: 'cash', notes: '', smac: false });
      setPendingPaidItems([]);
      showToast('Pagamento aggiunto', 'success');

      // Se il conto è saldato, chiudi la sessione
      if (remaining <= 0.01) { // Tolleranza per arrotondamenti
        try {
          await closeTableSession(sessionToClose.id, 'split', false);
          showToast('Conto saldato e chiuso', 'success');
          setShowSplitModal(false);
          loadOrdersCallback();
          if (activeTab === 'history') loadHistoryOrders();
        } catch (closeError) {
          console.error('Error closing session:', closeError);
          // Il pagamento è stato aggiunto, solo la chiusura ha fallito
          showToast('Pagamento aggiunto, ma errore nella chiusura automatica', 'warning');
        }
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      showToast('Errore nell\'aggiunta pagamento', 'error');
    }
  }

  async function handlePrintPaymentReceipt(payment: SessionPayment) {
    try {
      const receipt = await generatePartialReceipt(payment);
      if (receipt) {
        setSelectedReceipt(receipt);
        setShowReceiptModal(true);
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      showToast('Errore nella generazione scontrino', 'error');
    }
  }

  function printReceipt() {
    if (!selectedReceipt) return;
    const printContent = `
      <html>
        <head>
          <title>Scontrino</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .shop-name { font-size: 18px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${selectedReceipt.shop_info.name}</div>
            ${selectedReceipt.shop_info.address ? `<div>${selectedReceipt.shop_info.address}</div>` : ''}
            ${selectedReceipt.shop_info.phone ? `<div>Tel: ${selectedReceipt.shop_info.phone}</div>` : ''}
          </div>
          <div class="divider"></div>
          <div>Data: ${selectedReceipt.date} ${selectedReceipt.time}</div>
          <div class="divider"></div>
          ${selectedReceipt.items.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.name}</span>
              <span>€${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item total">
            <span>TOTALE</span>
            <span>€${selectedReceipt.total.toFixed(2)}</span>
          </div>
          <div>Pagamento: ${selectedReceipt.payment_method === 'cash' ? 'Contanti' : selectedReceipt.payment_method === 'card' ? 'Carta' : 'Online'}</div>
          ${smacEnabled && selectedReceipt.smac_passed ? '<div>SMAC: Sì</div>' : ''}
          <div class="divider"></div>
          <div class="footer">Grazie e arrivederci!</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function toggleOrderSelection(orderId: number) {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  }

  // Helpers mancanti (implementazioni minime per la view Orders)
  function viewOrderDetails(order: Order) {
    setSelectedOrder(order);
    setShowDetails(true);
  }

  function openEditModal(order: Order) {
    // If it's a session placeholder, open session edit modal
    // @ts-ignore
    if ((order && (order as any).__is_session_placeholder) && order.session_id) {
      openEditSession(order.session_id);
      return;
    }

    setSelectedOrder(order);
    setEditForm({
      order_type: order.order_type,
      table_id: order.table_id ?? undefined,
      payment_method: order.payment_method ?? 'cash',
      customer_name: order.customer_name ?? '',
      customer_phone: order.customer_phone ?? '',
      notes: order.notes ?? '',
      smac_passed: order.smac_passed ?? false,
      status: order.status,
      total: order.total ?? 0,
      originalTotal: order.total ?? 0,
    });
    setShowEditModal(true);
  }

  async function openEditSession(sessionId: number) {
    setEditingSessionId(sessionId);
    try {
      const session = await getTableSession(sessionId);
      setEditSessionTotal(String(session?.total ?? 0));
    } catch (err) {
      console.error('Error loading session for edit:', err);
      setEditSessionTotal('0');
    }
    setShowEditSessionModal(true);
  }

  async function handleDelete(orderId: number, _sessionId?: number | null) {
    if (!confirm('Sei sicuro di eliminare questa comanda?')) return;
    try {
      await deleteOrder(orderId, user?.name);
      showToast('Comanda eliminata', 'success');
      loadOrdersCallback();
      if (activeTab === 'history') loadHistoryOrders();
    } catch (err) {
      console.error('Error deleting order:', err);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  async function handleDeleteSession(sessionId: number) {
    if (!confirm('Sei sicuro di eliminare questo conto (sessione)?')) return;
    try {
      await deleteTableSession(sessionId);
      showToast('Conto eliminato', 'success');
      loadOrdersCallback();
      if (activeTab === 'history') loadHistoryOrders();
    } catch (err) {
      console.error('Error deleting session:', err);
      showToast('Errore nell\'eliminazione conto', 'error');
    }
  }

  function handleAddOrder() {
    navigate('/orders/new');
  }

  function handleTransfer() {
    // Apri la vista Tavoli per gestire trasferimenti
    navigate('/tables');
  }

  async function handleStatusChange(order: Order) {
    const cfg = statusConfig[order.status as keyof typeof statusConfig];
    const next = cfg?.next;
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next, user?.name);
      showToast('Stato aggiornato', 'success');
      loadOrdersCallback();
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Errore nell\'aggiornamento stato', 'error');
    }
  }

  function toggleSelectAll() {
    const filteredIds = filteredHistoryOrders.map(o => o.id);
    const allSelected = filteredIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  }

  async function handleBulkAction() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (selectedOrderIds.length === 0) {
      showToast('Seleziona almeno un ordine', 'warning');
      return;
    }

    if (bulkAction === 'delete') {
      if (!confirm(`Sei sicuro di voler eliminare ${selectedOrderIds.length} ordini?`)) return;
      try {
        await deleteOrdersBulk(selectedOrderIds, user?.name);
        showToast(`${selectedOrderIds.length} ordini eliminati`, 'success');
        setSelectedOrderIds([]);
        loadHistoryOrders();
      } catch (error) {
        console.error('Error deleting orders:', error);
        showToast('Errore nell\'eliminazione', 'error');
      }
    } else if (bulkAction) {
      try {
        await updateOrderStatusBulk(selectedOrderIds, bulkAction as Order['status'], user?.name);
        showToast(`${selectedOrderIds.length} ordini aggiornati a "${t(statusConfig[bulkAction as keyof typeof statusConfig]?.labelKey) || bulkAction}"`, 'success');
        setSelectedOrderIds([]);
        loadHistoryOrders();
      } catch (error) {
        console.error('Error updating orders:', error);
        showToast('Errore nell\'aggiornamento', 'error');
      }
    }
    setBulkAction('');
  }

  const filteredHistoryOrders = historyOrders.filter(order => {
    if (historyStatusFilter !== 'all' && order.status !== historyStatusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        order.id.toString().includes(search) ||
        order.customer_name?.toLowerCase().includes(search) ||
        order.table_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Raggruppa gli ordini per session_id (se presente)
  // Gli ordini senza session_id vengono mostrati singolarmente
  interface GroupedHistoryEntry {
    type: 'session' | 'single';
    sessionId?: number;
    orders: Order[];
    total: number;
    tableName?: string;
    customerName?: string;
    date: string;
    createdAt: string;
    sessionStatus?: 'open' | 'closed' | 'paid';
  }

  const groupedHistoryOrders: GroupedHistoryEntry[] = (() => {
    const sessionMap: Record<number, Order[]> = {};
    const singleOrders: Order[] = [];

    filteredHistoryOrders.forEach(order => {
      if (order.session_id) {
        if (!sessionMap[order.session_id]) {
          sessionMap[order.session_id] = [];
        }
        sessionMap[order.session_id].push(order);
      } else {
        singleOrders.push(order);
      }
    });

    const result: GroupedHistoryEntry[] = [];

    // Aggiungi le sessioni raggruppate
    Object.entries(sessionMap).forEach(([sessionId, orders]) => {
      const firstOrder = orders[0];
      const total = orders.reduce((sum, o) => sum + o.total, 0);
      result.push({
        type: 'session',
        sessionId: Number(sessionId),
        orders: orders.sort((a, b) => (a.order_number || 0) - (b.order_number || 0)),
        total,
        tableName: firstOrder.table_name,
        customerName: firstOrder.customer_name,
        date: firstOrder.date,
        createdAt: firstOrder.created_at,
        sessionStatus: firstOrder.session_status,
      });
    });

    // Aggiungi gli ordini singoli
    singleOrders.forEach(order => {
      result.push({
        type: 'single',
        orders: [order],
        total: order.total,
        tableName: order.table_name,
        customerName: order.customer_name,
        date: order.date,
        createdAt: order.created_at,
      });
    });

    // Includi le sessioni senza comande (aperte nel range ma senza ordini)
    if (historySessions && historySessions.length > 0) {
      historySessions.forEach((s) => {
        const sid = s.id || s.session_id;
        if (!sessionMap[sid]) {
          result.push({
            type: 'session',
            sessionId: Number(sid),
            orders: [],
            total: s.total || 0,
            tableName: s.table_name || s.tableName,
            customerName: s.customer_name || s.customerName,
            date: s.created_at || s.date || new Date().toISOString(),
            createdAt: s.created_at || s.date || new Date().toISOString(),
            sessionStatus: s.status || 'open',
          });
        }
      });
    }

    // Ordina per data/ora di creazione (più recenti prima)
    return result.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  })();

  function toggleSessionExpand(sessionId: number) {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  const ordersByStatus = {
    pending: orders.filter((o) => o.status === 'pending'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready'),
    delivered: orders.filter((o) => o.status === 'delivered'),
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Header compatto - tutto in una riga su desktop */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 md:gap-4">
        {/* Titolo + Tabs inline su desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">{t('orders.title')}</h1>

          {/* Tabs inline */}
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('common.today')}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                if (historyOrders.length === 0) loadHistoryOrders();
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('orders.history')}</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Realtime connection status - solo icona */}
          {isSupabaseConfigured && (
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs ${
              isRealtimeConnected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`} title={isRealtimeConnected ? 'Connesso in tempo reale' : 'Non connesso'}>
              {isRealtimeConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
          )}
          <button onClick={loadOrdersCallback} className="btn-secondary p-2" title="Aggiorna">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/orders/new" className="btn-primary py-1.5 px-3 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('orders.newOrder')}</span>
          </Link>
        </div>
      </div>

      {/* SMAC alerts removed from Orders: moved to the SMAC page */}

      {activeTab === 'today' && (
        <>
      {loading && transitioningOrders.size === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        /* Kanban View - items-start per evitare che le colonne si allineino in altezza */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
          {(['pending', 'preparing', 'ready', 'delivered'] as const).map((status) => {
            const config = statusConfig[status];
            const statusOrders = ordersByStatus[status];
            const Icon = config.icon;

            return (
              <div key={status} className="card self-start">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-semibold text-sm sm:text-base">{t(config.labelKey)}</span>
                  </div>
                  <span className={config.color}>{statusOrders.length}</span>
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  {statusOrders.length === 0 ? (
                    <p className="text-dark-500 text-center py-4 text-sm">
                      {t('orders.noActiveOrders')}
                    </p>
                  ) : (
                    statusOrders.map((order) => {
                      const isExpanded = expandedByColumn[status]?.has(order.id) || false;
                      const toggleExpand = async () => {
                        // Compute desired expansion based on current state to avoid closure race
                        const currentlyExpanded = expandedByColumn[status]?.has(order.id) || false;
                        const willExpand = !currentlyExpanded;

                        setExpandedByColumn(prev => {
                          const newSet = new Set(prev[status] || []);
                          if (willExpand) newSet.add(order.id); else newSet.delete(order.id);
                          const newState = { ...prev, [status]: newSet };
                          try { persistExpanded(newState); } catch (e) { /* ignore */ }
                          return newState;
                        });

                        // If we are expanding and don't have the items yet, fetch them
                        const key = String(order.id);
                        if (willExpand && !(allOrderItems[key] && allOrderItems[key].length > 0)) {
                          try {
                            setAllOrderItemsLoading(prev => ({ ...prev, [key]: true }));
                            console.debug('Orders: expanding', order.id, 'status', status, 'session_id', order.session_id);
                            let items = await getOrderItems(order.id);

                            // If no items found and this is a session parent, aggregate items from child orders
                            if ((items || []).length === 0 && order.session_id) {
                              try {
                                const childOrders = await getSessionOrders(order.session_id);
                                const childItemsArr = await Promise.all((childOrders || []).map((o: any) => getOrderItems(o.id)));
                                items = childItemsArr.flat();
                                console.debug('Aggregated items from session', order.session_id, 'count', items.length);
                              } catch (e) {
                                console.error('Error aggregating session child items:', e);
                              }
                            }

                            setAllOrderItems(prev => ({ ...prev, [key]: items || [] }));
                          } catch (err) {
                            console.error('Error loading order items for expand:', err);
                            setAllOrderItems(prev => ({ ...prev, [key]: [] }));
                          } finally {
                            setAllOrderItemsLoading(prev => ({ ...prev, [key]: false }));
                          }
                        }
                      };

                      return (
                        <div
                          key={order.id}
                          className={`bg-dark-900 rounded-xl overflow-hidden ${transitioningOrders.has(order.id) ? 'order-transitioning' : ''}`}
                        >
                          {/* Header compatto - sempre visibile */}
                          <div
                            onClick={toggleExpand}
                            className="px-2 py-1.5 sm:px-3 sm:py-2 cursor-pointer hover:bg-dark-800 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-1 sm:gap-2">
                              {/* ID + Titolo + Cliente su una riga */}
                              <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                                <span className="text-[10px] sm:text-xs font-mono bg-dark-700 px-1 sm:px-1.5 py-0.5 rounded text-dark-300 flex-shrink-0">
                                  #{order.id}
                                </span>
                                <span className="font-medium text-white text-xs sm:text-sm truncate">
                                  {order.session_id
                                    ? `${order.table_name}${order.customer_name ? ` - ${order.customer_name}` : ''}${order.order_number ? ` - C${order.order_number}` : ''}`
                                    : order.table_name
                                    ? `${t(orderTypeLabelKeys[order.order_type])} - ${order.table_name}${order.customer_name ? ` - ${order.customer_name}` : ''}`
                                    : order.customer_name
                                    ? `${t(orderTypeLabelKeys[order.order_type])} - ${order.customer_name}`
                                    : `${t(orderTypeLabelKeys[order.order_type])}`}
                                </span>
                              </div>
                              {/* Chevron e indicatore items */}
                              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {allOrderItems[String(order.id)] && (
                                  <span className="text-[10px] sm:text-xs text-dark-400 hidden xs:inline">
                                    {allOrderItems[String(order.id)].length} item
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-dark-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Contenuto espanso con animazione */}
                          <div
                            className={`overflow-hidden transition-all duration-200 ease-in-out ${
                              isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="px-2 pb-1.5 space-y-1">
                              {/* Items dell'ordine con note piatto visibili */}
                              {allOrderItemsLoading[String(order.id)] ? (
                                <div className="py-2 text-center text-sm text-dark-400">Caricamento…</div>
                              ) : allOrderItems[String(order.id)] && allOrderItems[String(order.id)].length > 0 ? (
                                <div className="bg-dark-800 rounded p-1.5 mt-1">
                                  {allOrderItems[String(order.id)].map((item) => (
                                    <div key={item.id} className="leading-snug mb-1 last:mb-0">
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <span className="font-bold text-primary-400">{item.quantity}x</span>
                                        <span className="text-white truncate">{item.menu_item_name}</span>
                                      </div>
                                      {item.notes && (
                                        <p className="text-[10px] text-amber-400 ml-5 truncate">⚠️ {item.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {/* Note ordine - inline */}
                              {order.notes && (
                                <p className="text-[9px] text-dark-400 truncate">📝 {order.notes}</p>
                              )}

                              {/* Pulsanti azione - mini */}
                              <div className="flex items-center gap-1">
                                {config.next && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(order);
                                    }}
                                    className="btn-success flex-1 text-[10px] py-1 px-2 rounded"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>{status === 'pending' ? 'Prepara' : status === 'preparing' ? 'Pronto' : 'Consegna'}</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openKanbanEditModal(order);
                                  }}
                                  className="btn-secondary p-1 rounded"
                                  title="Modifica"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* STORICO TAB */}
      {activeTab === 'history' && (
        <div className="space-y-3 sm:space-y-4">
          {/* History Filters */}
          <div className="card p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 sm:gap-4">
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <div>
                  <label className="label text-xs sm:text-sm">{t('common.from')}</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs sm:text-sm">{t('common.to')}</label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:contents gap-2">
                <div>
                  <label className="label text-xs sm:text-sm">{t('common.status')}</label>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="select text-sm"
                  >
                    <option value="all">{t('common.all')}</option>
                    <option value="pending">{t('orders.pending')}</option>
                    <option value="preparing">{t('orders.preparing')}</option>
                    <option value="ready">{t('orders.ready')}</option>
                    <option value="delivered">{t('orders.completed')}</option>
                    <option value="cancelled">{t('orders.cancelled')}</option>
                  </select>
                </div>
                <div className="flex items-end gap-2 sm:hidden">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setHistoryStartDate(today);
                      setHistoryEndDate(today);
                      setTimeout(() => loadHistoryOrders(), 0);
                    }}
                    className="btn-secondary flex-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Oggi</span>
                  </button>
                  <button onClick={loadHistoryOrders} className="btn-primary flex-1">
                    <Filter className="w-4 h-4" />
                    <span>Filtra</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <label className="label text-xs sm:text-sm">{t('common.search')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="text"
                    placeholder="ID, cliente, tavolo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setHistoryStartDate(today);
                  setHistoryEndDate(today);
                  // Trigger load after state update
                  setTimeout(() => loadHistoryOrders(), 0);
                }}
                className="btn-secondary hidden sm:flex"
              >
                <Calendar className="w-4 h-4" />
                <span>Oggi</span>
              </button>
              <button onClick={loadHistoryOrders} className="btn-primary hidden sm:flex">
                <Filter className="w-4 h-4" />
                <span>Filtra</span>
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrderIds.length > 0 && (
            <div className="card p-3 sm:p-4 bg-primary-500/10 border border-primary-500/30">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <p className="text-primary-400 font-medium text-sm sm:text-base">
                  {selectedOrderIds.length} ordini selezionati
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as Order['status'] | 'delete' | '')}
                    className="select text-sm"
                  >
                    <option value="">Seleziona azione...</option>
                    <option value="pending">Imposta In Attesa</option>
                    <option value="preparing">Imposta In Preparazione</option>
                    <option value="ready">Imposta Pronto</option>
                    <option value="delivered">Imposta Consegnato</option>
                    <option value="cancelled">Imposta Annullato</option>
                    <option value="delete">🗑️ Elimina</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className="btn-primary flex-1 sm:flex-none disabled:opacity-50 text-sm"
                    >
                      Applica
                    </button>
                    <button
                      onClick={() => setSelectedOrderIds([])}
                      className="btn-secondary flex-1 sm:flex-none text-sm"
                    >
                      Deseleziona
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          {historyLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-sm font-medium text-white">
                  {groupedHistoryOrders.length} ordini/conti
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-primary-400"
                >
                  {filteredHistoryOrders.every(o => selectedOrderIds.includes(o.id)) ? 'Deseleziona' : 'Seleziona tutti'}
                </button>
              </div>
              {groupedHistoryOrders.length === 0 ? (
                <div className="card p-6 text-center text-dark-400">
                  <p className="text-sm">Nessun ordine trovato</p>
                </div>
              ) : (
                groupedHistoryOrders.map((entry) => {
                  // Treat any grouped session entry as a session row (even if it has 0/1 orders)
                  const isSession = entry.type === 'session';
                  const firstOrder = entry.orders[0];
                  const isExpanded = isSession && expandedSessions.has(entry.sessionId!);
                  const allOrdersSelected = entry.orders.every(o => selectedOrderIds.includes(o.id));

                  return (
                    <div key={isSession ? `session-${entry.sessionId}` : `single-${firstOrder.id}`} className="mb-2">
                      <div className="card overflow-hidden">
                      {/* Main row */}
                      <div
                        className={`p-3 ${isSession ? 'cursor-pointer' : ''} ${allOrdersSelected ? 'bg-primary-500/10' : ''}`}
                        onClick={isSession ? () => toggleSessionExpand(entry.sessionId!) : undefined}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSession) {
                                if (allOrdersSelected) {
                                  setSelectedOrderIds(prev => prev.filter(id => !entry.orders.some(o => o.id === id)));
                                } else {
                                  setSelectedOrderIds(prev => [...new Set([...prev, ...entry.orders.map(o => o.id)])]);
                                }
                              } else {
                                toggleOrderSelection(firstOrder.id);
                              }
                            }}
                            className="p-0.5 flex-shrink-0 mt-0.5"
                          >
                            {allOrdersSelected || selectedOrderIds.includes(firstOrder.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary-400" />
                            ) : (
                              <Square className="w-4 h-4 text-dark-500" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isSession && (
                                  isExpanded ? <ChevronDown className="w-4 h-4 text-primary-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-dark-400 flex-shrink-0" />
                                )}
                                <span className="font-medium text-white text-sm truncate">
                                  {isSession ? `Conto - ${entry.tableName}` : `#${firstOrder.id}`}
                                </span>
                                {isSession && (
                                  <span className="text-xs text-dark-400">
                                    ({entry.orders.length} com. #{entry.orders.map(o => o.id).join(', #')})
                                  </span>
                                )}
                              </div>
                              <span className="font-semibold text-primary-400 flex-shrink-0">{formatPrice(entry.total)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-2 text-xs text-dark-400 flex-wrap">
                                <span>
                                  {new Date(entry.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                </span>
                                <span>•</span>
                                <span>{t(orderTypeLabelKeys[firstOrder.order_type])}</span>
                                {entry.tableName && !isSession && <span>• {entry.tableName}</span>}
                                {entry.customerName && <span className="text-white">• {entry.customerName}</span>}
                              </div>
                              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${statusConfig[firstOrder.status]?.color || 'badge-secondary'}`}>
                                {isSession ? (entry.sessionStatus === 'open' ? 'Aperto' : 'Chiuso') : t(statusConfig[firstOrder.status]?.labelKey)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-dark-700">
                          <button onClick={(e) => { e.stopPropagation(); viewOrderDetails(firstOrder); }} className="btn-secondary btn-sm flex-1 justify-center text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            Dettagli
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(firstOrder); }} className="btn-secondary btn-sm flex-1 justify-center text-xs">
                            <Edit2 className="w-3.5 h-3.5" />
                            Modifica
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSession && entry.sessionId) {
                                handleDeleteSession(entry.sessionId);
                              } else {
                                handleDelete(firstOrder.id, firstOrder.session_id);
                              }
                            }}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Expanded session orders */}
                      {isSession && isExpanded && (
                        <div className="bg-dark-900/50 border-t border-dark-700 animate-fadeIn">
                          {entry.orders.map((order) => (
                            <div key={order.id} className={`px-3 py-2 border-b border-dark-800 last:border-b-0 ${selectedOrderIds.includes(order.id) ? 'bg-primary-500/10' : ''}`}>
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleOrderSelection(order.id)} className="p-0.5">
                                  {selectedOrderIds.includes(order.id) ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-primary-400" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-dark-500" />
                                  )}
                                </button>
                                <span className="text-dark-500">└</span>
                                <span className="font-mono text-dark-300 text-xs">#{order.id}</span>
                                <span className="text-xs text-dark-500">Comanda {order.order_number || 1}</span>
                                <span className="ml-auto text-xs text-dark-300">{formatPrice(order.total)}</span>
                                <span className={`${statusConfig[order.status]?.color || 'badge-secondary'} text-[10px]`}>
                                  {t(statusConfig[order.status]?.labelKey)}
                                </span>
                              </div>

                              {/* Action buttons for child orders (mobile) */}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => viewOrderDetails(order)}
                                  className="btn-ghost btn-sm px-3 py-2 flex-1"
                                  title="Visualizza comanda"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span className="ml-2 text-xs">Dettagli</span>
                                </button>
                                <button
                                  onClick={() => openKanbanEditModal(order)}
                                  className="btn-ghost btn-sm px-3 py-2 flex-1"
                                  title="Modifica comanda"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  <span className="ml-2 text-xs">Modifica</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(order.id, order.session_id)}
                                  className="btn-ghost btn-sm px-3 py-2 text-red-400 hover:text-red-300"
                                  title="Elimina"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          const covers = sessionCovers || 1;
                          const amt = (sessionToClose?.total ?? 0) / covers;
                          setSplitPaymentForm(prev => ({ ...prev, amount: amt.toFixed(2), notes: `Alla romana (${covers} pers.)` }));
                        }}
                        className="px-3 py-1 text-sm bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        Alla Romana (€{sessionToClose ? (sessionToClose.total / (sessionCovers || 1)).toFixed(2) : '0.00'})
                      </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="card hidden sm:block">
              <div className="card-header flex items-center justify-between">
                <span className="font-semibold text-white">
                  {groupedHistoryOrders.length} {groupedHistoryOrders.length === 1 ? 'ordine/conto' : 'ordini/conti'} ({filteredHistoryOrders.length} comande)
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  {filteredHistoryOrders.every(o => selectedOrderIds.includes(o.id))
                    ? 'Deseleziona tutti'
                    : 'Seleziona tutti'}
                </button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th className="w-10"></th>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Tavolo/Cliente</th>
                      <th>Totale</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedHistoryOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-dark-400">
                          Nessun ordine trovato per il periodo selezionato
                        </td>
                      </tr>
                    ) : (
                      groupedHistoryOrders.map((entry) => {
                        // Ordine singolo
                        if (entry.type === 'single') {
                          const order = entry.orders[0];
                          return (
                            <tr key={`single-${order.id}`} className={selectedOrderIds.includes(order.id) ? 'bg-primary-500/10' : ''}>
                              <td>
                                <button
                                  onClick={() => toggleOrderSelection(order.id)}
                                  className="p-1"
                                >
                                  {selectedOrderIds.includes(order.id) ? (
                                    <CheckSquare className="w-5 h-5 text-primary-400" />
                                  ) : (
                                    <Square className="w-5 h-5 text-dark-400" />
                                  )}
                                </button>
                              </td>
                              <td>
                                <span className="font-mono text-white">#{order.id}</span>
                              </td>
                              <td>
                                <div>
                                  <p className="text-white">
                                    {new Date(order.date).toLocaleDateString('it-IT', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </p>
                                  <p className="text-xs text-dark-400">
                                    {new Date(order.created_at).toLocaleTimeString('it-IT', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </td>
                              <td>
                                <span className="text-dark-300">{t(orderTypeLabelKeys[order.order_type])}</span>
                              </td>
                              <td>
                                <div>
                                  {order.table_name && <p className="text-white">{order.table_name}</p>}
                                  {order.customer_name && (
                                    <p className="text-sm text-dark-400">{order.customer_name}</p>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="font-semibold text-primary-400">
                                  {formatPrice(order.total)}
                                </span>
                              </td>
                              <td>
                                <span className={statusConfig[order.status]?.color || 'badge-secondary'}>
                                  {t(statusConfig[order.status]?.labelKey) || order.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => viewOrderDetails(order)}
                                    className="btn-ghost btn-sm px-2 py-1 md:px-3 md:py-2"
                                    title="Dettagli"
                                  >
                                    <Eye className="w-5 h-5 md:w-6 md:h-6" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(order)}
                                    className="btn-ghost btn-sm px-2 py-1 md:px-3 md:py-2"
                                    title="Modifica ordine"
                                  >
                                    <Edit2 className="w-5 h-5 md:w-6 md:h-6" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(order.id, order.session_id)}
                                    className="btn-ghost btn-sm px-2 py-1 md:px-3 md:py-2 text-red-400 hover:text-red-300"
                                    title="Elimina"
                                  >
                                    <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        // Sessione con più comande - riga principale collassabile
                        const isExpanded = expandedSessions.has(entry.sessionId!);
                        const allOrdersSelected = entry.orders.every(o => selectedOrderIds.includes(o.id));

                        return (
                          <>
                            {/* Riga principale della sessione */}
                            <tr
                              key={`session-${entry.sessionId}`}
                              className={`cursor-pointer hover:bg-dark-800/70 transition-colors ${allOrdersSelected ? 'bg-primary-500/10' : 'bg-dark-800/30'}`}
                              onClick={() => toggleSessionExpand(entry.sessionId!)}
                            >
                              <td>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Seleziona/deseleziona tutte le comande della sessione
                                    if (allOrdersSelected) {
                                      setSelectedOrderIds(prev => prev.filter(id => !entry.orders.some(o => o.id === id)));
                                    } else {
                                      setSelectedOrderIds(prev => [...new Set([...prev, ...entry.orders.map(o => o.id)])]);
                                    }
                                  }}
                                  className="p-1"
                                >
                                  {allOrdersSelected ? (
                                    <CheckSquare className="w-5 h-5 text-primary-400" />
                                  ) : (
                                    <Square className="w-5 h-5 text-dark-400" />
                                  )}
                                </button>
                              </td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-5 flex items-center justify-center">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-primary-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-primary-400" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-white">Conto</span>
                                    <p className="text-xs text-dark-400">
                                      {entry.orders.length} comande (#{entry.orders.map(o => o.id).join(', #')})
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <p className="text-white">
                                    {new Date(entry.date).toLocaleDateString('it-IT', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </p>
                                  <p className="text-xs text-dark-400">
                                    {new Date(entry.createdAt).toLocaleTimeString('it-IT', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </td>
                              <td>
                                <span className="text-dark-300">Tavolo</span>
                              </td>
                              <td>
                                <div>
                                  {entry.tableName && <p className="text-white">{entry.tableName}</p>}
                                  {entry.customerName && (
                                    <p className="text-sm text-dark-400">{entry.customerName}</p>
                                  )}
                                  <p className={`text-xs ${
                                    entry.sessionStatus === 'open' ? 'text-primary-400' : 'text-emerald-400'
                                  }`}>
                                    {entry.sessionStatus === 'open' ? 'Conto Aperto' : 'Conto Chiuso'}
                                  </p>
                                </div>
                              </td>
                              <td>
                                <span className="font-semibold text-primary-400">
                                  {formatPrice(entry.total)}
                                </span>
                              </td>
                              <td>
                                {/* Mostra gli stati aggregati delle comande */}
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(
                                    entry.orders.reduce((acc, o) => {
                                      acc[o.status] = (acc[o.status] || 0) + 1;
                                      return acc;
                                    }, {} as Record<string, number>)
                                  ).map(([status, count]) => (
                                    <span key={status} className={`${statusConfig[status as keyof typeof statusConfig]?.color || 'badge-secondary'} text-xs`}>
                                      {count}x {t(statusConfig[status as keyof typeof statusConfig]?.labelKey) || status}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewOrderDetails(entry.orders[0]);
                                      }}
                                      className="btn-ghost btn-sm px-2 py-1 md:px-3 md:py-2"
                                      title="Dettagli conto"
                                    >
                                      <Eye className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (entry.sessionId) {
                                          openEditSession(entry.sessionId);
                                        } else {
                                          openEditModal(entry.orders[0]);
                                        }
                                      }}
                                      className="btn-ghost btn-sm px-2 py-1 md:px-3 md:py-2"
                                      title="Modifica conto (sconti totale)"
                                    >
                                      <Edit2 className="w-5 h-5 md:w-6 md:h-6 -scale-y-100" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (entry.sessionId) handleDeleteSession(entry.sessionId);
                                      }}
                                      className="btn-ghost btn-sm px-2 py-1 md:px-3 md:py-2 text-red-400 hover:text-red-300"
                                      title="Elimina conto"
                                    >
                                      <Trash2 className="w-6 h-6 md:w-7 md:h-7" />
                                    </button>
                                </div>
                              </td>
                            </tr>

                            {/* Righe delle singole comande (espanse) */}
                            {isExpanded && entry.orders.map((order, idx) => (
                              <tr
                                key={`order-${order.id}`}
                                className={`border-l-2 border-primary-500/30 animate-fadeIn ${selectedOrderIds.includes(order.id) ? 'bg-primary-500/10' : 'bg-dark-900/30'}`}
                              >
                                <td>
                                  <button
                                    onClick={() => toggleOrderSelection(order.id)}
                                    className="p-1 ml-6"
                                  >
                                    {selectedOrderIds.includes(order.id) ? (
                                      <CheckSquare className="w-4 h-4 text-primary-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-dark-500" />
                                    )}
                                  </button>
                                </td>
                                <td>
                                  <div className="pl-8 flex items-center gap-3">
                                    <span className="text-dark-600">{idx === entry.orders.length - 1 ? '└' : '├'}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded bg-dark-700 flex items-center justify-center">
                                        <span className="text-xs font-mono text-primary-400">#{order.id}</span>
                                      </div>
                                      <span className="text-sm text-dark-300">Comanda {order.order_number || 1}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <p className="text-sm text-dark-400">
                                    {new Date(order.created_at).toLocaleTimeString('it-IT', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </td>
                                <td></td>
                                <td></td>
                                <td>
                                  <span className="font-medium text-dark-300">
                                    {formatPrice(order.total)}
                                  </span>
                                </td>
                                <td>
                                  <span className={`${statusConfig[order.status]?.color || 'badge-secondary'} text-xs`}>
                                    {t(statusConfig[order.status]?.labelKey) || order.status}
                                  </span>
                                </td>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => viewOrderDetails(order)}
                                      className="btn-ghost btn-sm px-3 py-2"
                                      title="Visualizza comanda"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => openKanbanEditModal(order)}
                                      className="btn-ghost btn-sm px-3 py-2"
                                      title="Modifica comanda"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(order.id, order.session_id)}
                                      className="btn-ghost btn-sm px-3 py-2 text-red-400 hover:text-red-300"
                                      title="Elimina"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* Order Details Modal - usa componente condiviso */}
      <SessionDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        sessionId={selectedOrder?.session_id ?? undefined}
        orderId={selectedOrder?.id ?? undefined}
        onViewOrder={(order) => {
          // apri dettagli ordine (comportamento esistente)
          viewOrderDetails(order);
        }}
        onEditOrder={(order) => {
          setShowDetails(false);
          openKanbanEditModal(order);
        }}
        onDeleteOrder={(orderId, sessionId) => {
          handleDelete(orderId, sessionId);
          setShowDetails(false);
        }}
        onOpenSplit={() => { handleOpenSplitModal(); }}
        onOpenBillStatus={() => { handleOpenBillStatus(); }}
        onAddOrder={() => handleAddOrder()}
        onTransfer={() => handleTransfer()}
        onCloseSession={() => handleOpenPaymentModal()}
      />

      {/* Edit Order Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifica Ordine #${selectedOrder?.id}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Tipo ordine */}
          <div>
            <label className="label">Tipo Ordine</label>
            <div className="grid grid-cols-3 gap-2">
              {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, order_type: type })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    editForm.order_type === type
                      ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                      : 'border-dark-600 hover:border-dark-500 text-dark-300'
                  }`}
                >
                  {t(orderTypeLabelKeys[type])}
                </button>
              ))}
            </div>
          </div>

          {/* Tavolo (solo se dine_in) */}
          {editForm.order_type === 'dine_in' && (
            <div>
              <label className="label">Tavolo</label>
              <select
                value={editForm.table_id || ''}
                onChange={(e) => setEditForm({ ...editForm, table_id: e.target.value ? Number(e.target.value) : undefined })}
                className="select"
              >
                <option value="">Seleziona tavolo</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} ({table.capacity} posti)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nome Cliente</label>
              <input
                type="text"
                value={editForm.customer_name}
                onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                className="input"
                placeholder="Nome cliente"
              />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input
                type="tel"
                value={editForm.customer_phone}
                onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                className="input"
                placeholder="Telefono"
              />
            </div>
          </div>

          {/* Metodo pagamento */}
          <div>
            <label className="label">Metodo Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'online'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, payment_method: method })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    editForm.payment_method === method
                      ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                      : 'border-dark-600 hover:border-dark-500 text-dark-300'
                  }`}
                >
                  {method === 'cash' ? 'Contanti' : method === 'card' ? 'Carta' : 'Online'}
                </button>
              ))}
            </div>
          </div>

          {/* Stato */}
          <div>
            <label className="label">Stato Ordine</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Order['status'] })}
              className="select"
            >
              <option value="pending">In Attesa</option>
              <option value="preparing">In Preparazione</option>
              <option value="ready">Pronto</option>
              <option value="delivered">Consegnato</option>
              <option value="cancelled">Annullato</option>
            </select>
          </div>

          {/* SMAC */}
          {smacEnabled && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="smac_edit"
                checked={editForm.smac_passed}
                onChange={(e) => setEditForm({ ...editForm, smac_passed: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="smac_edit" className="text-white cursor-pointer">
                SMAC Passata
              </label>
            </div>
          )}

          {/* Totale / Sconto */}
          <div className="bg-dark-900 rounded-xl p-4">
            <label className="label mb-2">Totale Ordine</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.total}
                    onChange={(e) => setEditForm({ ...editForm, total: parseFloat(e.target.value) || 0 })}
                    className="input pl-8 text-lg font-semibold"
                  />
                </div>
              </div>
              {editForm.total !== editForm.originalTotal && (
                <div className="text-right">
                  <p className="text-xs text-dark-400">Originale: {formatPrice(editForm.originalTotal)}</p>
                  <p className={`text-sm font-medium ${editForm.total < editForm.originalTotal ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {editForm.total < editForm.originalTotal
                      ? `Sconto: -${formatPrice(editForm.originalTotal - editForm.total)}`
                      : `+${formatPrice(editForm.total - editForm.originalTotal)}`
                    }
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Modifica il totale per applicare sconti o arrotondamenti
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="label">Note</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Note aggiuntive..."
            />
          </div>

          {/* Chiudi Conto - Solo per ordini con sessione aperta, non per singole comande */}
          {selectedOrder?.session_id && selectedOrder?.session_status === 'open' && !isEditingChildOrder && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Conto Aperto</p>
                  <p className="text-sm text-dark-400">
                    Totale: {formatPrice(selectedOrder.total)}
                  </p>
                </div>
                <button
                  onClick={handleOpenPaymentModal}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  Chiudi Conto
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveEdit} className="btn-primary flex-1">
              Salva Modifiche
            </button>
            <button onClick={() => setShowEditModal(false)} className="btn-secondary">
              Annulla
            </button>
            <button
              onClick={() => {
                if (confirm('Sei sicuro di voler eliminare questa comanda? L\'azione non può essere annullata.')) {
                  handleDelete(selectedOrder!.id, selectedOrder?.session_id);
                  setShowEditModal(false);
                }
              }}
              className="btn-danger"
              title="Elimina comanda"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Session Total Modal */}
      <Modal
        isOpen={showEditSessionModal}
        onClose={() => setShowEditSessionModal(false)}
        title="Modifica Totale Conto"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Totale Conto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">€</span>
              <input
                type="text"
                value={editSessionTotal}
                onChange={(e) => setEditSessionTotal(e.target.value)}
                className="input pl-8 text-lg font-semibold"
              />
            </div>
            <p className="text-xs text-dark-500 mt-2">Inserisci il totale da impostare per questo conto.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSaveSessionTotal} className="btn-primary flex-1">Salva</button>
            <button onClick={() => setShowEditSessionModal(false)} className="btn-secondary">Annulla</button>
          </div>
        </div>
      </Modal>

      {/* Kanban Edit Modal (Simplified - Prodotti + Stato + Note) */}
      <Modal
        isOpen={showKanbanEditModal}
        onClose={() => setShowKanbanEditModal(false)}
        title={`Modifica Comanda #${selectedOrder?.id}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Prodotti della comanda (MODIFICABILI) */}
          <div>
            <label className="label">Prodotti nella Comanda</label>
            <div className="bg-dark-900 rounded-xl p-3 space-y-2 max-h-64 overflow-y-auto">
              {kanbanEditItems.length === 0 ? (
                <p className="text-dark-400 text-sm text-center py-2">Nessun prodotto</p>
              ) : (
                kanbanEditItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                    <div className="flex-1">
                      <span className="text-white">{item.menu_item_name}</span>
                      <span className="text-dark-400 text-sm ml-2">{formatPrice(item.price)}/cad</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Controlli quantità */}
                      <button
                        onClick={() => handleKanbanItemQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4 text-dark-300" />
                      </button>
                      <span className="text-primary-400 font-bold w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleKanbanItemQuantityChange(item.id, item.quantity + 1)}
                        className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600"
                      >
                        <Plus className="w-4 h-4 text-dark-300" />
                      </button>
                      {/* Totale riga */}
                      <span className="text-dark-300 w-16 text-right">{formatPrice(item.price * item.quantity)}</span>
                      {/* Elimina prodotto */}
                      <button
                        onClick={() => handleKanbanItemDelete(item.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                        title="Rimuovi prodotto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Totale comanda */}
            {kanbanEditItems.length > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-dark-700">
                <span className="text-dark-400">Totale Comanda:</span>
                <span className="text-lg font-bold text-primary-400">
                  {formatPrice(kanbanEditItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                </span>
              </div>
            )}
          </div>

          {/* Stato */}
          <div>
            <label className="label">Stato Comanda</label>
            <select
              value={kanbanEditStatus}
              onChange={(e) => setKanbanEditStatus(e.target.value as Order['status'])}
              className="select"
            >
              <option value="pending">In Attesa</option>
              <option value="preparing">In Preparazione</option>
              <option value="ready">Pronto</option>
              <option value="delivered">Consegnato</option>
              <option value="cancelled">Annullato</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="label">Note Cucina</label>
            <textarea
              value={kanbanEditNotes}
              onChange={(e) => setKanbanEditNotes(e.target.value)}
              className="input min-h-[60px]"
              placeholder="Note per la cucina..."
            />
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              Modifica le quantità o rimuovi prodotti usando i pulsanti +/- e il cestino. Per sconti o totali personalizzati, usa Lista Ordini.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveKanbanEdit} className="btn-primary flex-1">
              Salva Modifiche
            </button>
            <button onClick={() => setShowKanbanEditModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Cover Charge Modal */}
      <Modal
        isOpen={showCoverChargeModal}
        onClose={() => setShowCoverChargeModal(false)}
        title="Coperto"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-center p-4 bg-dark-900 rounded-xl">
            <p className="text-sm text-dark-400">Coperto da applicare</p>
            <p className="text-2xl font-bold text-primary-400">{formatPrice(coverChargeAmount)}</p>
            <p className="text-xs text-dark-500 mt-1">
              ({coverChargeCovers} coperti × {formatPrice(coverChargeUnitPrice)})
            </p>
          </div>

          <p className="text-center text-dark-300">
            Vuoi applicare il coperto a questo conto?
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => proceedToPayment(true)}
              className="btn-primary py-3"
            >
              Sì, applica
            </button>
            <button
              onClick={() => proceedToPayment(false)}
              className="btn-secondary py-3"
            >
              No, senza coperto
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal (Chiudi Conto da Lista Ordini) */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSessionToClose(null);
        }}
        title="Chiudi Conto"
        size={paymentForm.method === 'cash' ? '2xl' : 'md'}
      >
        {sessionToClose && (
          <div className="space-y-4">
            {/* Desktop: 2 colonne quando contanti selezionato */}
            <div className={paymentForm.method === 'cash' ? 'md:grid md:grid-cols-2 md:gap-6' : ''}>
              {/* Colonna sinistra: Totale + Metodo + SMAC */}
              <div className="space-y-4">
                <div className="text-center p-4 bg-dark-900 rounded-xl">
                  <p className="text-sm text-dark-400">Totale da pagare</p>
                  <p className="text-3xl font-bold text-primary-400">{formatPrice(sessionToClose.total)}</p>
                </div>

                <div>
                  <label className="label">Metodo di Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentForm({ ...paymentForm, method: 'cash' })}
                      className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-1 md:gap-2 transition-colors ${
                        paymentForm.method === 'cash'
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <Banknote className="w-5 h-5 lg:w-6 lg:h-6" />
                      <span className="text-xs lg:text-sm">Contanti</span>
                    </button>
                    <button
                      onClick={() => setPaymentForm({ ...paymentForm, method: 'card' })}
                      className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-1 md:gap-2 transition-colors ${
                        paymentForm.method === 'card'
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 lg:w-6 lg:h-6" />
                      <span className="text-xs lg:text-sm">Carta</span>
                    </button>
                    <button
                      onClick={() => setPaymentForm({ ...paymentForm, method: 'online' })}
                      className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-1 md:gap-2 transition-colors ${
                        paymentForm.method === 'online'
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <Globe className="w-5 h-5 lg:w-6 lg:h-6" />
                      <span className="text-xs lg:text-sm">Online</span>
                    </button>
                  </div>
                </div>

                {smacEnabled && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="smac_payment"
                      checked={paymentForm.smac}
                      onChange={(e) => setPaymentForm({ ...paymentForm, smac: e.target.checked })}
                      className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                    />
                    <label htmlFor="smac_payment" className="text-white">SMAC passato</label>
                  </div>
                )}
              </div>

              {/* Colonna destra: Calcolatore Resto (solo contanti) */}
              {paymentForm.method === 'cash' && sessionToClose.total > 0 && (
                <div className="mt-4 md:mt-0 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Calcolatore Resto</span>
                  </div>
                  <div>
                    <label className="label text-emerald-300">Cliente dà</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={changeCalculator.customerGives}
                        onChange={(e) => setChangeCalculator({ customerGives: e.target.value })}
                        className="input flex-1"
                        placeholder="Es. 50.00"
                      />
                      <span className="flex items-center text-dark-400">€</span>
                    </div>
                  </div>
                  {/* Quick cash buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 20, 50, 100].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setChangeCalculator({ customerGives: amount.toString() })}
                        className="px-3 py-1 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors"
                      >
                        {formatPrice(amount)}
                      </button>
                    ))}
                  </div>
                  {changeCalculator.customerGives && parseFloat(changeCalculator.customerGives) > 0 && (
                    <div className="p-3 bg-dark-900 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-dark-400">Totale conto:</span>
                        <span className="text-white">{formatPrice(sessionToClose.total)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-dark-400">Cliente dà:</span>
                        <span className="text-white">{formatPrice(parseFloat(changeCalculator.customerGives))}</span>
                      </div>
                      <div className="border-t border-dark-700 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 font-semibold">RESTO DA DARE:</span>
                        <span className="text-2xl font-bold text-emerald-400">
                          {formatPrice(Math.max(0, parseFloat(changeCalculator.customerGives) - sessionToClose.total))}
                        </span>
                      </div>
                      {parseFloat(changeCalculator.customerGives) < sessionToClose.total && (
                        <p className="text-amber-400 text-sm mt-2">
                          Mancano {formatPrice(sessionToClose.total - parseFloat(changeCalculator.customerGives))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={confirmCloseSession} className="btn-primary flex-1">
                Conferma Pagamento
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSessionToClose(null);
                }}
                className="btn-secondary"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Split Bill Modal */}
      <Modal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        title="Dividi Conto"
        size="2xl"
      >
        {sessionToClose && (
          <div className="space-y-4">
            {/* Summary + Progress - Compatto */}
            <div className="p-3 bg-dark-900 rounded-xl">
              {(() => {
                const paidSum = (sessionPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
                const totalPreview = (sessionToClose.total || 0);
                const remainingPreview = Math.max(0, totalPreview - paidSum);
                const progressPct = totalPreview > 0 ? Math.min(100, (paidSum / totalPreview) * 100) : 0;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-dark-400">Totale</p>
                        <p className="text-base lg:text-lg font-bold text-white">{formatPrice(totalPreview)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-dark-400">Pagato</p>
                        <p className="text-base lg:text-lg font-bold text-emerald-400">{formatPrice(paidSum)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-dark-400">Rimanente</p>
                        <p className="text-base lg:text-lg font-bold text-primary-400">{formatPrice(remainingPreview)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Desktop: 2 colonne - Pagamenti a sinistra, Opzioni a destra */}
            <div className="md:grid md:grid-cols-2 md:gap-4">
              {/* Colonna sinistra: Pagamenti effettuati */}
              <div>
                {sessionPayments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-dark-400 mb-2">Pagamenti effettuati</h4>
                    <div className="space-y-2 max-h-40 lg:max-h-64 overflow-y-auto">
                      {sessionPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-2 bg-dark-900 rounded-lg">
                          <div className="flex items-center gap-2">
                            {payment.payment_method === 'cash' && <Banknote className="w-4 h-4 text-emerald-400" />}
                            {payment.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-400" />}
                            {payment.payment_method === 'online' && <Globe className="w-4 h-4 text-purple-400" />}
                            <span className="text-white text-sm">{formatPrice(payment.amount)}</span>
                            {payment.notes && <span className="text-dark-400 text-xs">- {payment.notes}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {smacEnabled && payment.smac_passed && (
                              <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">
                                SMAC
                              </span>
                            )}
                            <button
                              onClick={() => handlePrintPaymentReceipt(payment)}
                              className="p-1 hover:bg-dark-700 rounded transition-colors"
                              title="Stampa scontrino"
                            >
                              <Printer className="w-3.5 h-3.5 text-dark-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sessionPayments.length === 0 && (
                  <div className="p-4 bg-dark-900 rounded-xl text-center text-dark-500 text-sm">
                    Nessun pagamento ancora effettuato
                  </div>
                )}
              </div>

              {/* Colonna destra: Opzioni pagamento */}
              <div className="mt-4 md:mt-0">
                {/* Split Mode Selector */}
                {remainingAmount > 0 && (
                  <>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setSplitMode('manual')}
                        className={`flex-1 p-2 lg:p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                          splitMode === 'manual'
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-700 hover:border-dark-600'
                        }`}
                      >
                        <Banknote className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="text-xs lg:text-sm font-medium">Manuale</span>
                      </button>
                      {/* 'Alla Romana' split mode removed */}
                      <button
                        onClick={() => setSplitMode('items')}
                        className={`flex-1 p-2 lg:p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                          splitMode === 'items'
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-700 hover:border-dark-600'
                        }`}
                      >
                        <ListChecks className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="text-xs lg:text-sm font-medium">Per Prodotto</span>
                      </button>
                    </div>

                {/* Alla Romana Calculator */}
                {/* 'Alla Romana' UI removed */}

                {/* Per Consumazione */}
                {splitMode === 'items' && (
                  <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl space-y-4">
                    <p className="text-sm text-dark-400">
                      Seleziona quanti pezzi di ogni prodotto pagare.
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {remainingSessionItems.length === 0 ? (
                        <p className="text-center text-dark-500 py-4">Tutti i prodotti sono stati pagati</p>
                      ) : (
                        remainingSessionItems.map((item) => {
                          const selectedQty = selectedItems[item.id] || 0;
                          return (
                            <div key={item.id} className={`p-3 rounded-lg border-2 ${
                              selectedQty > 0 ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">{item.menu_item_name}</p>
                                  <p className="text-xs text-dark-400">
                                    {formatPrice(item.price)} • {item.remainingQty} rimasti
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                                  <button
                                    onClick={() => decrementItemSelection(item.id)}
                                    disabled={selectedQty === 0}
                                    className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30"
                                  >-</button>
                                  <span className="w-8 text-center font-bold">{selectedQty}</span>
                                  <button
                                    onClick={() => incrementItemSelection(item.id)}
                                    disabled={selectedQty >= item.remainingQty}
                                    className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30"
                                  >+</button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="space-y-3">
                      {sessionCovers > 0 && sessionCoverUnitPrice > 0 && (
                        <div key="coperto" className={`p-3 rounded-lg border-2 ${coverSelectedCount > 0 ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium">Coperto</p>
                              <p className="text-xs text-dark-400">{formatPrice(sessionCoverUnitPrice)} • {sessionCovers} pers.</p>
                            </div>
                            <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                              <button onClick={() => setCoverSelectedCount(Math.max(0, coverSelectedCount - 1))} disabled={coverSelectedCount === 0} className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30">-</button>
                              <span className="w-8 text-center font-bold">{coverSelectedCount}</span>
                              <button onClick={() => setCoverSelectedCount(Math.min(sessionCovers, coverSelectedCount + 1))} disabled={coverSelectedCount >= sessionCovers} className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30">+</button>
                            </div>
                          </div>
                          {coverSelectedCount > 0 && (
                            <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
                              <span className="text-xs text-dark-400">{coverSelectedCount}/{sessionCovers} selezionati</span>
                              <span className="text-sm font-semibold text-blue-400">{formatPrice(sessionCoverUnitPrice * coverSelectedCount)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-3 bg-dark-900 rounded-lg flex justify-between">
                        <span>Totale:</span>
                        <span className="text-blue-400 font-bold">{formatPrice(calculateSelectedItemsTotal() + (coverSelectedCount > 0 ? coverSelectedCount * sessionCoverUnitPrice : 0))}</span>
                      </div>
                    </div>
                    <button
                      onClick={applyItemsSelection}
                      disabled={Object.keys(selectedItems).length === 0 && coverSelectedCount === 0}
                      className="btn-primary w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Applica Selezione
                    </button>
                  </div>
                )}

                {/* Manual Payment Form */}
                {splitMode === 'manual' && (
                  <div className="space-y-4 p-4 border border-dark-700 rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Importo</label>
                        <input
                          type="number"
                          step="0.01"
                          value={splitPaymentForm.amount}
                          onChange={(e) => setSplitPaymentForm({ ...splitPaymentForm, amount: e.target.value })}
                          className="input"
                          placeholder={`Max €${remainingAmount.toFixed(2)}`}
                        />
                      </div>
                      <div>
                        <label className="label">Note</label>
                        <input
                          type="text"
                          value={splitPaymentForm.notes}
                          onChange={(e) => setSplitPaymentForm({ ...splitPaymentForm, notes: e.target.value })}
                          className="input"
                          placeholder="Es. Marco"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSplitPaymentForm({ ...splitPaymentForm, method: 'cash' })}
                        className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${
                          splitPaymentForm.method === 'cash' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700'
                        }`}
                      >
                        <Banknote className="w-4 h-4" /> Contanti
                      </button>
                      <button
                        onClick={() => setSplitPaymentForm({ ...splitPaymentForm, method: 'card' })}
                        className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${
                          splitPaymentForm.method === 'card' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" /> Carta
                      </button>
                    </div>
                    {smacEnabled && (
                      <div className="flex items-center gap-3 p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg">
                        <input
                          type="checkbox"
                          id="orders_split_smac"
                          checked={splitPaymentForm.smac}
                          onChange={(e) => setSplitPaymentForm({ ...splitPaymentForm, smac: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <label htmlFor="orders_split_smac" className="text-white">SMAC passato</label>
                      </div>
                    )}
                    {splitPaymentForm.method === 'cash' && splitPaymentForm.amount && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-emerald-400" />
                          <span className="font-medium text-emerald-400">Calcolatore Resto</span>
                        </div>
                        <input
                          type="number"
                          value={changeCalculator.customerGives}
                          onChange={(e) => setChangeCalculator({ customerGives: e.target.value })}
                          className="input"
                          placeholder="Cliente dà €..."
                        />
                        {changeCalculator.customerGives && (
                          <div className="p-3 bg-dark-900 rounded-lg flex justify-between">
                            <span className="text-emerald-400 font-semibold">RESTO:</span>
                            <span className="text-2xl font-bold text-emerald-400">
                              {formatPrice(calculateSplitChange())}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={addSplitPaymentFromOrders} className="btn-primary w-full">
                      Aggiungi Pagamento
                    </button>
                  </div>
                  )}
                  </>
                )}

                {remainingAmount === 0 && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                    <h4 className="text-lg font-bold text-emerald-400 mb-1">Conto Saldato!</h4>
                    <p className="text-dark-400 text-sm">Il conto è stato completamente pagato.</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setShowSplitModal(false)} className="btn-secondary w-full">
              Chiudi
            </button>
          </div>
        )}
      </Modal>

      {/* Bill Status Modal */}
      <Modal
        isOpen={showBillStatusModal}
        onClose={() => setShowBillStatusModal(false)}
        title="Stato del Conto"
        size="2xl"
      >
        {sessionToClose && (
          <div className="space-y-4">
            {/* Summary - Compatto */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-dark-900 rounded-xl">
              <div className="text-center">
                <p className="text-xs text-dark-400">Totale</p>
                <p className="text-base lg:text-lg font-bold text-white">{formatPrice(sessionToClose.total)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-400">Pagato</p>
                <p className="text-base lg:text-lg font-bold text-emerald-400">
                  {formatPrice(sessionToClose.total - remainingAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-400">Rimanente</p>
                <p className="text-base lg:text-lg font-bold text-primary-400">{formatPrice(remainingAmount)}</p>
              </div>
            </div>


            {/* Desktop: 2 colonne */}
            <div className="md:grid md:grid-cols-2 md:gap-4">
              {/* Colonna sinistra: Pagamenti */}
              <div>
                {sessionPayments.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-dark-400 mb-2">Pagamenti ({sessionPayments.length})</h4>
                    <div className="space-y-2 max-h-48 lg:max-h-72 overflow-y-auto">
                      {sessionPayments.map((payment, index) => (
                        <div key={payment.id} className="p-3 bg-dark-900 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {payment.payment_method === 'cash' && <Banknote className="w-4 h-4 text-emerald-400" />}
                              {payment.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-400" />}
                              {payment.payment_method === 'online' && <Globe className="w-4 h-4 text-purple-400" />}
                              <span className="font-medium text-white text-sm">#{index + 1}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary-400">{formatPrice(payment.amount)}</span>
                              {smacEnabled && payment.smac_passed && (
                                <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">SMAC</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-dark-400">
                            {new Date(payment.paid_at).toLocaleString('it-IT')}
                            {payment.notes && ` • ${payment.notes}`}
                          </div>
                          {payment.paid_items && payment.paid_items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-dark-700 space-y-0.5">
                              {payment.paid_items.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-dark-300">{item.quantity}x {item.menu_item_name}</span>
                                  <span className="text-dark-400">{formatPrice(item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => handlePrintPaymentReceipt(payment)}
                            className="mt-2 w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Stampa
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-dark-900 rounded-xl text-center">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-dark-600" />
                    <p className="text-dark-400 text-sm">Nessun pagamento effettuato</p>
                  </div>
                )}
              </div>

              {/* Colonna destra: Prodotti da pagare */}
              <div className="mt-4 md:mt-0">
                {remainingSessionItems.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-dark-400 mb-2">Da pagare ({remainingSessionItems.length})</h4>
                    <div className="space-y-1.5 max-h-48 lg:max-h-72 overflow-y-auto">
                      {remainingSessionItems.map((item) => (
                        <div key={item.id} className="flex justify-between p-2 bg-dark-900 rounded-lg text-sm">
                          <span className="text-white">{item.remainingQty}x {item.menu_item_name}</span>
                          <span className="text-primary-400 font-medium">{formatPrice(item.price * item.remainingQty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                    <p className="text-emerald-400 font-medium">Tutto pagato!</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setShowBillStatusModal(false)} className="btn-secondary w-full">
              Chiudi
            </button>
          </div>
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Scontrino"
        size="sm"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="bg-white text-black p-6 rounded-lg font-mono text-sm">
              <div className="text-center mb-4">
                <p className="font-bold text-lg">{selectedReceipt.shop_info.name}</p>
                {selectedReceipt.shop_info.address && (
                  <p className="text-xs">{selectedReceipt.shop_info.address}</p>
                )}
                {selectedReceipt.shop_info.phone && (
                  <p className="text-xs">Tel: {selectedReceipt.shop_info.phone}</p>
                )}
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="text-xs mb-3">
                <p>Data: {selectedReceipt.date} {selectedReceipt.time}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="space-y-1">
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>TOTALE</span>
                <span>{formatPrice(selectedReceipt.total)}</span>
              </div>
              <div className="text-xs mt-3">
                <p>Pagamento: {selectedReceipt.payment_method === 'cash' ? 'Contanti' : selectedReceipt.payment_method === 'card' ? 'Carta' : 'Online'}</p>
                {smacEnabled && selectedReceipt.smac_passed && <p>SMAC: Sì</p>}
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="text-center text-xs">
                <p>Grazie e arrivederci!</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={printReceipt} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" />
                Stampa
              </button>
              <button onClick={() => setShowReceiptModal(false)} className="btn-secondary">
                Chiudi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
