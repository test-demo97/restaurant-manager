import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
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
  ChevronUp,
  Receipt,
  Banknote,
  CreditCard,
  Globe,
  Calculator,
  Split,
  ClipboardList,
  ListChecks,
  Printer,
  FileText,
} from 'lucide-react';
import {
  getOrders,
  getOrderItems,
  updateOrderStatus,
  deleteOrder,
  updateOrder,
  getTables,
  getOrdersByDateRange,
  updateOrderStatusBulk,
  deleteOrdersBulk,
  closeTableSession,
  getSessionOrders,
  updateSessionTotal,
  getSessionPayments,
  addSessionPayment,
  getSessionRemainingAmount,
  getSessionPaidQuantities,
  generatePartialReceipt,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Order, OrderItem, Table, SessionPayment, SessionPaymentItem, Receipt as ReceiptType } from '../types';

const statusConfig = {
  pending: { label: 'In Attesa', icon: Clock, color: 'badge-warning', next: 'preparing' },
  preparing: { label: 'In Preparazione', icon: ChefHat, color: 'badge-info', next: 'ready' },
  ready: { label: 'Pronto', icon: CheckCircle, color: 'badge-success', next: 'delivered' },
  delivered: { label: 'Consegnato', icon: Package, color: 'badge-success', next: null },
  cancelled: { label: 'Annullato', icon: Trash2, color: 'badge-danger', next: null },
};

