import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Clock,
  Eye,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Receipt,
  Banknote,
  CreditCard,
  Calculator,
  Users,
  Phone,
  Link2,
  Calendar,
  MessageSquare,
  X,
  Globe,
  ListChecks,
  Printer,
  FileText,
} from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';
import {
  getTables,
  getReservations,
  getSessionOrders,
  updateSessionTotal,
  getTableSession,
  getSessionPayments,
  addSessionPayment,
  getSessionRemainingAmount,
  getActiveSessions,
  setSessionTotal,
  createOrder,
  createTable,
  updateTable,
  deleteTable,
  createReservation,
  updateReservation,
  deleteReservation,
  getOrderItems,
  transferTableSession,
  getSettings,
  createTableSession,
  getSessionPaidQuantities,
  generatePartialReceipt,
  closeTableSession,
  
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import SessionDetailsModal from '../components/session/SessionDetailsModal';
// supabase not needed here
import { useSmac } from '../context/SmacContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useAuth } from '../context/AuthContext';
import type { Order, OrderItem, Table, SessionPayment, SessionPaymentItem, Receipt as ReceiptType, TableSession, Reservation, Settings } from '../types';

export function Tables() {
  // language hook not used here
  const { formatPrice: currencyFormat } = useCurrency();
  const navigate = useNavigate();
  const { isDemo } = useDemoGuard();
  const { user } = useAuth();
  const { smacEnabled } = useSmac();

  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeSessions, setActiveSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  // reservation details modal state handled via selectedReservation below
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [sessionPayments, setSessionPayments] = useState<SessionPayment[]>([]);
  const [remainingAmount, setRemainingAmount] = useState(0);
  type RemainingSessionItem = OrderItem & { remainingQty: number; order_number?: number };
  const [remainingSessionItems, setRemainingSessionItems] = useState<RemainingSessionItem[]>([]);
  const [sessionCovers, setSessionCovers] = useState(0);
  const [sessionCoverUnitPrice, setSessionCoverUnitPrice] = useState(0);
  const [_sessionIncludesCover, setSessionIncludesCover] = useState(false);
  const [splitMode, setSplitMode] = useState<'manual' | 'items'>('manual');
  interface SplitPaymentForm {
    paymentMethod: 'cash' | 'card' | 'online';
    method?: 'cash' | 'card' | 'online';
    amount: string;
    change: number;
    notes?: string;
    smac?: boolean;
  }
  const [splitPaymentForm, setSplitPaymentForm] = useState<SplitPaymentForm>({
    paymentMethod: 'cash',
    amount: '',
    change: 0,
    notes: '',
    smac: false,
  });
  interface ChangeCalculator {
    paymentMethod: 'cash' | 'card' | 'online';
    amount: string;
    change: number;
    customerGives: string;
    showChange: boolean;
  }
  const [changeCalculator, setChangeCalculator] = useState<ChangeCalculator>({
    paymentMethod: 'cash',
    amount: '',
    change: 0,
    customerGives: '',
    showChange: false,
  });
  const [coverChargeAmount, setCoverChargeAmount] = useState(0);
  const [pendingIncludeCoverCharge, setPendingIncludeCoverCharge] = useState(false);
  const [pendingPaidItems, setPendingPaidItems] = useState<SessionPaymentItem[]>([]);
  const [tableForm, setTableForm] = useState({
    name: '',
    capacity: 1,
  });
  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    phone: '',
    date: '',
    time: '',
    guests: 1,
    notes: '',
    table_ids: [] as number[],
  });
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [sessionForm, setSessionForm] = useState({ covers: '2', customer_name: '', customer_phone: '' });
  const [paymentForm, setPaymentForm] = useState({ method: 'cash' as 'cash' | 'card' | 'online', smac: false });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [openSessionApplyCover, setOpenSessionApplyCover] = useState(false);
  const [showCoverChargeModal, setShowCoverChargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBillStatusModal, setShowBillStatusModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [allSessionItems, setAllSessionItems] = useState<(OrderItem & { order_number?: number })[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
  // Numero di quote di coperto selezionate nella sezione "Per consumazione"
  const [coverSelectedCount, setCoverSelectedCount] = useState(0);

  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showReservationDetailsModal, setShowReservationDetailsModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showTableReservationsModal, setShowTableReservationsModal] = useState(false);
  const [tableReservationsList, setTableReservationsList] = useState<Reservation[]>([]);
  const [showReservationConflictModal, setShowReservationConflictModal] = useState(false);
  const [reservationConflicts, setReservationConflicts] = useState<Reservation[]>([]);
  const [pendingReservationPayload, setPendingReservationPayload] = useState<any | null>(null);
  const [pendingUpdateInfo, setPendingUpdateInfo] = useState<{ id: number; updates: any } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Listen to orders/table session changes to refresh the UI in real time
  useEffect(() => {
    const handler = () => {
      (async () => {
        try {
          const [tablesData, reservationsData] = await Promise.all([
            getTables(),
            getReservations(selectedDate),
          ]);
          setTables(tablesData);
          setReservations(reservationsData);
          const sessions = await getActiveSessions();
          setActiveSessions(sessions || []);
        } catch (err) {
          console.error('Error refreshing tables on update event', err);
        }
      })();
    };

    window.addEventListener('orders-updated', handler);
    window.addEventListener('table-sessions-updated', handler);
    window.addEventListener('reservations-updated', handler);
    window.addEventListener('tables-updated', handler);
    window.addEventListener('settings-updated', handler);
    return () => {
      window.removeEventListener('orders-updated', handler);
      window.removeEventListener('table-sessions-updated', handler);
      window.removeEventListener('reservations-updated', handler);
      window.removeEventListener('tables-updated', handler);
      window.removeEventListener('settings-updated', handler);
    };
  }, [selectedDate]);

  const checkCanWrite = () => !isDemo || (user && user.role === 'admin');

  const loadData = async () => {
    try {
      const [tablesData, reservationsData, setts] = await Promise.all([
        getTables(),
        getReservations(selectedDate),
        getSettings(),
      ]);
      setTables(tablesData);
      setReservations(reservationsData);
      setSettings(setts);
      // Default: apply cover on open session if cover is configured
      setOpenSessionApplyCover((setts?.cover_charge || 0) > 0);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
      setLoading(false);
    }
  };

  // fetch active sessions separately (kept outside loadData for clarity)
  useEffect(() => {
    (async () => {
      try {
        const sessions = await getActiveSessions();
        setActiveSessions(sessions || []);
      } catch (err) {
        console.error('Error loading active sessions', err);
      }
    })();
  }, []);

  function getTableReservation(tableId: number) {
    return reservations.find(r => (r.table_ids || [r.table_id]).includes(tableId)) || null;
  }

  function getTableStatus(tableId: number) {
    const session = activeSessions.find(s => s.table_id === tableId && s.status === 'open');
    if (session) return 'occupied';
    const reservation = getTableReservation(tableId);
    if (reservation) return 'reserved';
    return 'available';
  }

  function openReservationModal(tableId?: number) {
    if (tableId) setReservationForm({ ...reservationForm, table_ids: [tableId], date: selectedDate });
    setShowReservationModal(true);
  }

  function openTableModal(table?: Table) {
    if (table) {
      setTableForm({ name: table.name, capacity: table.capacity });
      setEditingTable(table);
    } else {
      setTableForm({ name: '', capacity: 1 });
      setEditingTable(null);
    }
    setShowTableModal(true);
  }

  // Open reservation modal directly (from header)
  function openReservationModalDirect() {
    setReservationForm({ ...reservationForm, date: selectedDate });
    setShowReservationModal(true);
  }

  async function handleDeleteTable(id: number) {
    const confirmed = window.confirm('Sei sicuro di voler eliminare questo tavolo? Questa azione è irreversibile.');
    if (!confirmed) return;
    try {
      await deleteTable(id);
      await loadData();
      showToast('Tavolo eliminato', 'success');
    } catch (err) {
      console.error(err);
      showToast('Errore eliminazione tavolo', 'error');
    }
  }

  function toggleTableInReservation(tableId: number) {
    const ids = reservationForm.table_ids || [];
    if (ids.includes(tableId)) {
      setReservationForm({ ...reservationForm, table_ids: ids.filter((i) => i !== tableId) });
    } else {
      setReservationForm({ ...reservationForm, table_ids: [...ids, tableId] });
    }
  }

  async function handleSaveTable() {
    try {
      if (editingTable) {
        await updateTable(editingTable.id, tableForm);
        showToast('Tavolo aggiornato', 'success');
      } else {
        await createTable({ name: tableForm.name, capacity: tableForm.capacity });
        showToast('Tavolo creato', 'success');
      }
      setShowTableModal(false);
      setEditingTable(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Errore salvataggio tavolo', 'error');
    }
  }

  async function handleSaveReservation() {
    try {
      const payload = {
        table_ids: reservationForm.table_ids,
        table_id: reservationForm.table_ids && reservationForm.table_ids.length > 0 ? reservationForm.table_ids[0] : 0,
        date: reservationForm.date,
        time: reservationForm.time,
        customer_name: reservationForm.customer_name,
        phone: reservationForm.phone,
        guests: reservationForm.guests,
        notes: reservationForm.notes,
        status: 'confirmed' as const,
      };
      await createReservation(payload as any);
      setShowReservationModal(false);
      await loadData();
      showToast('Prenotazione creata', 'success');
    } catch (err) {
      console.error(err);
      const e: any = err;
      if (e && e.conflicts && Array.isArray(e.conflicts) && e.conflicts.length > 0) {
        setReservationConflicts(e.conflicts);
        setPendingReservationPayload({
          table_ids: reservationForm.table_ids,
          table_id: reservationForm.table_ids && reservationForm.table_ids.length > 0 ? reservationForm.table_ids[0] : 0,
          date: reservationForm.date,
          time: reservationForm.time,
          customer_name: reservationForm.customer_name,
          phone: reservationForm.phone,
          guests: reservationForm.guests,
          notes: reservationForm.notes,
          status: 'confirmed' as const,
        });
        setShowReservationConflictModal(true);
      } else {
        showToast('Errore creazione prenotazione', 'error');
      }
    }
  }

  async function handleUpdateReservation() {
    try {
      if (!editingReservation) return;
      await updateReservation((editingReservation as any).id, reservationForm);
      setShowReservationModal(false);
      await loadData();
      showToast('Prenotazione aggiornata', 'success');
    } catch (err) {
      console.error(err);
      const e: any = err;
      if (e && e.conflicts && Array.isArray(e.conflicts) && e.conflicts.length > 0) {
        setReservationConflicts(e.conflicts);
        setPendingUpdateInfo({ id: (editingReservation as any).id, updates: reservationForm });
        setShowReservationConflictModal(true);
      } else {
        showToast('Errore aggiornamento prenotazione', 'error');
      }
    }
  }

  

  function viewReservationDetails(reservation: any) {
    setSelectedReservation(reservation);
    setShowReservationDetailsModal(true);
  }

  // Mostra tutte le prenotazioni della giornata per un tavolo
  function viewTableReservations(tableId: number) {
    const list = reservations.filter(r => (r.table_ids || [r.table_id]).includes(tableId));
    setTableReservationsList(list);
    setShowTableReservationsModal(true);
  }

  function openEditReservation(reservation: any) {
    setEditingReservation(reservation);
    setReservationForm({
      customer_name: reservation.customer_name || '',
      phone: reservation.phone || '',
      date: reservation.date || selectedDate,
      time: reservation.time || '',
      guests: reservation.guests || 1,
      notes: reservation.notes || '',
      table_ids: reservation.table_ids || (reservation.table_id ? [reservation.table_id] : []),
    });
    setShowReservationModal(true);
  }

  async function handleCancelReservation(id: number) {
    try {
      await deleteReservation(id);
      await loadData();
      showToast('Prenotazione cancellata', 'success');
    } catch (err) {
      console.error(err);
      showToast('Errore cancellazione prenotazione', 'error');
    }
  }

  const openSessionDetails = async (session: TableSession) => {
    try {
      // Aggiorna il totale prima di mostrare
      await updateSessionTotal(session.id);
      const [orders, payments, remaining] = await Promise.all([
        getSessionOrders(session.id),
        getSessionPayments(session.id),
        getSessionRemainingAmount(session.id),
      ]);

      // Ricarica la sessione aggiornata
      const sessions = await getActiveSessions();
      const updatedSession = sessions.find(s => s.id === session.id);

      setSelectedSession(updatedSession || session);
      setSessionOrders(orders);
      setSessionPayments(payments);
      setRemainingAmount(remaining);
      // Reset: l'espansione e il caricamento items è gestito dal modal condiviso
      setShowSessionModal(true);
    } catch (error) {
      console.error('Error loading session details:', error);
      showToast('Errore nel caricamento dettagli', 'error');
    }
  };

  function getSelectedTablesCapacity() {
    try {
      const ids: number[] = reservationForm.table_ids || [];
      return tables.filter(t => ids.includes(t.id)).reduce((sum, t) => sum + (t.capacity || 0), 0);
    } catch (err) {
      return 0;
    }
  }

  

  async function handleOpenSession() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (!selectedTableId) return;

    try {
      const session = await createTableSession(
        selectedTableId,
        parseInt(sessionForm.covers) || 1,
        sessionForm.customer_name || undefined,
        sessionForm.customer_phone || undefined
      );

      // Immediately create a 0€ order tied to the session so it appears in Orders list
      try {
        if (session && session.id) {
          await createOrder(
            {
              date: new Date().toISOString().split('T')[0],
              total: 0,
              payment_method: 'cash',
              order_type: 'dine_in',
              table_id: selectedTableId,
              notes: 'Conto creato all\'apertura sessione',
              status: 'pending',
              smac_passed: false,
              customer_name: sessionForm.customer_name || session.customer_name || '',
              customer_phone: sessionForm.customer_phone || session.customer_phone || '',
              created_by: 'session-placeholder',
              session_id: session.id,
              order_number: 1,
            },
            []
          );
        }
      } catch (err) {
        console.error('Error creating placeholder order for new session:', err);
      }

      // Applica il coperto se selezionato e se è configurato
      if (openSessionApplyCover && session && session.id) {
        try {
          await updateSessionTotal(session.id, true);
        } catch (err) {
          console.error('Error applying cover on new session:', err);
        }
      }

      showToast('Conto aperto', 'success');
      setShowOpenSessionModal(false);
      loadData();
    } catch (error) {
      console.error('Error opening session:', error);
      showToast('Errore nell\'apertura conto', 'error');
    }
  }

  function handleAddOrder() {
    if (!selectedSession) return;
    navigate(`/orders/new?table=${selectedSession.table_id}&session=${selectedSession.id}`);
  }

  async function handleCloseSession() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (!selectedSession) return;

    // Se il totale è 0, chiedi conferma diretta senza aprire il modal di pagamento
    if ((selectedSession?.total ?? 0) === 0) {
      const confirmed = window.confirm('Vuoi chiudere questo conto a €0.00?');
      if (confirmed) {
        try {
          await closeTableSession(selectedSession.id, 'cash', false, false);
          showToast('Conto chiuso', 'success');
          setShowSessionModal(false);
          loadData();
        } catch (error) {
          console.error('Error closing session:', error);
          showToast('Errore nella chiusura', 'error');
        }
      }
      return;
    }

    // Controlla se c'è un coperto configurato
    const settings = await getSettings();
    const coverCharge = settings.cover_charge || 0;

    if (coverCharge > 0 && (selectedSession?.covers ?? 0) > 0) {
      // Calcola il totale coperto
      const totalCoverCharge = coverCharge * (selectedSession?.covers ?? 0);
      setCoverChargeAmount(totalCoverCharge);
      // Non aprire più il modal di conferma coperto dal tavolo: usa lo stato corrente
      // Use current cover include setting stored in state (no checkbox in modal)
      const include = !!_sessionIncludesCover;
      setPendingIncludeCoverCharge(include);
      proceedToPayment(include);
    } else {
      // Nessun coperto, procedi direttamente al pagamento
      proceedToPayment(false);
    }
  }

  function proceedToPayment(includeCover: boolean) {
    setPendingIncludeCoverCharge(includeCover);
    setShowCoverChargeModal(false);
    setPaymentForm({ method: 'cash', smac: false });
    setChangeCalculator(prev => ({ ...prev, customerGives: '', showChange: false }));
    setShowPaymentModal(true);
  }

  async function confirmCloseSession() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (!selectedSession) return;

    try {
      await closeTableSession(selectedSession.id, paymentForm.method, paymentForm.smac, pendingIncludeCoverCharge);
      showToast('Conto chiuso', 'success');
      setShowPaymentModal(false);
      setShowSessionModal(false);
      loadData();
    } catch (error) {
      console.error('Error closing session:', error);
      showToast('Errore nella chiusura', 'error');
    }
  }

  function handleTransfer() {
    if (!selectedSession) return;
    setShowTransferModal(true);
  }

  async function confirmTransfer(newTableId: number) {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (!selectedSession) return;

    try {
      await transferTableSession(selectedSession.id, newTableId);
      showToast('Tavolo trasferito', 'success');
      setShowTransferModal(false);
      setShowSessionModal(false);
      loadData();
    } catch (error) {
      console.error('Error transferring table:', error);
      showToast('Errore nel trasferimento', 'error');
    }
  }

  async function handleSplitBill() {
    if (!selectedSession) return;
    setSplitPaymentForm(prev => ({ ...prev, amount: '', method: 'cash', notes: '', smac: false }));
    setSplitMode('manual');
    setSelectedItems({});
    setChangeCalculator(prev => ({ ...prev, customerGives: '', showChange: false }));

    // Carica tutti gli items di tutte le comande
    try {
      const allItems: (OrderItem & { order_number?: number })[] = [];
      for (const order of sessionOrders) {
        const items = await getOrderItems(order.id);
        items.forEach(item => {
          allItems.push({ ...item, order_number: order.order_number || 1 });
        });
      }
      setAllSessionItems(allItems);

      // Carica le quantità già pagate per calcolare i rimanenti
      const paidQtys = await getSessionPaidQuantities(selectedSession.id);

      // Calcola items rimanenti (sottrai quantità già pagate)
      const remaining = allItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(remaining);
    } catch (error) {
      console.error('Error loading items:', error);
    }

    setCoverSelectedCount(0);
    setShowSplitModal(true);
  }


  

  // Calcola resto da dare al cliente
  function calculateChange(): number {
    const customerGives = parseFloat(changeCalculator.customerGives) || 0;
    const paymentAmount = parseFloat(splitPaymentForm.amount) || 0;
    return Math.max(0, customerGives - paymentAmount);
  }

  // Nota: il calcolo "alla romana" è effettuato inline dove necessario.

  // Calcola totale items selezionati (con quantità parziali)
  function calculateSelectedItemsTotal(): number {
    return Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
      const item = remainingSessionItems.find(i => i.id === Number(itemId));
      if (item && qty > 0) {
        return sum + (item.price * qty);
      }
      return sum;
    }, 0);
  }

  // Incrementa quantità selezionata per un item (usa remainingQty come limite)
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

  // Decrementa quantità selezionata per un item
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

  // Seleziona tutti o deseleziona tutti per un item (usa remainingQty)
  function toggleAllItemQuantity(itemId: number) {
    const item = remainingSessionItems.find(i => i.id === itemId);
    if (!item) return;

    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      if (current === item.remainingQty) {
        // Deseleziona tutto
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      } else {
        // Seleziona tutto (solo i rimanenti)
        return { ...prev, [itemId]: item.remainingQty };
      }
    });
  }

  // Nota: il calcolatore "Alla Romana" è applicato inline quando necessario.

  // Stato per memorizzare gli items selezionati per il pagamento corrente

  // Applica pagamento per consumazione
  function applyItemsSelection() {
    const amount = calculateSelectedItemsTotal();
    // include selected cover quotes
    const coverAmount = coverSelectedCount > 0 && sessionCovers > 0 ? (sessionCoverUnitPrice * coverSelectedCount) : 0;
    const totalToCharge = amount + coverAmount;
    if (totalToCharge > 0 && totalToCharge <= remainingAmount + 0.01) {
      // Genera descrizione con quantità
      const parts: string[] = Object.entries(selectedItems)
        .map(([itemId, qty]) => {
          const item = remainingSessionItems.find(i => i.id === Number(itemId));
          return item ? `${qty}x ${item.menu_item_name}` : '';
        })
        .filter(Boolean);
      if (coverSelectedCount > 0) {
        parts.push(`${coverSelectedCount}x Coperto`);
      }
      const itemDescriptions = parts.join(', ');

      // Prepara gli items da salvare nel pagamento
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

      // If cover selected, add it as a paid item entry
      if (coverSelectedCount > 0) {
        paidItems.push({
          order_item_id: undefined as any,
          quantity: coverSelectedCount,
          menu_item_name: 'Coperto',
          price: sessionCoverUnitPrice,
        });
      }

      setPendingPaidItems(paidItems);
      setSplitPaymentForm((prev: any) => ({
        ...prev,
        amount: Math.min(totalToCharge, remainingAmount).toFixed(2),
        notes: itemDescriptions.length > 40 ? itemDescriptions.substring(0, 40) + '...' : itemDescriptions
      }));
      setSplitMode('manual');
      setSelectedItems({});
      setCoverSelectedCount(0);
    }
  }

  async function addSplitPayment() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (!selectedSession) {
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
      // If pending paid items include Coperto, increase session total by that amount first so totals display correctly
      const coverAmount = (pendingPaidItems || []).filter(pi => pi.menu_item_name === 'Coperto').reduce((s, it) => s + (it.price * it.quantity), 0);
      if (coverAmount > 0 && selectedSession) {
        try {
          const current = await getTableSession(selectedSession.id);
          if (current) {
            await setSessionTotal(selectedSession.id, (current.total || 0) + coverAmount);
            setSelectedSession(prev => prev ? { ...prev, total: (current.total || 0) + coverAmount } : prev);
          }
        } catch (err) {
          console.error('Error updating session total with cover before payment (tables):', err);
        }
      }

      // Passa gli items pagati (se presenti dal pagamento per consumazione)
      await addSessionPayment(
        selectedSession.id,
        amount,
        splitPaymentForm.method ?? 'cash',
        splitPaymentForm.notes || undefined,
        splitPaymentForm.smac,
        pendingPaidItems.length > 0 ? pendingPaidItems : undefined
      );

      // Ricarica i pagamenti e ricalcola items rimanenti
      const [payments, remaining, paidQtys] = await Promise.all([
        getSessionPayments(selectedSession.id),
        getSessionRemainingAmount(selectedSession.id),
        getSessionPaidQuantities(selectedSession.id),
      ]);
      setSessionPayments(payments);
      setRemainingAmount(remaining);

      // Ricalcola items rimanenti
      const updatedRemaining = allSessionItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);
      setRemainingSessionItems(updatedRemaining);

      setSplitPaymentForm(prev => ({ ...prev, amount: '', method: 'cash', notes: '', smac: false }));
      setPendingPaidItems([]);

      showToast('Pagamento aggiunto', 'success');

      // Se il rimanente è 0, chiudi automaticamente
      if (remaining <= 0.01) { // Tolleranza per arrotondamenti
        try {
          await closeTableSession(selectedSession.id, 'split', false);
          showToast('Conto saldato e chiuso', 'success');
          setShowSplitModal(false);
          setShowSessionModal(false);
          loadData();
        } catch (closeError) {
          console.error('Error closing session:', closeError);
          showToast('Pagamento aggiunto, ma errore nella chiusura automatica', 'warning');
        }
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      showToast('Errore nell\'aggiunta pagamento', 'error');
    }
  }

  // Funzione per visualizzare lo stato del conto
  async function handleShowBillStatus() {
    if (!selectedSession) return;
    try {
      const [payments, remaining, paidQtys] = await Promise.all([
        getSessionPayments(selectedSession.id),
        getSessionRemainingAmount(selectedSession.id),
        getSessionPaidQuantities(selectedSession.id),
      ]);

      const allSessionOrders = await getSessionOrders(selectedSession.id);
      const allItems: (OrderItem & { order_number?: number })[] = [];
      for (const order of allSessionOrders) {
        const items = await getOrderItems(order.id);
        items.forEach(item => {
          allItems.push({ ...item, order_number: order.order_number || 1 });
        });
      }

      // Calcola items rimanenti
      const remainingItems = allItems.map(item => ({
        ...item,
        remainingQty: item.quantity - (paidQtys[item.id] || 0)
      })).filter(item => item.remainingQty > 0);

      // Carica info sessione e imposta stato coperto
      try {
        const session = await getTableSession(selectedSession.id);
        const settings = await getSettings();
        const covers = session?.covers || 0;
        const coverUnit = settings.cover_charge || 0;
        const ordersTotal = allSessionOrders.reduce((sum, o) => sum + o.total, 0);
        const expectedWithCover = ordersTotal + coverUnit * covers;
        const applied = Math.abs((session?.total || 0) - expectedWithCover) < 0.01 || (session?.total || 0) >= expectedWithCover - 0.01;
        setSessionCovers(covers);
        setSessionCoverUnitPrice(coverUnit);
        setSessionIncludesCover(applied && coverUnit > 0 && covers > 0);
      } catch (err) {
        console.error('Error loading session info for bill status modal (tables):', err);
      }

      setAllSessionItems(allItems);
      setSessionPayments(payments);
      setRemainingAmount(remaining);
      setRemainingSessionItems(remainingItems);
      setShowBillStatusModal(true);
    } catch (error) {
      console.error('Error loading bill status (tables):', error);
      showToast('Errore nel caricamento stato conto', 'error');
    }
  }

  // Funzione per stampare scontrino di un pagamento
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

  // Funzione per stampare lo scontrino
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
            <div class="shop-name">${selectedReceipt?.shop_info?.name ?? ''}</div>
            ${selectedReceipt?.shop_info?.address ? `<div>${selectedReceipt.shop_info.address}</div>` : ''}
            ${selectedReceipt?.shop_info?.phone ? `<div>Tel: ${selectedReceipt.shop_info.phone}</div>` : ''}
          </div>
          <div class="divider"></div>
          <div>Data: ${selectedReceipt?.date ?? ''} ${selectedReceipt?.time ?? ''}</div>
          <div class="divider"></div>
          ${(selectedReceipt?.items || []).map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.name}</span>
              <span>€${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item total">
            <span>TOTALE</span>
            <span>€${(selectedReceipt?.total ?? 0).toFixed(2)}</span>
          </div>
          <div>Pagamento: ${selectedReceipt?.payment_method === 'cash' ? 'Contanti' : selectedReceipt?.payment_method === 'card' ? 'Carta' : 'Online'}</div>
          ${smacEnabled && selectedReceipt?.smac_passed ? '<div>SMAC: Sì</div>' : ''}
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

  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const handleTableClick = (tableId: number) => {
    const status = getTableStatus(tableId);
    const session = activeSessions.find(s => s.table_id === tableId) || null;
    const reservation = getTableReservation(tableId);
    if (status === 'occupied') {
      if (session) openSessionDetails(session);
    } else if (status === 'available' || status === 'reserved') {
      setSelectedTableId(tableId);
      if (reservation) {
        setSessionForm({
          covers: reservation.guests?.toString() || '2',
          customer_name: reservation.customer_name || '',
          customer_phone: reservation.phone || '',
        });
      } else {
        setSessionForm({ covers: '2', customer_name: '', customer_phone: '' });
      }
      setShowOpenSessionModal(true);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Tavoli e Prenotazioni</h1>
          <p className="text-dark-400 mt-1 text-sm sm:text-base">Gestisci tavoli e prenotazioni</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => openReservationModalDirect()} className="btn-secondary flex-1 sm:flex-none">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Prenotazione</span>
          </button>
          <button onClick={() => openTableModal()} className="btn-primary flex-1 sm:flex-none">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Tavolo</span>
          </button>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto text-sm sm:text-base"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-emerald-500" />
          <span className="text-xs sm:text-sm text-dark-300">Disponibile</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500" />
          <span className="text-xs sm:text-sm text-dark-300">Occupato</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-amber-500" />
          <span className="text-xs sm:text-sm text-dark-300">Prenotato</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-1 sm:gap-3">
        {tables.map((table) => {
          const status = getTableStatus(table.id);
          const session = activeSessions.find((s) => s.table_id === table.id);

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table.id)}
              className={`
                group relative
                ${status === 'available' ? 'table-available cursor-pointer hover:scale-105' : ''}
                ${status === 'occupied' ? 'table-occupied cursor-pointer hover:scale-105' : ''}
                ${status === 'reserved' ? 'table-reserved cursor-pointer hover:scale-105' : ''}
                  transform scale-90 pt-6 sm:pt-8 p-2 sm:p-3 transition-transform flex flex-col justify-between min-h-[110px]
              `}
            >
              <h3 className="text-base sm:text-lg font-bold text-center w-full mt-8 sm:mt-10">{table.name}</h3>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">{table.capacity}</span>
              </div>

              {session && (
                <div className="mt-2 text-[10px] sm:text-xs space-y-1 text-center">
                  <p className="flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" />
                    {session.covers} coperti
                  </p>
                  <p className="font-semibold text-base sm:text-lg">€{session.total.toFixed(2)}</p>
                </div>
              )}

              {/* Reservation preview intentionally omitted: show only table name, capacity and actions. */}

              {(status === 'available' || status === 'reserved') && (
                <div className="mt-2 sm:mt-3 space-y-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableClick(table.id);
                    }}
                    className="text-[10px] sm:text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Apri Conto
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openReservationModal(table.id);
                    }}
                    className="block text-[10px] sm:text-xs underline hover:no-underline"
                  >
                    Prenota
                  </button>
                </div>
              )}

              {/* Edit/Delete on hover */}
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-2 transition-colors">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewTableReservations(table.id);
                  }}
                  className="p-2 bg-dark-800 rounded hover:bg-dark-700"
                  title="Visualizza prenotazioni"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTableModal(table);
                  }}
                  className="p-2 bg-dark-800 rounded hover:bg-dark-700"
                  title="Modifica tavolo"
                >
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table.id);
                  }}
                  className="p-2 bg-dark-800 rounded hover:bg-red-500/20"
                  title="Elimina tavolo"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Reservations */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white text-sm sm:text-base">
            Prenotazioni per {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>
        <div className="card-body">
          {reservations.length === 0 ? (
            <p className="text-dark-400 text-center py-4 text-sm">
              Nessuna prenotazione per questa data
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-dark-900 rounded-xl gap-3"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-sm sm:text-base truncate">
                        {res.customer_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-xs sm:text-sm text-dark-400">
                        <span>{res.time}</span>
                        <span className="flex items-center gap-1">
                          {res.table_ids && res.table_ids.length > 1 && (
                            <Link2 className="w-3 h-3 text-primary-400" />
                          )}
                          {res.table_name}
                        </span>
                        <span>{res.guests} ospiti</span>
                      </div>
                      {res.phone && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-dark-400">
                          <Phone className="w-3 h-3" />
                          {res.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`badge text-xs ${res.status === 'confirmed' ? 'badge-success' : 'badge-danger'}`}>
                      {res.status === 'confirmed' ? 'Confermata' : 'Annullata'}
                    </span>
                    <button
                      onClick={() => viewReservationDetails(res)}
                      className="p-1.5 sm:p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Visualizza dettagli"
                    >
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
                    </button>
                    <button
                      onClick={() => openEditReservation(res)}
                      className="p-1.5 sm:p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
                    </button>
                    {res.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelReservation(res.id)}
                        className="p-1.5 sm:p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Annulla"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Modal */}
      <Modal
        isOpen={showTableModal}
        onClose={() => { setShowTableModal(false); setEditingTable(null); }}
        title={editingTable ? 'Modifica Tavolo' : 'Nuovo Tavolo'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome Tavolo</label>
            <input
              type="text"
              value={tableForm.name}
              onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
              className="input"
              placeholder="Es. Tavolo 1"
            />
          </div>

          <div>
            <label className="label">Capacità (posti)</label>
            <input
              type="number"
              min="1"
              value={tableForm.capacity}
              onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
              className="input"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveTable} className="btn-primary flex-1">
              {editingTable ? 'Salva' : 'Crea'}
            </button>
            <button onClick={() => setShowTableModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Reservation Modal (Create/Edit) */}
      <Modal
        isOpen={showReservationModal}
        onClose={() => {
          setShowReservationModal(false);
          setEditingReservation(null);
        }}
        title={editingReservation ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}
        size="xl"
      >
        <div className="space-y-4">
          {/* Desktop: Data, Ora, Nome Cliente, Telefono, Ospiti su 2 righe */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Data</label>
              <input
                type="date"
                value={reservationForm.date}
                onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Ora</label>
              <input
                type="time"
                value={reservationForm.time}
                onChange={(e) => setReservationForm({ ...reservationForm, time: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input
                type="tel"
                value={reservationForm.phone}
                onChange={(e) => setReservationForm({ ...reservationForm, phone: e.target.value })}
                className="input"
                placeholder="+39..."
              />
            </div>
            <div>
              <label className="label">Ospiti</label>
              <input
                type="number"
                min="1"
                value={reservationForm.guests}
                onChange={(e) => setReservationForm({ ...reservationForm, guests: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Nome Cliente *</label>
            <input
              type="text"
              value={reservationForm.customer_name}
              onChange={(e) => setReservationForm({ ...reservationForm, customer_name: e.target.value })}
              className="input"
              placeholder="Nome e cognome"
            />
          </div>

          {/* Selezione tavoli - Multi-tavolo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                <Link2 className="w-4 h-4 inline mr-1" />
                Tavoli
              </label>
              <span className="text-xs text-dark-400">
                Capacità totale: <span className="text-primary-400 font-semibold">{getSelectedTablesCapacity()}</span> posti
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-dark-900 rounded-xl">
              {tables.map((table) => {
                const isSelected = reservationForm.table_ids.includes(table.id);
                const tableStatus = getTableStatus(table.id);
                // Allow selecting currently occupied or already reserved tables when inside the reservation modal
                // (a table being occupied now or having a reservation shouldn't prevent booking it for a different time/date).
                const isAvailable = tableStatus === 'available' || (showReservationModal && (tableStatus === 'occupied' || tableStatus === 'reserved'));

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => isAvailable && toggleTableInReservation(table.id)}
                    disabled={!isAvailable}
                    className={`p-3 rounded-lg border-2 text-sm flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/10 text-white'
                        : isAvailable
                        ? 'border-dark-600 text-dark-300 hover:border-dark-500'
                        : 'border-dark-700 text-dark-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-left">{table.name}</span>
                    <span className="text-xs text-dark-400 flex-shrink-0">{table.capacity}p</span>
                  </button>
                );
              })}
            </div>
            {reservationForm.table_ids.length > 1 && (
              <p className="text-xs text-primary-400 mt-2 flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Tavoli uniti: {tables.filter(t => reservationForm.table_ids.includes(t.id)).map(t => t.name).join(' + ')}
              </p>
            )}
          </div>

          <div>
            <label className="label">Note</label>
            <textarea
              value={reservationForm.notes}
              onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
              className="input resize-none h-16"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={editingReservation ? handleUpdateReservation : handleSaveReservation}
              className="btn-primary flex-1"
            >
              {editingReservation ? 'Salva Modifiche' : 'Crea Prenotazione'}
            </button>
            <button
              onClick={() => {
                setShowReservationModal(false);
                setEditingReservation(null);
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Reservation Details Modal */}
      <Modal
        isOpen={showReservationDetailsModal}
        onClose={() => setShowReservationDetailsModal(false)}
        title="Dettagli Prenotazione"
        size="md"
      >
        {selectedReservation && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <span className={`badge text-lg px-4 py-2 ${
                selectedReservation?.status === 'confirmed' ? 'badge-success' :
                selectedReservation?.status === 'cancelled' ? 'badge-danger' :
                'badge-secondary'
              }`}>
                {selectedReservation?.status === 'confirmed' ? 'Confermata' :
                 selectedReservation?.status === 'cancelled' ? 'Annullata' : 'Completata'}
              </span>
            </div>

            {/* Customer Info */}
            <div className="p-4 bg-dark-900 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">{selectedReservation?.customer_name}</p>
                  {selectedReservation?.phone && (
                    <div className="flex items-center gap-1 text-dark-400">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${selectedReservation?.phone}`} className="hover:text-primary-400">
                        {selectedReservation?.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Calendar className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">Data</p>
                <p className="font-semibold text-white">
                  {new Date(selectedReservation?.date ?? '').toLocaleDateString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Clock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">Ora</p>
                <p className="font-semibold text-white">{selectedReservation?.time}</p>
              </div>
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Users className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">Ospiti</p>
                <p className="font-semibold text-white">{selectedReservation?.guests} persone</p>
              </div>
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Link2 className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">
                  {(selectedReservation?.table_ids?.length ?? 0) > 1
                    ? 'Tavoli Uniti'
                    : 'Tavolo'}
                </p>
                <p className="font-semibold text-white">{selectedReservation?.table_name}</p>
                {(selectedReservation?.table_ids?.length ?? 0) > 1 && (
                  <p className="text-xs text-primary-400 mt-1">
                    {selectedReservation?.table_ids?.length ?? 0} tavoli
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedReservation?.notes && (
              <div className="p-4 bg-dark-900 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-dark-400" />
                  <p className="text-sm text-dark-400">Note</p>
                </div>
                <p className="text-white">{selectedReservation?.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => selectedReservation && openEditReservation(selectedReservation)}
                className="btn-secondary flex-1"
              >
                <Edit2 className="w-5 h-5" />
                Modifica
              </button>
              {selectedReservation?.status === 'confirmed' && (
                <button
                  onClick={() => {
                    if (selectedReservation) {
                      handleCancelReservation(selectedReservation.id);
                      setShowReservationDetailsModal(false);
                    }
                  }}
                  className="btn-danger"
                >
                  <X className="w-5 h-5" />
                  Annulla
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Table Reservations Modal - mostra prenotazioni della giornata filtrate per tavolo */}
      <Modal
        isOpen={showTableReservationsModal}
        onClose={() => setShowTableReservationsModal(false)}
        title="Prenotazioni tavolo"
        size="sm"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {tableReservationsList.length === 0 ? (
            <p className="text-dark-400 text-center py-4">Nessuna prenotazione per questo tavolo oggi</p>
          ) : (
            <div className="space-y-2">
              {tableReservationsList.map((r) => (
                <div key={r.id} className="p-2 sm:p-3 bg-dark-900 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{r.customer_name}</p>
                    <p className="text-xs text-dark-400">{r.time} • {r.guests} ospiti</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedReservation(r); setShowReservationDetailsModal(true); setShowTableReservationsModal(false); }} className="btn-secondary py-1 px-2 text-xs">Dettagli</button>
                    <button onClick={() => { handleCancelReservation(r.id); setTableReservationsList(prev => prev.filter(x => x.id !== r.id)); }} className="btn-danger py-1 px-2 text-xs">Annulla</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Reservation Conflict Modal - mostra prenotazioni in conflitto e permette override */}
      <Modal
        isOpen={showReservationConflictModal}
        onClose={() => setShowReservationConflictModal(false)}
        title="Conflitto Prenotazioni"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-dark-300">Attenzione: ci sono prenotazioni vicine per questo tavolo nelle seguenti fasce orarie. Vuoi procedere comunque?</p>
          <div className="space-y-2">
            {reservationConflicts.map((c) => (
              <div key={c.id} className="p-3 bg-dark-900 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{c.customer_name}</p>
                  <p className="text-sm text-dark-400">{c.date} • {c.time} • {c.guests} ospiti</p>
                </div>
                <div className="text-sm text-dark-400">Tavoli: {(c.table_names || (c.table_ids || [c.table_id]).join(', '))}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setShowReservationConflictModal(false); setReservationConflicts([]); setPendingReservationPayload(null); setPendingUpdateInfo(null); }}>Annulla</button>
            <button className="btn-primary flex-1" onClick={async () => {
              try {
                if (pendingReservationPayload) {
                  await createReservation(pendingReservationPayload, { force: true });
                  setShowReservationModal(false);
                  setShowReservationConflictModal(false);
                  setPendingReservationPayload(null);
                  setReservationConflicts([]);
                  await loadData();
                  showToast('Prenotazione creata (forzata)', 'success');
                } else if (pendingUpdateInfo) {
                  await updateReservation(pendingUpdateInfo.id, pendingUpdateInfo.updates, { force: true });
                  setShowReservationModal(false);
                  setShowReservationConflictModal(false);
                  setPendingUpdateInfo(null);
                  setReservationConflicts([]);
                  await loadData();
                  showToast('Prenotazione aggiornata (forzata)', 'success');
                }
              } catch (err) {
                console.error('Errore forzando prenotazione:', err);
                showToast('Errore durante la conferma forzata', 'error');
              }
            }}>Conferma e Salva</button>
          </div>
        </div>
      </Modal>

      {/* Open Session Modal (Apri Conto) */}
      <Modal
        isOpen={showOpenSessionModal}
        onClose={() => setShowOpenSessionModal(false)}
        title="Apri Conto"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Numero Coperti</label>
            <input
              type="number"
              min="1"
              value={sessionForm.covers}
              onChange={(e) => setSessionForm({ ...sessionForm, covers: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Nome Cliente (opzionale)</label>
            <input
              type="text"
              value={sessionForm.customer_name}
              onChange={(e) => setSessionForm({ ...sessionForm, customer_name: e.target.value })}
              className="input"
              placeholder="Es. Marco Rossi"
            />
          </div>

          <div>
            <label className="label">Telefono (opzionale)</label>
            <input
              type="tel"
              value={sessionForm.customer_phone}
              onChange={(e) => setSessionForm({ ...sessionForm, customer_phone: e.target.value })}
              className="input"
              placeholder="+39..."
            />
          </div>

          {/* Checkbox applica coperto: mostra solo se impostato coperto nelle settings */}
          {(settings?.cover_charge || 0) > 0 && (
            <div className="flex items-center gap-3">
              <input
                id="open_session_apply_cover_tables"
                type="checkbox"
                checked={openSessionApplyCover}
                onChange={(e) => setOpenSessionApplyCover(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="open_session_apply_cover_tables" className="text-white text-sm">
                Applica coperto ({currencyFormat(settings?.cover_charge ?? 0)} / ospite)
              </label>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleOpenSession} className="btn-primary flex-1">
              Apri Conto
            </button>
            <button onClick={() => setShowOpenSessionModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Session Details Modal - usa componente condiviso */}
      <SessionDetailsModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        sessionId={selectedSession?.id ?? undefined}
        onAddOrder={() => handleAddOrder()}
        onTransfer={() => handleTransfer()}
        onOpenSplit={() => handleSplitBill()}
        onOpenBillStatus={() => handleShowBillStatus()}
        onCloseSession={() => handleCloseSession()}
      />
      

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
            <p className="text-2xl font-bold text-primary-400">€{coverChargeAmount.toFixed(2)}</p>
            <p className="text-xs text-dark-500 mt-1">
              ({selectedSession?.covers || 0} coperti × €{(coverChargeAmount / (selectedSession?.covers || 1)).toFixed(2)})
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

      {/* Payment Modal (Chiudi Conto) */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Chiudi Conto"
        size={paymentForm.method === 'cash' && (selectedSession?.total ?? 0) > 0 ? '2xl' : 'md'}
      >
        {selectedSession && (
          <div className={paymentForm.method === 'cash' && (selectedSession?.total ?? 0) > 0 ? 'md:grid md:grid-cols-2 md:gap-6' : ''}>
            {/* Colonna sinistra: Info pagamento */}
            <div className="space-y-6">
              <div className="text-center p-4 bg-dark-900 rounded-xl">
                <p className="text-sm text-dark-400">Totale da pagare</p>
                <p className="text-3xl font-bold text-primary-400">€{(selectedSession?.total ?? 0).toFixed(2)}</p>
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

              {smacEnabled && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="smac"
                    checked={paymentForm.smac}
                    onChange={(e) => setPaymentForm({ ...paymentForm, smac: e.target.checked })}
                    className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="smac" className="text-white">SMAC passato</label>
                </div>
              )}

              {/* Pulsanti azione - mostrati qui se non contanti OPPURE se totale è 0 */}
              {(paymentForm.method !== 'cash' || (selectedSession?.total ?? 0) === 0) && (
                <div className="flex items-center gap-3 pt-4">
                  <button onClick={confirmCloseSession} className="btn-primary flex-1">
                    Conferma Pagamento
                  </button>
                  <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                    Annulla
                  </button>
                </div>
              )}
            </div>

            {/* Colonna destra: Calcolatore Resto - solo per contanti con totale > 0 */}
            {paymentForm.method === 'cash' && (selectedSession?.total ?? 0) > 0 && (
              <div className="mt-6 md:mt-0 space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
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
                        onChange={(e) => setChangeCalculator({ ...changeCalculator, customerGives: e.target.value })}
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
                        onClick={() => setChangeCalculator({ ...changeCalculator, customerGives: amount.toString() })}
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
                        <span className="text-white">€{(selectedSession?.total ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-dark-400">Cliente dà:</span>
                        <span className="text-white">€{parseFloat(changeCalculator.customerGives).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-dark-700 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 font-semibold">RESTO DA DARE:</span>
                        <span className="text-2xl font-bold text-emerald-400">
                          €{Math.max(0, parseFloat(changeCalculator.customerGives) - (selectedSession?.total ?? 0)).toFixed(2)}
                        </span>
                      </div>
                      {parseFloat(changeCalculator.customerGives) < (selectedSession?.total ?? 0) && (
                        <p className="text-amber-400 text-sm mt-2">
                          ⚠️ Il cliente non ha dato abbastanza! Mancano €{((selectedSession?.total ?? 0) - parseFloat(changeCalculator.customerGives)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Pulsanti azione per contanti con totale > 0 */}
                <div className="flex items-center gap-3">
                  <button onClick={confirmCloseSession} className="btn-primary flex-1">
                    Conferma Pagamento
                  </button>
                  <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Trasferisci Tavolo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-dark-400">Seleziona il nuovo tavolo:</p>
          <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {tables
              .filter(t => t.id !== selectedSession?.table_id && getTableStatus(t.id) === 'available')
              .map(table => (
                <button
                  key={table.id}
                  onClick={() => confirmTransfer(table.id)}
                  className="p-4 bg-dark-900 rounded-xl hover:bg-dark-800 transition-colors text-center"
                >
                  <p className="font-semibold text-white">{table.name}</p>
                  <p className="text-sm text-dark-400">{table.capacity} posti</p>
                </button>
              ))
            }
          </div>
          {tables.filter(t => t.id !== selectedSession?.table_id && getTableStatus(t.id) === 'available').length === 0 && (
            <p className="text-center text-dark-400 py-4">Nessun tavolo libero disponibile</p>
          )}
          <button onClick={() => setShowTransferModal(false)} className="btn-secondary w-full">
            Annulla
          </button>
        </div>
      </Modal>

      {/* Split Bill Modal */}
      <Modal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        title="Dividi Conto"
        size="3xl"
      >
        {selectedSession && (
          <div className="md:grid md:grid-cols-5 md:gap-6">
            {/* Colonna sinistra: Summary e Pagamenti */}
            <div className="md:col-span-2 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-dark-900 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-dark-400">Totale</p>
                  <p className="text-sm lg:text-base font-bold text-white">€{(selectedSession?.total ?? 0).toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-dark-400">Pagato</p>
                  <p className="text-sm lg:text-base font-bold text-emerald-400">
                    €{((selectedSession?.total ?? 0) - remainingAmount).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-dark-400">Rimanente</p>
                  <p className="text-sm lg:text-base font-bold text-primary-400">€{remainingAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {(selectedSession?.total ?? 0) > 0 && (
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (((selectedSession?.total ?? 0) - remainingAmount) / (selectedSession?.total ?? 1)) * 100)}%` }}
                  />
                </div>
              )}

              {/* Payments List */}
              {sessionPayments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-2">Pagamenti effettuati</h4>
                  <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
                    {sessionPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 bg-dark-900 rounded-lg">
                        <div className="flex items-center gap-2">
                          {payment.payment_method === 'cash' && <Banknote className="w-4 h-4 text-emerald-400" />}
                          {payment.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-400" />}
                          {payment.payment_method === 'online' && <Globe className="w-4 h-4 text-purple-400" />}
                          <span className="text-white">€{payment.amount.toFixed(2)}</span>
                          {payment.notes && <span className="text-dark-400 text-sm">- {payment.notes}</span>}
                        </div>
                        {smacEnabled && payment.smac_passed && (
                          <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                            SMAC
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Colonna destra: Opzioni pagamento */}
            <div className="md:col-span-3 mt-6 md:mt-0">

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

                {/* Per Consumazione - Item Selection con quantità parziali */}
                {splitMode === 'items' && (
                  <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl space-y-4">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-blue-400" />
                      Paga per Consumazione
                    </h4>
                    <p className="text-sm text-dark-400">
                      Seleziona quanti pezzi di ogni prodotto pagare. I prodotti già pagati non vengono mostrati.
                    </p>
                    <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-2">
                      {remainingSessionItems.length === 0 ? (
                        <p className="text-center text-dark-500 py-4">
                          {allSessionItems.length === 0 ? 'Nessun prodotto ordinato' : 'Tutti i prodotti sono stati pagati'}
                        </p>
                      ) : (
                        remainingSessionItems.map((item) => {
                          const selectedQty = selectedItems[item.id] || 0;
                          const isSelected = selectedQty > 0;
                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-dark-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                {/* Info prodotto */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">{item.menu_item_name}</p>
                                  <p className="text-xs text-dark-400">
                                    €{item.price.toFixed(2)} cad. • Rimasti {item.remainingQty} pz
                                    {item.remainingQty < item.quantity && (
                                      <span className="text-emerald-400 ml-1">
                                        ({item.quantity - item.remainingQty} già pagati)
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {/* Controlli quantità */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Bottone seleziona tutto (tap rapido) */}
                                  <button
                                    onClick={() => toggleAllItemQuantity(item.id)}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                      selectedQty === item.remainingQty
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                    }`}
                                  >
                                    Tutti
                                  </button>

                                  {/* Controlli +/- */}
                                  <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                                    <button
                                      onClick={() => decrementItemSelection(item.id)}
                                      disabled={selectedQty === 0}
                                      className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                      <span className="text-lg font-bold text-white">-</span>
                                    </button>
                                    <span className={`w-8 text-center font-bold ${
                                      isSelected ? 'text-blue-400' : 'text-dark-500'
                                    }`}>
                                      {selectedQty}
                                    </span>
                                    <button
                                      onClick={() => incrementItemSelection(item.id)}
                                      disabled={selectedQty >= item.remainingQty}
                                      className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                      <span className="text-lg font-bold text-white">+</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Subtotale se selezionato */}
                              {isSelected && (
                                <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
                                  <span className="text-xs text-dark-400">
                                    {selectedQty}/{item.remainingQty} selezionati
                                  </span>
                                  <span className="text-sm font-semibold text-blue-400">
                                    €{(item.price * selectedQty).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {Object.keys(selectedItems).length > 0 && (
                      <div className="p-3 bg-dark-900 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-dark-400">Prodotti selezionati:</span>
                          <span className="text-white">
                            {Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0)} pz
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-dark-400">Totale:</span>
                          <span className="text-blue-400 font-bold text-lg">
                            €{calculateSelectedItemsTotal().toFixed(2)}
                          </span>
                        </div>
                        {calculateSelectedItemsTotal() > remainingAmount && (
                          <p className="text-xs text-amber-400 mt-2">
                            Nota: il totale supera il rimanente, verrà addebitato €{remainingAmount.toFixed(2)}
                          </p>
                        )}
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
                    <h4 className="font-medium text-white">Pagamento manuale</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Importo da incassare</label>
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
                        <label className="label">Note (opzionale)</label>
                        <input
                          type="text"
                          value={splitPaymentForm.notes}
                          onChange={(e) => setSplitPaymentForm({ ...splitPaymentForm, notes: e.target.value })}
                          className="input"
                          placeholder="Es. Marco"
                        />
                      </div>
                    </div>
                    {/* Quick amounts */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSplitPaymentForm({ ...splitPaymentForm, amount: remainingAmount.toFixed(2) })}
                        className="px-3 py-1 text-sm bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        Tutto (€{remainingAmount.toFixed(2)})
                      </button>
                      <button
                        onClick={() => setSplitPaymentForm({ ...splitPaymentForm, amount: (remainingAmount / 2).toFixed(2) })}
                        className="px-3 py-1 text-sm bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        Metà (€{(remainingAmount / 2).toFixed(2)})
                      </button>
                      {(selectedSession?.covers ?? 0) > 1 && (
                        <button
                          onClick={() => setSplitPaymentForm({ ...splitPaymentForm, amount: (remainingAmount / (selectedSession?.covers ?? 1)).toFixed(2) })}
                          className="px-3 py-1 text-sm bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                        >
                          1/{(selectedSession?.covers ?? 0)} (€{(remainingAmount / (selectedSession?.covers ?? 1)).toFixed(2)})
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSplitPaymentForm(prev => ({ ...prev, method: 'cash' }));
                          setChangeCalculator(prev => ({ ...prev, customerGives: '', showChange: true }));
                        }}
                        className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${
                          splitPaymentForm.method === 'cash'
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-700'
                        }`}
                      >
                        <Banknote className="w-4 h-4" /> Contanti
                      </button>
                      <button
                        onClick={() => {
                          setSplitPaymentForm(prev => ({ ...prev, method: 'card' }));
                          setChangeCalculator(prev => ({ ...prev, customerGives: '', showChange: false }));
                        }}
                        className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${
                          splitPaymentForm.method === 'card'
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-700'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" /> Carta
                      </button>
                    </div>

                    {/* Checkbox SMAC per questo pagamento */}
                    {smacEnabled && (
                      <div className="flex items-center gap-3 p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg">
                        <input
                          type="checkbox"
                          id="split_smac"
                          checked={splitPaymentForm.smac}
                          onChange={(e) => setSplitPaymentForm({ ...splitPaymentForm, smac: e.target.checked })}
                          className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                        />
                        <label htmlFor="split_smac" className="text-white cursor-pointer flex-1">
                          <span className="font-medium">SMAC passato</span>
                          <p className="text-xs text-dark-400">Spunta se questo pagamento è già stato dichiarato con tessera SMAC</p>
                        </label>
                      </div>
                    )}

                    {/* Calcolatore Resto - solo per contanti */}
                    {splitPaymentForm.method === 'cash' && splitPaymentForm.amount && parseFloat(splitPaymentForm.amount) > 0 && (
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
                              onChange={(e) => setChangeCalculator({ ...changeCalculator, customerGives: e.target.value })}
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
                              onClick={() => setChangeCalculator({ ...changeCalculator, customerGives: amount.toString() })}
                              className="px-3 py-1 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors"
                            >
                              €{amount}
                            </button>
                          ))}
                        </div>
                        {changeCalculator.customerGives && parseFloat(changeCalculator.customerGives) > 0 && (
                          <div className="p-3 bg-dark-900 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-dark-400">Da incassare:</span>
                              <span className="text-white">€{parseFloat(splitPaymentForm.amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-dark-400">Cliente dà:</span>
                              <span className="text-white">€{parseFloat(changeCalculator.customerGives).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-dark-700 my-2"></div>
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-400 font-semibold">RESTO DA DARE:</span>
                              <span className="text-2xl font-bold text-emerald-400">
                                €{calculateChange().toFixed(2)}
                              </span>
                            </div>
                            {parseFloat(changeCalculator.customerGives) < parseFloat(splitPaymentForm.amount) && (
                              <p className="text-amber-400 text-sm mt-2">
                                ⚠️ Il cliente non ha dato abbastanza! Mancano €{(parseFloat(splitPaymentForm.amount) - parseFloat(changeCalculator.customerGives)).toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={addSplitPayment} className="btn-primary w-full">
                      Aggiungi Pagamento
                    </button>
                  </div>
                )}
              </>
            )}

            {remainingAmount === 0 && (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-emerald-400 mb-2">Conto Saldato!</h4>
                <p className="text-dark-400">Il conto è stato completamente pagato.</p>
              </div>
            )}

            <button onClick={() => setShowSplitModal(false)} className="btn-secondary w-full">
              Chiudi
            </button>
            </div>
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
        {selectedSession && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-900 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-dark-400">Totale</p>
                <p className="text-lg font-bold text-white">€{(selectedSession?.total ?? 0).toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Pagato</p>
                <p className="text-lg font-bold text-emerald-400">
                  €{((selectedSession?.total ?? 0) - remainingAmount).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Rimanente</p>
                <p className="text-lg font-bold text-primary-400">€{remainingAmount.toFixed(2)}</p>
              </div>
            </div>



            {/* Desktop: 2 colonne - Pagamenti a sinistra, Items rimanenti a destra */}
            <div className="md:grid md:grid-cols-2 md:gap-6">
            {/* Payments List */}
            {sessionPayments.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-dark-400 mb-3">Pagamenti effettuati ({sessionPayments.length})</h4>
                <div className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto">
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
                          {smacEnabled && payment.smac_passed && (
                            <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                              SMAC
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Payment details */}
                      <div className="text-sm text-dark-400 space-y-1">
                        <p>Metodo: {payment.payment_method === 'cash' ? 'Contanti' : payment.payment_method === 'card' ? 'Carta' : 'Online'}</p>
                        <p>Data: {new Date(payment.paid_at).toLocaleString('it-IT')}</p>
                        {payment.notes && <p>Note: {payment.notes}</p>}
                      </div>

                      {/* Items paid (if any) */}
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

                      {/* Print receipt button */}
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

            {/* Remaining items to pay - Colonna destra su desktop */}
            <div className="mt-4 md:mt-0">
              {remainingSessionItems.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-3">Prodotti ancora da pagare</h4>
                  {/* Checkbox per includere il coperto quando si paga per consumazione */}
                  {sessionCovers > 0 && sessionCoverUnitPrice > 0 && (
                    <div className={`p-3 rounded-lg border-2 ${coverSelectedCount > 0 ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Coperto</p>
                          <p className="text-xs text-dark-400">{currencyFormat(sessionCoverUnitPrice)} cad.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setCoverSelectedCount(Math.max(0, coverSelectedCount - 1))} className="w-8 h-8 rounded bg-dark-700">-</button>
                          <span className="w-8 text-center font-bold">{coverSelectedCount}</span>
                          <button onClick={() => setCoverSelectedCount(Math.min(sessionCovers, coverSelectedCount + 1))} className="w-8 h-8 rounded bg-dark-700">+</button>
                        </div>
                      </div>
                      {coverSelectedCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-dark-700 flex justify-between">
                          <span className="text-xs text-dark-400">{coverSelectedCount}/{sessionCovers} selezionati</span>
                          <span className="text-sm font-semibold text-blue-400">{currencyFormat(coverSelectedCount * sessionCoverUnitPrice)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 max-h-48 md:max-h-80 overflow-y-auto">
                    {remainingSessionItems.map((item) => (
                      <div key={item.id} className="flex justify-between p-2 bg-dark-900 rounded-lg">
                        <span className="text-white">{item.remainingQty}x {item.menu_item_name}</span>
                        <span className="text-primary-400">€{(item.price * item.remainingQty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
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
                <p className="font-bold text-lg">{selectedReceipt?.shop_info?.name}</p>
                {selectedReceipt?.shop_info?.address && (
                  <p className="text-xs">{selectedReceipt?.shop_info?.address}</p>
                )}
                {selectedReceipt?.shop_info?.phone && (
                  <p className="text-xs">Tel: {selectedReceipt?.shop_info?.phone}</p>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <div className="text-xs mb-3">
                <p>Data: {selectedReceipt?.date} {selectedReceipt?.time}</p>
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <div className="space-y-1">
                {(selectedReceipt?.items || []).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>€{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <div className="flex justify-between font-bold text-lg">
                <span>TOTALE</span>
                <span>€{(selectedReceipt?.total ?? 0).toFixed(2)}</span>
              </div>

              <div className="text-xs mt-3">
                <p>Pagamento: {selectedReceipt?.payment_method === 'cash' ? 'Contanti' : selectedReceipt?.payment_method === 'card' ? 'Carta' : 'Online'}</p>
                {smacEnabled && selectedReceipt?.smac_passed && <p>SMAC: Sì</p>}
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

export default Tables;