const orderTypeLabels = {
  dine_in: 'Tavolo',
  takeaway: 'Asporto',
  delivery: 'Domicilio',
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Mappa degli items per ogni ordine (per vista cucina)
  const [allOrderItems, setAllOrderItems] = useState<Record<number, OrderItem[]>>({});
  // Card espansa per ogni colonna Kanban (una sola per colonna)
  const [expandedByColumn, setExpandedByColumn] = useState<Record<string, number | null>>({
    pending: null,
    preparing: null,
    ready: null,
    delivered: null,
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [editForm, setEditForm] = useState({
    order_type: 'dine_in' as Order['order_type'],
    table_id: undefined as number | undefined,
    payment_method: 'cash' as Order['payment_method'],
    customer_name: '',
    customer_phone: '',
    notes: '',
    smac_passed: false,
    status: 'pending' as Order['status'],
  });

  // Storico tab state
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  // Per mostrare le comande di una sessione nei dettagli
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [sessionOrdersItems, setSessionOrdersItems] = useState<Record<number, OrderItem[]>>({});

  // Per espandere le sessioni nello storico
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

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

  // Split bill modal state (per dividere conti da storico)
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showBillStatusModal, setShowBillStatusModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [splitMode, setSplitMode] = useState<'manual' | 'romana' | 'items'>('manual');
  const [sessionPayments, setSessionPayments] = useState<SessionPayment[]>([]);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [allSessionItems, setAllSessionItems] = useState<(OrderItem & { order_number?: number })[]>([]);
  const [remainingSessionItems, setRemainingSessionItems] = useState<(OrderItem & { order_number?: number; remainingQty: number })[]>([]);
  const [paidQuantities, setPaidQuantities] = useState<Record<number, number>>({});
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [romanaForm, setRomanaForm] = useState({ totalPeople: '', payingPeople: '' });
  const [splitPaymentForm, setSplitPaymentForm] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'card' | 'online',
    notes: '',
    smac: false,
  });
  const [pendingPaidItems, setPendingPaidItems] = useState<SessionPaymentItem[]>([]);

  const loadOrdersCallback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders(selectedDate);
      setOrders(data);

      // Carica gli items per tutti gli ordini non consegnati (per vista cucina)
      const activeOrders = data.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
      const itemsMap: Record<number, OrderItem[]> = {};
      await Promise.all(
        activeOrders.map(async (order) => {
          const items = await getOrderItems(order.id);
          itemsMap[order.id] = items;
        })
      );
      setAllOrderItems(itemsMap);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast('Errore nel caricamento ordini', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadOrdersCallback();
  }, [loadOrdersCallback]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          // Reload orders when any change occurs
          loadOrdersCallback();
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadOrdersCallback]);

  async function handleStatusChange(order: Order) {
    const config = statusConfig[order.status];
    if (!config.next) return;

    try {
      await updateOrderStatus(order.id, config.next as Order['status']);
      showToast(`Ordine #${order.id} aggiornato`, 'success');
      loadOrdersCallback();
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  async function handleDelete(orderId: number, sessionId?: number) {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;

    try {
      await deleteOrder(orderId);

      // Aggiorna il totale della sessione se l'ordine appartiene a una sessione
      if (sessionId) {
        await updateSessionTotal(sessionId);
      }

      showToast('Ordine eliminato', 'success');
      loadOrdersCallback();
      if (activeTab === 'history') loadHistoryOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  async function viewOrderDetails(order: Order) {
    setSelectedOrder(order);
    try {
      const items = await getOrderItems(order.id);
      setOrderItems(items);

      // Se l'ordine ha una sessione, carica tutte le comande della sessione
      if (order.session_id) {
        const allSessionOrders = await getSessionOrders(order.session_id);
        setSessionOrders(allSessionOrders);

        // Carica gli items di ogni comanda
        const itemsMap: Record<number, OrderItem[]> = {};
        await Promise.all(
          allSessionOrders.map(async (o) => {
            const orderItems = await getOrderItems(o.id);
            itemsMap[o.id] = orderItems;
          })
        );
        setSessionOrdersItems(itemsMap);
      } else {
        setSessionOrders([]);
        setSessionOrdersItems({});
      }

      setShowDetails(true);
    } catch (error) {
      console.error('Error loading order items:', error);
      showToast('Errore nel caricamento dettagli', 'error');
    }
  }

  async function openEditModal(order: Order) {
    setSelectedOrder(order);
    setEditForm({
      order_type: order.order_type,
      table_id: order.table_id,
      payment_method: order.payment_method,
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      notes: order.notes || '',
      smac_passed: order.smac_passed,
      status: order.status,
    });

    // Carica tavoli se non già caricati
    if (tables.length === 0) {
      try {
        const tablesData = await getTables();
        setTables(tablesData);
      } catch (error) {
        console.error('Error loading tables:', error);
      }
    }

    setShowEditModal(true);
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
      // Carica tutte le comande della sessione per avere il totale corretto
      const allSessionOrders = await getSessionOrders(selectedOrder.session_id);
      const sessionTotal = allSessionOrders.reduce((sum, o) => sum + o.total, 0);

      setSessionToClose({ id: selectedOrder.session_id, total: sessionTotal });
      setPaymentForm({ method: 'cash', smac: false });
      setChangeCalculator({ customerGives: '' });
      setShowEditModal(false);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error loading session orders:', error);
      showToast('Errore nel caricamento del conto', 'error');
    }
  }

  // Conferma la chiusura del conto con il metodo di pagamento selezionato
  async function confirmCloseSession() {
    if (!sessionToClose) return;

    try {
      await closeTableSession(
        sessionToClose.id,
        paymentForm.method,
        paymentForm.smac
      );

      // Aggiorna lo stato di tutti gli ordini della sessione a consegnato
      if (selectedOrder) {
        await updateOrderStatus(selectedOrder.id, 'delivered');
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
      setPaidQuantities(paidQtys);
      setSessionPayments(payments);
      setRemainingAmount(remaining);

      // Calcola items rimanenti
      const remainingItems = allItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(remainingItems);

      setSessionToClose({ id: selectedOrder.session_id, total: sessionTotal });
      setSplitPaymentForm({ amount: '', method: 'cash', notes: '', smac: false });
      setSplitMode('manual');
      setSelectedItems({});
      setRomanaForm({ totalPeople: '', payingPeople: '' });
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

      // Carica tutti gli items per mostrare i rimanenti
      const allItems: (OrderItem & { order_number?: number })[] = [];
      for (const order of allSessionOrders) {
        const items = await getOrderItems(order.id);
        items.forEach(item => {
          allItems.push({ ...item, order_number: order.order_number || 1 });
        });
      }

      setAllSessionItems(allItems);
      setPaidQuantities(paidQtys);
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
          const { [itemId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [itemId]: newValue };
      }
      return prev;
    });
  }

  function toggleAllItemQuantity(itemId: number) {
    const item = remainingSessionItems.find(i => i.id === itemId);
    if (!item) return;
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      if (current === item.remainingQty) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [itemId]: item.remainingQty };
      }
    });
  }

  function calculateRomanaAmount(): number {
    if (!sessionToClose) return 0;
    const totalPeople = parseInt(romanaForm.totalPeople) || 1;
    const payingPeople = parseInt(romanaForm.payingPeople) || 1;
    const perPersonAmount = remainingAmount / totalPeople;
    return Math.min(perPersonAmount * payingPeople, remainingAmount);
  }

  function applyRomanaCalculation() {
    const amount = calculateRomanaAmount();
    if (amount > 0) {
      setSplitPaymentForm(prev => ({
        ...prev,
        amount: amount.toFixed(2),
        notes: `Alla romana (${romanaForm.payingPeople}/${romanaForm.totalPeople} persone)`
      }));
      setSplitMode('manual');
    }
  }

  function applyItemsSelection() {
    const amount = calculateSelectedItemsTotal();
    if (amount > 0 && amount <= remainingAmount) {
      const itemDescriptions = Object.entries(selectedItems)
        .map(([itemId, qty]) => {
          const item = remainingSessionItems.find(i => i.id === Number(itemId));
          return item ? `${qty}x ${item.menu_item_name}` : '';
        })
        .filter(Boolean)
        .join(', ');

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

      setPendingPaidItems(paidItems);
      setSplitPaymentForm(prev => ({
        ...prev,
        amount: Math.min(amount, remainingAmount).toFixed(2),
        notes: itemDescriptions.length > 40 ? itemDescriptions.substring(0, 40) + '...' : itemDescriptions
      }));
      setSplitMode('manual');
      setSelectedItems({});
    }
  }

  function calculateSplitChange(): number {
    const customerGives = parseFloat(changeCalculator.customerGives) || 0;
    const paymentAmount = parseFloat(splitPaymentForm.amount) || 0;
    return Math.max(0, customerGives - paymentAmount);
  }

  async function addSplitPaymentFromOrders() {
    if (!sessionToClose) return;
    const amount = parseFloat(splitPaymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Inserisci un importo valido', 'warning');
      return;
    }
    if (amount > remainingAmount) {
      showToast('Importo superiore al rimanente', 'warning');
      return;
    }

    try {
      await addSessionPayment(
        sessionToClose.id,
        amount,
        splitPaymentForm.method,
        splitPaymentForm.notes || undefined,
        splitPaymentForm.smac,
        pendingPaidItems.length > 0 ? pendingPaidItems : undefined
      );

      const [payments, remaining, paidQtys] = await Promise.all([
        getSessionPayments(sessionToClose.id),
        getSessionRemainingAmount(sessionToClose.id),
        getSessionPaidQuantities(sessionToClose.id),
      ]);
      setSessionPayments(payments);
      setRemainingAmount(remaining);
      setPaidQuantities(paidQtys);

      const updatedRemaining = allSessionItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(updatedRemaining);

      setSplitPaymentForm({ amount: '', method: 'cash', notes: '', smac: false });
      setPendingPaidItems([]);
      showToast('Pagamento aggiunto', 'success');

      if (remaining <= 0) {
        await closeTableSession(sessionToClose.id, 'split', false);
        showToast('Conto saldato e chiuso', 'success');
        setShowSplitModal(false);
        loadOrdersCallback();
        if (activeTab === 'history') loadHistoryOrders();
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
          <div>Data: ${new Date(selectedReceipt.created_at).toLocaleString('it-IT')}</div>
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
          ${selectedReceipt.smac_passed ? '<div>SMAC: Sì</div>' : ''}
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

  // ========== STORICO ORDINI ==========
  async function loadHistoryOrders() {
    setHistoryLoading(true);
    try {
      const data = await getOrdersByDateRange(historyStartDate, historyEndDate);
      setHistoryOrders(data);
      setSelectedOrderIds([]);
    } catch (error) {
      console.error('Error loading history:', error);
      showToast('Errore nel caricamento storico', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }

  function toggleOrderSelection(orderId: number) {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
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
    if (selectedOrderIds.length === 0) {
      showToast('Seleziona almeno un ordine', 'warning');
      return;
    }

    if (bulkAction === 'delete') {
      if (!confirm(`Sei sicuro di voler eliminare ${selectedOrderIds.length} ordini?`)) return;
      try {
        await deleteOrdersBulk(selectedOrderIds);
        showToast(`${selectedOrderIds.length} ordini eliminati`, 'success');
        setSelectedOrderIds([]);
        loadHistoryOrders();
      } catch (error) {
        console.error('Error deleting orders:', error);
        showToast('Errore nell\'eliminazione', 'error');
      }
    } else if (bulkAction) {
      try {
        await updateOrderStatusBulk(selectedOrderIds, bulkAction as Order['status']);
        showToast(`${selectedOrderIds.length} ordini aggiornati a "${statusConfig[bulkAction as keyof typeof statusConfig]?.label || bulkAction}"`, 'success');
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

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
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

  const ordersByStatus = {
    pending: filteredOrders.filter((o) => o.status === 'pending'),
    preparing: filteredOrders.filter((o) => o.status === 'preparing'),
    ready: filteredOrders.filter((o) => o.status === 'ready'),
    delivered: filteredOrders.filter((o) => o.status === 'delivered'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Ordini</h1>
          <p className="text-dark-400 mt-1">Gestisci gli ordini del ristorante</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Realtime connection status */}
          {isSupabaseConfigured && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              isRealtimeConnected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isRealtimeConnected ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>
          )}
          <button onClick={loadOrdersCallback} className="btn-secondary">
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link to="/orders/new" className="btn-primary">
            <Plus className="w-5 h-5" />
            Nuovo Ordine
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'today'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Oggi
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            if (historyOrders.length === 0) loadHistoryOrders();
          }}
          className={`px-4 py-2 rounded-t-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Storico
        </button>
      </div>

      {activeTab === 'today' && (
        <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Cerca ordine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select w-auto"
        >
          <option value="all">Tutti gli stati</option>
          <option value="pending">In Attesa</option>
          <option value="preparing">In Preparazione</option>
          <option value="ready">Pronto</option>
          <option value="delivered">Consegnato</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        /* Kanban View - items-start per evitare che le colonne si allineino in altezza */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {(['pending', 'preparing', 'ready', 'delivered'] as const).map((status) => {
            const config = statusConfig[status];
            const statusOrders = ordersByStatus[status];

            return (
              <div key={status} className="card self-start">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <config.icon className="w-5 h-5" />
                    <span className="font-semibold">{config.label}</span>
                  </div>
                  <span className={config.color}>{statusOrders.length}</span>
                </div>
                <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                  {statusOrders.length === 0 ? (
                    <p className="text-dark-500 text-center py-4 text-sm">
                      Nessun ordine
                    </p>
                  ) : (
                    statusOrders.map((order) => {
                      const isExpanded = expandedByColumn[status] === order.id;
                      const toggleExpand = () => {
                        setExpandedByColumn(prev => ({
                          ...prev,
                          [status]: prev[status] === order.id ? null : order.id
                        }));
                      };

                      return (
                        <div
                          key={order.id}
                          className="bg-dark-900 rounded-xl overflow-hidden"
                        >
                          {/* Header compatto - sempre visibile */}
                          <div
                            onClick={toggleExpand}
                            className="p-3 cursor-pointer hover:bg-dark-800 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* ID + Titolo + Cliente su una riga */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-mono bg-dark-700 px-2 py-1 rounded text-dark-300 flex-shrink-0">
                                  #{order.id}
                                </span>
                                <span className="font-medium text-white text-sm truncate">
                                  {order.session_id
                                    ? `${order.table_name}${order.order_number ? ` - C${order.order_number}` : ''}`
                                    : order.table_name
                                    ? `${orderTypeLabels[order.order_type]} - ${order.table_name}`
                                    : order.customer_name
                                    ? `${orderTypeLabels[order.order_type]} - ${order.customer_name}`
                                    : `${orderTypeLabels[order.order_type]}`}
                                </span>
                              </div>
                              {/* Chevron e indicatore items */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {allOrderItems[order.id] && (
                                  <span className="text-xs text-dark-400">
                                    {allOrderItems[order.id].length} item
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-dark-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-dark-400" />
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
                            <div className="px-3 pb-3 space-y-3 border-t border-dark-700">
                              {/* Stato sessione + Totale */}
                              <div className="flex items-center justify-between pt-3">
                                {order.session_id && (
                                  <span className={`text-xs ${
                                    order.session_status === 'open'
                                      ? 'text-primary-400/70'
                                      : 'text-emerald-400/70'
                                  }`}>
                                    {order.session_status === 'open' ? 'Conto Aperto' : 'Conto Chiuso'}
                                  </span>
                                )}
                                <p className="font-bold text-primary-400 ml-auto">
                                  €{order.total.toFixed(2)}
                                </p>
                              </div>

                              {/* Note ordine */}
                              {order.notes && (
                                <p className="text-sm text-dark-400 bg-dark-800 p-2 rounded-lg">
                                  📝 {order.notes}
                                </p>
                              )}

                              {/* Items dell'ordine - Vista Cucina */}
                              {allOrderItems[order.id] && allOrderItems[order.id].length > 0 && (
                                <div className="bg-dark-800 rounded-lg p-3 space-y-1">
                                  {allOrderItems[order.id].map((item) => (
                                    <div key={item.id} className="flex items-start gap-2">
                                      <span className="font-bold text-primary-400 min-w-[24px]">
                                        {item.quantity}x
                                      </span>
                                      <div className="flex-1">
                                        <span className="text-white">{item.menu_item_name}</span>
                                        {item.notes && (
                                          <p className="text-xs text-amber-400 mt-0.5">
                                            ⚠️ {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Pulsanti azione */}
                              <div className="flex items-center gap-2">
                                {config.next && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(order);
                                    }}
                                    className="btn-success btn-sm flex-1"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    {status === 'pending'
                                      ? 'Prepara'
                                      : status === 'preparing'
                                      ? 'Pronto'
                                      : 'Consegna'}
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(order);
                                  }}
                                  className="btn-secondary btn-sm"
                                  title="Modifica comanda"
                                >
                                  <Edit2 className="w-4 h-4" />
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
        <div className="space-y-4">
          {/* History Filters */}
          <div className="card p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Da</label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">A</label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Stato</label>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="select"
                >
                  <option value="all">Tutti</option>
                  <option value="pending">In Attesa</option>
                  <option value="preparing">In Preparazione</option>
                  <option value="ready">Pronto</option>
                  <option value="delivered">Consegnato</option>
                  <option value="cancelled">Annullato</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="label">Cerca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="text"
                    placeholder="ID, cliente, tavolo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <button onClick={loadHistoryOrders} className="btn-primary">
                <Filter className="w-4 h-4" />
                Filtra
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrderIds.length > 0 && (
            <div className="card p-4 bg-primary-500/10 border border-primary-500/30">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-primary-400 font-medium">
                  {selectedOrderIds.length} ordini selezionati
                </p>
                <div className="flex items-center gap-3">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="select w-auto"
                  >
                    <option value="">Seleziona azione...</option>
                    <option value="pending">Imposta In Attesa</option>
                    <option value="preparing">Imposta In Preparazione</option>
                    <option value="ready">Imposta Pronto</option>
                    <option value="delivered">Imposta Consegnato</option>
                    <option value="cancelled">Imposta Annullato</option>
                    <option value="delete">🗑️ Elimina</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="btn-primary disabled:opacity-50"
                  >
                    Applica
                  </button>
                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="btn-secondary"
                  >
                    Deseleziona
                  </button>
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
            <div className="card">
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
                        // Ordine singolo o sessione con una sola comanda
                        if (entry.type === 'single' || entry.orders.length === 1) {
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
                                <span className="text-dark-300">{orderTypeLabels[order.order_type]}</span>
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
                                  €{order.total.toFixed(2)}
                                </span>
                              </td>
                              <td>
                                <span className={statusConfig[order.status]?.color || 'badge-secondary'}>
                                  {statusConfig[order.status]?.label || order.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => viewOrderDetails(order)}
                                    className="btn-ghost btn-sm"
                                    title="Dettagli"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(order)}
                                    className="btn-ghost btn-sm"
                                    title="Modifica"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(order.id, order.session_id)}
                                    className="btn-ghost btn-sm text-red-400 hover:text-red-300"
                                    title="Elimina"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
                              className={`cursor-pointer hover:bg-dark-800 ${allOrdersSelected ? 'bg-primary-500/10' : ''}`}
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
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-dark-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-dark-400" />
                                  )}
                                  <div>
                                    <span className="font-mono text-white">Conto</span>
                                    <p className="text-xs text-dark-400">{entry.orders.length} comande</p>
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
                                  €{entry.total.toFixed(2)}
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
                                      {count}x {statusConfig[status as keyof typeof statusConfig]?.label || status}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewOrderDetails(entry.orders[0]);
                                    }}
                                    className="btn-ghost btn-sm"
                                    title="Dettagli conto"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Righe delle singole comande (espanse) */}
                            {isExpanded && entry.orders.map((order) => (
                              <tr
                                key={`order-${order.id}`}
                                className={`bg-dark-900/50 ${selectedOrderIds.includes(order.id) ? 'bg-primary-500/10' : ''}`}
                              >
                                <td>
                                  <button
                                    onClick={() => toggleOrderSelection(order.id)}
                                    className="p-1 ml-4"
                                  >
                                    {selectedOrderIds.includes(order.id) ? (
                                      <CheckSquare className="w-4 h-4 text-primary-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-dark-500" />
                                    )}
                                  </button>
                                </td>
                                <td>
                                  <div className="pl-6 flex items-center gap-2">
                                    <span className="text-dark-500">└</span>
                                    <div>
                                      <span className="font-mono text-dark-300 text-sm">#{order.id}</span>
                                      <p className="text-xs text-dark-500">Comanda {order.order_number || 1}</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <p className="text-xs text-dark-400">
                                    {new Date(order.created_at).toLocaleTimeString('it-IT', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </td>
                                <td></td>
                                <td></td>
                                <td>
                                  <span className="font-medium text-dark-300 text-sm">
                                    €{order.total.toFixed(2)}
                                  </span>
                                </td>
                                <td>
                                  <span className={`${statusConfig[order.status]?.color || 'badge-secondary'} text-xs`}>
                                    {statusConfig[order.status]?.label || order.status}
                                  </span>
                                </td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => openEditModal(order)}
                                      className="btn-ghost btn-sm"
                                      title="Modifica"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(order.id, order.session_id)}
                                      className="btn-ghost btn-sm text-red-400 hover:text-red-300"
                                      title="Elimina"
                                    >
                                      <Trash2 className="w-3 h-3" />
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
          )}
        </div>
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={selectedOrder?.session_id
          ? `${selectedOrder.table_name} - Conto${sessionOrders.length > 1 ? ` (${sessionOrders.length} comande)` : ''}`
          : `Ordine #${selectedOrder?.id}`
        }
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            {/* Session Badge */}
            {selectedOrder.session_id && (
              <div className={`rounded-xl p-3 text-center border ${
                selectedOrder.session_status === 'open'
                  ? 'bg-primary-500/10 border-primary-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <span className={`font-medium ${
                  selectedOrder.session_status === 'open'
                    ? 'text-primary-400'
                    : 'text-emerald-400'
                }`}>
                  {selectedOrder.session_status === 'open' ? 'Conto Aperto' : 'Conto Chiuso'}
                  {sessionOrders.length > 1 && ` - ${sessionOrders.length} comande`}
                </span>
              </div>
            )}

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-dark-400">Tipo</p>
                <p className="font-medium text-white">
                  {orderTypeLabels[selectedOrder.order_type]}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-400">Stato</p>
                <span className={statusConfig[selectedOrder.status].color}>
                  {statusConfig[selectedOrder.status].label}
                </span>
              </div>
              {selectedOrder.table_name && (
                <div>
                  <p className="text-sm text-dark-400">Tavolo</p>
                  <p className="font-medium text-white">{selectedOrder.table_name}</p>
                </div>
              )}
              {selectedOrder.customer_name && (
                <div>
                  <p className="text-sm text-dark-400">Cliente</p>
                  <p className="font-medium text-white">{selectedOrder.customer_name}</p>
                </div>
              )}
              {!selectedOrder.session_id && (
                <>
                  <div>
                    <p className="text-sm text-dark-400">Pagamento</p>
                    <p className="font-medium text-white capitalize">
                      {selectedOrder.payment_method === 'cash'
                        ? 'Contanti'
                        : selectedOrder.payment_method === 'card'
                        ? 'Carta'
                        : 'Online'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">SMAC</p>
                    <p className="font-medium text-white">
                      {selectedOrder.smac_passed ? 'Sì' : 'No'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Items - Mostro tutte le comande se è una sessione con più ordini */}
            {selectedOrder.session_id && sessionOrders.length > 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-dark-400">Comande del conto</p>
                {sessionOrders.map((order) => (
                  <div key={order.id} className="bg-dark-900 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-dark-700 px-2 py-1 rounded text-dark-300">
                          #{order.id}
                        </span>
                        <span className="font-medium text-white">
                          Comanda {order.order_number || 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={statusConfig[order.status]?.color || 'badge-secondary'}>
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                        <span className="font-bold text-primary-400">
                          €{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Items di questa comanda */}
                    <div className="space-y-1 pl-2 border-l-2 border-dark-700">
                      {(sessionOrdersItems[order.id] || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-white">{item.quantity}x {item.menu_item_name}</span>
                            {item.notes && (
                              <span className="text-amber-400 ml-2">⚠️ {item.notes}</span>
                            )}
                          </div>
                          <span className="text-dark-300">€{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <p className="text-xs text-dark-400 mt-2 italic">📝 {order.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-dark-400 mb-2">Prodotti</p>
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-dark-900 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {item.quantity}x {item.menu_item_name}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-dark-400">{item.notes}</p>
                        )}
                      </div>
                      <p className="font-medium text-primary-400">
                        €{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && !selectedOrder.session_id && (
              <div>
                <p className="text-sm text-dark-400 mb-2">Note</p>
                <p className="p-3 bg-dark-900 rounded-xl text-white">
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <span className="text-lg font-semibold text-white">
                {selectedOrder.session_id && sessionOrders.length > 1 ? 'Totale Conto' : 'Totale'}
              </span>
              <span className="text-2xl font-bold text-primary-400">
                €{selectedOrder.session_id && sessionOrders.length > 1
                  ? sessionOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)
                  : selectedOrder.total.toFixed(2)
                }
              </span>
            </div>

            {/* Session Actions (only for open sessions) */}
            {selectedOrder.session_id && selectedOrder.session_status === 'open' && (
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dark-700">
                <button onClick={handleOpenSplitModal} className="btn-secondary flex items-center justify-center gap-2">
                  <Split className="w-4 h-4" />
                  Dividi Conto
                </button>
                <button onClick={handleOpenBillStatus} className="btn-secondary flex items-center justify-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Stato Conto
                </button>
                <button
                  onClick={handleOpenPaymentModal}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 col-span-2"
                >
                  <Receipt className="w-4 h-4" />
                  Chiudi Conto
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => {
                  setShowDetails(false);
                  openEditModal(selectedOrder);
                }}
                className="btn-secondary flex-1"
              >
                <Edit2 className="w-5 h-5" />
                Modifica
              </button>
              {statusConfig[selectedOrder.status].next && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedOrder);
                    setShowDetails(false);
                  }}
                  className="btn-success flex-1"
                >
                  <CheckCircle className="w-5 h-5" />
                  Avanza Stato
                </button>
              )}
              <button
                onClick={() => {
                  handleDelete(selectedOrder.id, selectedOrder.session_id);
                  setShowDetails(false);
                }}
                className="btn-danger"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </Modal>

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
                  {orderTypeLabels[type]}
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

          {/* Chiudi Conto - Solo per ordini con sessione aperta */}
          {selectedOrder?.session_id && selectedOrder?.session_status === 'open' && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Conto Aperto</p>
                  <p className="text-sm text-dark-400">
                    Totale: €{selectedOrder.total.toFixed(2)}
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

      {/* Payment Modal (Chiudi Conto da Storico) */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSessionToClose(null);
        }}
        title="Chiudi Conto"
        size="sm"
      >
        {sessionToClose && (
          <div className="space-y-6">
            <div className="text-center p-4 bg-dark-900 rounded-xl">
              <p className="text-sm text-dark-400">Totale da pagare</p>
              <p className="text-3xl font-bold text-primary-400">€{sessionToClose.total.toFixed(2)}</p>
            </div>

            <div>
              <label className="label">Metodo di Pagamento</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, method: 'cash' })}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentForm.method === 'cash'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-sm">Contanti</span>
                </button>
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, method: 'card' })}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentForm.method === 'card'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-sm">Carta</span>
                </button>
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, method: 'online' })}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentForm.method === 'online'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <Globe className="w-6 h-6" />
                  <span className="text-sm">Online</span>
                </button>
              </div>
            </div>

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

            {/* Calcolatore Resto - solo per contanti */}
            {paymentForm.method === 'cash' && sessionToClose.total > 0 && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
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
                      €{amount}
                    </button>
                  ))}
                </div>
                {changeCalculator.customerGives && parseFloat(changeCalculator.customerGives) > 0 && (
                  <div className="p-3 bg-dark-900 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-dark-400">Totale conto:</span>
                      <span className="text-white">€{sessionToClose.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-dark-400">Cliente dà:</span>
                      <span className="text-white">€{parseFloat(changeCalculator.customerGives).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dark-700 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 font-semibold">RESTO DA DARE:</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        €{Math.max(0, parseFloat(changeCalculator.customerGives) - sessionToClose.total).toFixed(2)}
                      </span>
                    </div>
                    {parseFloat(changeCalculator.customerGives) < sessionToClose.total && (
                      <p className="text-amber-400 text-sm mt-2">
                        ⚠️ Il cliente non ha dato abbastanza! Mancano €{(sessionToClose.total - parseFloat(changeCalculator.customerGives)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
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
        size="lg"
      >
        {sessionToClose && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-900 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-dark-400">Totale</p>
                <p className="text-lg font-bold text-white">€{sessionToClose.total.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Pagato</p>
                <p className="text-lg font-bold text-emerald-400">
                  €{(sessionToClose.total - remainingAmount).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Rimanente</p>
                <p className="text-lg font-bold text-primary-400">€{remainingAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            {sessionToClose.total > 0 && (
              <div className="w-full bg-dark-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((sessionToClose.total - remainingAmount) / sessionToClose.total) * 100)}%` }}
                />
              </div>
            )}

            {/* Payments List */}
            {sessionPayments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-dark-400 mb-2">Pagamenti effettuati</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sessionPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-dark-900 rounded-lg">
                      <div className="flex items-center gap-2">
                        {payment.payment_method === 'cash' && <Banknote className="w-4 h-4 text-emerald-400" />}
                        {payment.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-400" />}
                        {payment.payment_method === 'online' && <Globe className="w-4 h-4 text-purple-400" />}
                        <span className="text-white">€{payment.amount.toFixed(2)}</span>
                        {payment.notes && <span className="text-dark-400 text-sm">- {payment.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {payment.smac_passed && (
                          <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                            SMAC
                          </span>
                        )}
                        <button
                          onClick={() => handlePrintPaymentReceipt(payment)}
                          className="p-1 hover:bg-dark-700 rounded transition-colors"
                          title="Stampa scontrino"
                        >
                          <Printer className="w-4 h-4 text-dark-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Mode Selector */}
            {remainingAmount > 0 && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitMode('manual')}
                    className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      splitMode === 'manual'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-sm font-medium">Manuale</span>
                  </button>
                  <button
                    onClick={() => setSplitMode('romana')}
                    className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      splitMode === 'romana'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <Calculator className="w-5 h-5" />
                    <span className="text-sm font-medium">Alla Romana</span>
                  </button>
                  <button
                    onClick={() => setSplitMode('items')}
                    className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      splitMode === 'items'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <ListChecks className="w-5 h-5" />
                    <span className="text-sm font-medium">Per Consumazione</span>
                  </button>
                </div>

                {/* Alla Romana Calculator */}
                {splitMode === 'romana' && (
                  <div className="p-4 border border-primary-500/30 bg-primary-500/5 rounded-xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Persone totali</label>
                        <input
                          type="number"
                          min="1"
                          value={romanaForm.totalPeople}
                          onChange={(e) => setRomanaForm({ ...romanaForm, totalPeople: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Pagano ora</label>
                        <input
                          type="number"
                          min="1"
                          value={romanaForm.payingPeople}
                          onChange={(e) => setRomanaForm({ ...romanaForm, payingPeople: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>
                    {romanaForm.totalPeople && romanaForm.payingPeople && (
                      <div className="p-3 bg-dark-900 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-dark-400">Totale da pagare:</span>
                          <span className="text-primary-400 font-bold text-lg">
                            €{calculateRomanaAmount().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={applyRomanaCalculation}
                      disabled={!romanaForm.totalPeople || !romanaForm.payingPeople}
                      className="btn-primary w-full"
                    >
                      Applica Calcolo
                    </button>
                  </div>
                )}

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
                                    €{item.price.toFixed(2)} • {item.remainingQty} rimasti
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
                    {Object.keys(selectedItems).length > 0 && (
                      <div className="p-3 bg-dark-900 rounded-lg flex justify-between">
                        <span>Totale:</span>
                        <span className="text-blue-400 font-bold">€{calculateSelectedItemsTotal().toFixed(2)}</span>
                      </div>
                    )}
                    <button
                      onClick={applyItemsSelection}
                      disabled={Object.keys(selectedItems).length === 0}
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
                              €{calculateSplitChange().toFixed(2)}
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
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                <h4 className="text-xl font-bold text-emerald-400 mb-2">Conto Saldato!</h4>
                <p className="text-dark-400">Il conto è stato completamente pagato.</p>
              </div>
            )}

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
        size="lg"
      >
        {sessionToClose && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-900 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-dark-400">Totale</p>
                <p className="text-lg font-bold text-white">€{sessionToClose.total.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Pagato</p>
                <p className="text-lg font-bold text-emerald-400">
                  €{(sessionToClose.total - remainingAmount).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Rimanente</p>
                <p className="text-lg font-bold text-primary-400">€{remainingAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Payments List */}
            {sessionPayments.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-dark-400 mb-3">Pagamenti effettuati ({sessionPayments.length})</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {sessionPayments.map((payment, index) => (
                    <div key={payment.id} className="p-4 bg-dark-900 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {payment.payment_method === 'cash' && <Banknote className="w-5 h-5 text-emerald-400" />}
                          {payment.payment_method === 'card' && <CreditCard className="w-5 h-5 text-blue-400" />}
                          {payment.payment_method === 'online' && <Globe className="w-5 h-5 text-purple-400" />}
                          <span className="font-semibold text-white">Pagamento #{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary-400">€{payment.amount.toFixed(2)}</span>
                          {payment.smac_passed && (
                            <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">SMAC</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-dark-400 space-y-1">
                        <p>Data: {new Date(payment.paid_at).toLocaleString('it-IT')}</p>
                        {payment.notes && <p>Note: {payment.notes}</p>}
                      </div>
                      {payment.paid_items && payment.paid_items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-dark-700">
                          <p className="text-xs text-dark-500 mb-2">Prodotti pagati:</p>
                          <div className="space-y-1">
                            {payment.paid_items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-dark-300">{item.quantity}x {item.menu_item_name}</span>
                                <span className="text-dark-400">€{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handlePrintPaymentReceipt(payment)}
                        className="mt-3 w-full btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Stampa Scontrino
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-dark-900 rounded-xl text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-dark-600" />
                <p className="text-dark-400">Nessun pagamento ancora effettuato</p>
              </div>
            )}

            {/* Remaining items */}
            {remainingSessionItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-dark-400 mb-3">Prodotti ancora da pagare</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {remainingSessionItems.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 bg-dark-900 rounded-lg">
                      <span className="text-white">{item.remainingQty}x {item.menu_item_name}</span>
                      <span className="text-primary-400">€{(item.price * item.remainingQty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                <p>Data: {new Date(selectedReceipt.created_at).toLocaleString('it-IT')}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="space-y-1">
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>€{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>TOTALE</span>
                <span>€{selectedReceipt.total.toFixed(2)}</span>
              </div>
              <div className="text-xs mt-3">
                <p>Pagamento: {selectedReceipt.payment_method === 'cash' ? 'Contanti' : selectedReceipt.payment_method === 'card' ? 'Carta' : 'Online'}</p>
                {selectedReceipt.smac_passed && <p>SMAC: Sì</p>}
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
