import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  Clock,
  X,
  Calendar,
  Phone,
  Edit2,
  Trash2,
  Receipt,
  ArrowRight,
  CreditCard,
  Banknote,
  Globe,
  Split,
  ShoppingCart,
  Link2,
  CheckSquare,
  Square,
  Eye,
  MessageSquare,
} from 'lucide-react';
import {
  getTables,
  getReservations,
  createTable,
  updateTable,
  deleteTable,
  createReservation,
  updateReservation,
  deleteReservation,
  getActiveSessions,
  createTableSession,
  closeTableSession,
  getSessionOrders,
  transferTableSession,
  getSessionPayments,
  addSessionPayment,
  getSessionRemainingAmount,
  updateSessionTotal,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import type { Table, Reservation, TableSession, Order, SessionPayment } from '../types';

export function Tables() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeSessions, setActiveSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReservationDetailsModal, setShowReservationDetailsModal] = useState(false);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Session state
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [sessionPayments, setSessionPayments] = useState<SessionPayment[]>([]);
  const [remainingAmount, setRemainingAmount] = useState(0);

  // Form states
  const [tableForm, setTableForm] = useState({ name: '', capacity: '4' });
  const [sessionForm, setSessionForm] = useState({
    covers: '2',
    customer_name: '',
    customer_phone: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    method: 'cash' as 'cash' | 'card' | 'online',
    smac: false,
  });
  const [splitPaymentForm, setSplitPaymentForm] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'card' | 'online',
    notes: '',
  });
  const [reservationForm, setReservationForm] = useState({
    table_id: 0,
    table_ids: [] as number[], // Supporto multi-tavoli
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    customer_name: '',
    phone: '',
    guests: '2',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    try {
      const [tablesData, reservationsData, sessionsData] = await Promise.all([
        getTables(),
        getReservations(selectedDate),
        getActiveSessions(),
      ]);
      setTables(tablesData);
      setReservations(reservationsData);
      setActiveSessions(sessionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  function getTableStatus(tableId: number): 'available' | 'occupied' | 'reserved' {
    // Prima controlla se c'è una sessione aperta
    const hasActiveSession = activeSessions.some(s => s.table_id === tableId);
    if (hasActiveSession) return 'occupied';

    // Controlla se il tavolo è in una prenotazione (anche in table_ids per tavoli uniti)
    const hasReservation = reservations.some(r => {
      if (r.status !== 'confirmed') return false;
      const tableIds = r.table_ids || [r.table_id];
      return tableIds.includes(tableId);
    });
    if (hasReservation) return 'reserved';

    return 'available';
  }

  function getTableSession(tableId: number): TableSession | undefined {
    return activeSessions.find(s => s.table_id === tableId);
  }

  function getTableReservation(tableId: number): Reservation | undefined {
    return reservations.find(r => {
      // Controlla se il tavolo è nella lista dei tavoli uniti o è il tavolo principale
      const tableIds = r.table_ids || [r.table_id];
      return tableIds.includes(tableId) && r.status === 'confirmed';
    });
  }

  function openTableModal(table?: Table) {
    if (table) {
      setEditingTable(table);
      setTableForm({ name: table.name, capacity: table.capacity.toString() });
    } else {
      setEditingTable(null);
      setTableForm({ name: '', capacity: '4' });
    }
    setShowTableModal(true);
  }

  function openReservationModal(tableId: number) {
    setReservationForm({
      ...reservationForm,
      table_id: tableId,
      table_ids: [tableId], // Inizia con il tavolo selezionato
      date: selectedDate,
    });
    setShowReservationModal(true);
  }

  // Apri modal prenotazione senza tavolo preselezionato
  function openReservationModalDirect() {
    setReservationForm({
      table_id: 0,
      table_ids: [],
      date: selectedDate,
      time: '19:00',
      customer_name: '',
      phone: '',
      guests: '2',
      notes: '',
    });
    setShowReservationModal(true);
  }

  function toggleTableInReservation(tableId: number) {
    setReservationForm(prev => {
      const currentIds = prev.table_ids || [];
      const isSelected = currentIds.includes(tableId);

      if (isSelected) {
        // Rimuovi il tavolo (ma mantieni almeno uno)
        const newIds = currentIds.filter(id => id !== tableId);
        return {
          ...prev,
          table_ids: newIds.length > 0 ? newIds : [tableId],
          table_id: newIds.length > 0 ? newIds[0] : tableId,
        };
      } else {
        // Aggiungi il tavolo
        return {
          ...prev,
          table_ids: [...currentIds, tableId],
          table_id: prev.table_id || tableId,
        };
      }
    });
  }

  // Calcola capacità totale dei tavoli selezionati
  function getSelectedTablesCapacity(): number {
    const selectedIds = reservationForm.table_ids || [];
    return tables
      .filter(t => selectedIds.includes(t.id))
      .reduce((sum, t) => sum + t.capacity, 0);
  }

  async function handleSaveTable() {
    if (!tableForm.name.trim()) {
      showToast('Inserisci un nome per il tavolo', 'warning');
      return;
    }

    try {
      const data = {
        name: tableForm.name.trim(),
        capacity: parseInt(tableForm.capacity) || 4,
      };

      if (editingTable) {
        await updateTable(editingTable.id, data);
        showToast('Tavolo aggiornato', 'success');
      } else {
        await createTable(data);
        showToast('Tavolo creato', 'success');
      }

      setShowTableModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving table:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function handleDeleteTable(id: number) {
    if (!confirm('Sei sicuro di voler eliminare questo tavolo?')) return;

    try {
      await deleteTable(id);
      showToast('Tavolo eliminato', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting table:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  async function handleSaveReservation() {
    if (!reservationForm.customer_name.trim()) {
      showToast('Inserisci il nome del cliente', 'warning');
      return;
    }

    if (reservationForm.table_ids.length === 0) {
      showToast('Seleziona almeno un tavolo', 'warning');
      return;
    }

    try {
      console.log('Creating reservation with table_ids:', reservationForm.table_ids);
      await createReservation({
        table_id: reservationForm.table_ids[0], // Tavolo principale per retrocompatibilità
        table_ids: reservationForm.table_ids,
        date: reservationForm.date,
        time: reservationForm.time,
        customer_name: reservationForm.customer_name.trim(),
        phone: reservationForm.phone,
        guests: parseInt(reservationForm.guests) || 2,
        notes: reservationForm.notes || undefined,
        status: 'confirmed',
      });

      showToast('Prenotazione creata', 'success');
      setShowReservationModal(false);
      setReservationForm({
        table_id: 0,
        table_ids: [],
        date: selectedDate,
        time: '19:00',
        customer_name: '',
        phone: '',
        guests: '2',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating reservation:', error);
      showToast('Errore nella creazione', 'error');
    }
  }

  async function handleCancelReservation(id: number) {
    if (!confirm('Annullare questa prenotazione?')) return;

    try {
      await deleteReservation(id);
      showToast('Prenotazione annullata', 'success');
      loadData();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      showToast('Errore nell\'annullamento', 'error');
    }
  }

  // Visualizza dettagli prenotazione
  function viewReservationDetails(reservation: Reservation) {
    setSelectedReservation(reservation);
    setShowReservationDetailsModal(true);
  }

  // Apri modal modifica prenotazione
  function openEditReservation(reservation: Reservation) {
    setEditingReservation(reservation);
    setReservationForm({
      table_id: reservation.table_id,
      table_ids: reservation.table_ids || [reservation.table_id],
      date: reservation.date,
      time: reservation.time,
      customer_name: reservation.customer_name,
      phone: reservation.phone || '',
      guests: reservation.guests.toString(),
      notes: reservation.notes || '',
    });
    setShowReservationDetailsModal(false);
    setShowReservationModal(true);
  }

  // Salva modifica prenotazione
  async function handleUpdateReservation() {
    if (!editingReservation) return;

    if (!reservationForm.customer_name.trim()) {
      showToast('Inserisci il nome del cliente', 'warning');
      return;
    }

    if (reservationForm.table_ids.length === 0) {
      showToast('Seleziona almeno un tavolo', 'warning');
      return;
    }

    try {
      await updateReservation(editingReservation.id, {
        table_id: reservationForm.table_ids[0],
        table_ids: reservationForm.table_ids,
        date: reservationForm.date,
        time: reservationForm.time,
        customer_name: reservationForm.customer_name.trim(),
        phone: reservationForm.phone,
        guests: parseInt(reservationForm.guests) || 2,
        notes: reservationForm.notes || undefined,
      });

      showToast('Prenotazione aggiornata', 'success');
      setShowReservationModal(false);
      setEditingReservation(null);
      setReservationForm({
        table_id: 0,
        table_ids: [],
        date: selectedDate,
        time: '19:00',
        customer_name: '',
        phone: '',
        guests: '2',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error updating reservation:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  // ============== GESTIONE SESSIONI (CONTO APERTO) ==============

  function handleTableClick(tableId: number) {
    const status = getTableStatus(tableId);
    const session = getTableSession(tableId);
    const reservation = getTableReservation(tableId);

    if (status === 'occupied' && session) {
      // Tavolo con conto aperto -> mostra dettagli sessione
      openSessionDetails(session);
    } else if (status === 'available' || status === 'reserved') {
      // Tavolo libero o prenotato -> apri modal per aprire conto
      // Se prenotato, pre-compila con i dati della prenotazione
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
  }

  async function openSessionDetails(session: TableSession) {
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
      setShowSessionModal(true);
    } catch (error) {
      console.error('Error loading session details:', error);
      showToast('Errore nel caricamento dettagli', 'error');
    }
  }

  async function handleOpenSession() {
    if (!selectedTableId) return;

    try {
      await createTableSession(
        selectedTableId,
        parseInt(sessionForm.covers) || 1,
        sessionForm.customer_name || undefined,
        sessionForm.customer_phone || undefined
      );
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
    if (!selectedSession) return;
    setPaymentForm({ method: 'cash', smac: false });
    setShowPaymentModal(true);
  }

  async function confirmCloseSession() {
    if (!selectedSession) return;

    try {
      await closeTableSession(selectedSession.id, paymentForm.method, paymentForm.smac);
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

  function handleSplitBill() {
    if (!selectedSession) return;
    setSplitPaymentForm({ amount: '', method: 'cash', notes: '' });
    setShowSplitModal(true);
  }

  async function addSplitPayment() {
    if (!selectedSession) return;
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
        selectedSession.id,
        amount,
        splitPaymentForm.method,
        splitPaymentForm.notes || undefined
      );

      // Ricarica i pagamenti
      const [payments, remaining] = await Promise.all([
        getSessionPayments(selectedSession.id),
        getSessionRemainingAmount(selectedSession.id),
      ]);
      setSessionPayments(payments);
      setRemainingAmount(remaining);
      setSplitPaymentForm({ amount: '', method: 'cash', notes: '' });

      showToast('Pagamento aggiunto', 'success');

      // Se il rimanente è 0, chiudi automaticamente
      if (remaining <= 0) {
        await closeTableSession(selectedSession.id, 'split', false);
        showToast('Conto saldato e chiuso', 'success');
        setShowSplitModal(false);
        setShowSessionModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      showToast('Errore nell\'aggiunta pagamento', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tavoli</h1>
          <p className="text-dark-400 mt-1">Gestisci tavoli e prenotazioni</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openReservationModalDirect()} className="btn-secondary">
            <Calendar className="w-5 h-5" />
            Nuova Prenotazione
          </button>
          <button onClick={() => openTableModal()} className="btn-primary">
            <Plus className="w-5 h-5" />
            Nuovo Tavolo
          </button>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-4">
        <Calendar className="w-5 h-5 text-dark-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-sm text-dark-300">Disponibile</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-sm text-dark-300">Occupato</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span className="text-sm text-dark-300">Prenotato</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {tables.map((table) => {
          const status = getTableStatus(table.id);
          const session = getTableSession(table.id);
          const reservation = getTableReservation(table.id);

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table.id)}
              className={`
                group relative
                ${status === 'available' ? 'table-available cursor-pointer hover:scale-105' : ''}
                ${status === 'occupied' ? 'table-occupied cursor-pointer hover:scale-105' : ''}
                ${status === 'reserved' ? 'table-reserved cursor-pointer hover:scale-105' : ''}
                p-4 transition-transform
              `}
            >
              <h3 className="text-lg font-bold">{table.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">{table.capacity}</span>
              </div>

              {session && (
                <div className="mt-2 text-xs space-y-1">
                  <p className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {session.covers} coperti
                  </p>
                  <p className="font-semibold text-lg">€{session.total.toFixed(2)}</p>
                  {session.customer_name && (
                    <p className="truncate">{session.customer_name}</p>
                  )}
                </div>
              )}

              {reservation && !session && (
                <div className="mt-2 text-xs">
                  <p className="truncate">{reservation.customer_name}</p>
                  <p>{reservation.time}</p>
                  {/* Mostra icona se tavoli uniti */}
                  {reservation.table_ids && reservation.table_ids.length > 1 && (
                    <div className="flex items-center gap-1 mt-1 text-amber-400">
                      <Link2 className="w-3 h-3" />
                      <span>{reservation.table_ids.length} tavoli</span>
                    </div>
                  )}
                </div>
              )}

              {status === 'available' && (
                <div className="mt-3 space-y-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableClick(table.id);
                    }}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Apri Conto
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openReservationModal(table.id);
                    }}
                    className="block text-xs underline hover:no-underline"
                  >
                    Prenota
                  </button>
                </div>
              )}

              {/* Edit/Delete on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTableModal(table);
                  }}
                  className="p-1 bg-dark-800 rounded hover:bg-dark-700"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table.id);
                  }}
                  className="p-1 bg-dark-800 rounded hover:bg-red-500/20"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Reservations */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white">
            Prenotazioni per {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>
        <div className="card-body">
          {reservations.length === 0 ? (
            <p className="text-dark-400 text-center py-4">
              Nessuna prenotazione per questa data
            </p>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between p-4 bg-dark-900 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {res.customer_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-dark-400">
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
                        <div className="flex items-center gap-1 text-sm text-dark-400">
                          <Phone className="w-3 h-3" />
                          {res.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${res.status === 'confirmed' ? 'badge-success' : 'badge-danger'}`}>
                      {res.status === 'confirmed' ? 'Confermata' : 'Annullata'}
                    </span>
                    <button
                      onClick={() => viewReservationDetails(res)}
                      className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Visualizza dettagli"
                    >
                      <Eye className="w-5 h-5 text-dark-400" />
                    </button>
                    <button
                      onClick={() => openEditReservation(res)}
                      className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Edit2 className="w-5 h-5 text-dark-400" />
                    </button>
                    {res.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelReservation(res.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Annulla"
                      >
                        <X className="w-5 h-5 text-red-400" />
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
        onClose={() => setShowTableModal(false)}
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
              onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
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
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
                onChange={(e) => setReservationForm({ ...reservationForm, guests: e.target.value })}
                className="input"
              />
            </div>
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
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-dark-900 rounded-xl">
              {tables.map((table) => {
                const isSelected = reservationForm.table_ids.includes(table.id);
                const tableStatus = getTableStatus(table.id);
                const isAvailable = tableStatus === 'available';

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => isAvailable && toggleTableInReservation(table.id)}
                    disabled={!isAvailable}
                    className={`p-2 rounded-lg border-2 text-sm flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/10 text-white'
                        : isAvailable
                        ? 'border-dark-600 text-dark-300 hover:border-dark-500'
                        : 'border-dark-700 text-dark-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span className="flex-1 text-left truncate">{table.name}</span>
                    <span className="text-xs text-dark-400">{table.capacity}p</span>
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
              className="input resize-none h-20"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
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
                selectedReservation.status === 'confirmed' ? 'badge-success' :
                selectedReservation.status === 'cancelled' ? 'badge-danger' :
                'badge-secondary'
              }`}>
                {selectedReservation.status === 'confirmed' ? 'Confermata' :
                 selectedReservation.status === 'cancelled' ? 'Annullata' : 'Completata'}
              </span>
            </div>

            {/* Customer Info */}
            <div className="p-4 bg-dark-900 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">{selectedReservation.customer_name}</p>
                  {selectedReservation.phone && (
                    <div className="flex items-center gap-1 text-dark-400">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${selectedReservation.phone}`} className="hover:text-primary-400">
                        {selectedReservation.phone}
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
                  {new Date(selectedReservation.date).toLocaleDateString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Clock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">Ora</p>
                <p className="font-semibold text-white">{selectedReservation.time}</p>
              </div>
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Users className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">Ospiti</p>
                <p className="font-semibold text-white">{selectedReservation.guests} persone</p>
              </div>
              <div className="p-4 bg-dark-900 rounded-xl text-center">
                <Link2 className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">
                  {selectedReservation.table_ids && selectedReservation.table_ids.length > 1
                    ? 'Tavoli Uniti'
                    : 'Tavolo'}
                </p>
                <p className="font-semibold text-white">{selectedReservation.table_name}</p>
                {selectedReservation.table_ids && selectedReservation.table_ids.length > 1 && (
                  <p className="text-xs text-primary-400 mt-1">
                    {selectedReservation.table_ids.length} tavoli
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedReservation.notes && (
              <div className="p-4 bg-dark-900 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-dark-400" />
                  <p className="text-sm text-dark-400">Note</p>
                </div>
                <p className="text-white">{selectedReservation.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => openEditReservation(selectedReservation)}
                className="btn-secondary flex-1"
              >
                <Edit2 className="w-5 h-5" />
                Modifica
              </button>
              {selectedReservation.status === 'confirmed' && (
                <button
                  onClick={() => {
                    handleCancelReservation(selectedReservation.id);
                    setShowReservationDetailsModal(false);
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

      {/* Session Details Modal (Dettagli Conto) */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title={`Conto ${selectedSession?.table_name || ''}`}
        size="lg"
      >
        {selectedSession && (
          <div className="space-y-6">
            {/* Session Info */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-900 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-dark-400">Coperti</p>
                <p className="text-xl font-bold text-white">{selectedSession.covers}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Comande</p>
                <p className="text-xl font-bold text-white">{sessionOrders.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Totale</p>
                <p className="text-xl font-bold text-primary-400">€{selectedSession.total.toFixed(2)}</p>
              </div>
            </div>

            {selectedSession.customer_name && (
              <p className="text-dark-400">
                Cliente: <span className="text-white">{selectedSession.customer_name}</span>
              </p>
            )}

            {/* Orders List */}
            <div>
              <h3 className="font-semibold text-white mb-3">Comande</h3>
              {sessionOrders.length === 0 ? (
                <p className="text-dark-400 text-center py-4">Nessuna comanda ancora</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sessionOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                      <div>
                        <span className="font-medium text-white">Comanda #{order.order_number || 1}</span>
                        <span className={`ml-2 badge ${
                          order.status === 'pending' ? 'badge-warning' :
                          order.status === 'preparing' ? 'badge-info' :
                          order.status === 'ready' ? 'badge-success' :
                          'badge-secondary'
                        }`}>
                          {order.status === 'pending' ? 'In attesa' :
                           order.status === 'preparing' ? 'In preparazione' :
                           order.status === 'ready' ? 'Pronto' :
                           order.status === 'delivered' ? 'Consegnato' : order.status}
                        </span>
                      </div>
                      <span className="font-semibold text-white">€{order.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleAddOrder} className="btn-primary flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Aggiungi Comanda
              </button>
              <button onClick={handleTransfer} className="btn-secondary flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Trasferisci
              </button>
              <button onClick={handleSplitBill} className="btn-secondary flex items-center justify-center gap-2">
                <Split className="w-4 h-4" />
                Dividi Conto
              </button>
              <button
                onClick={handleCloseSession}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Chiudi Conto
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal (Chiudi Conto) */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Chiudi Conto"
        size="sm"
      >
        {selectedSession && (
          <div className="space-y-6">
            <div className="text-center p-4 bg-dark-900 rounded-xl">
              <p className="text-sm text-dark-400">Totale da pagare</p>
              <p className="text-3xl font-bold text-primary-400">€{selectedSession.total.toFixed(2)}</p>
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
                id="smac"
                checked={paymentForm.smac}
                onChange={(e) => setPaymentForm({ ...paymentForm, smac: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="smac" className="text-white">SMAC passato</label>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button onClick={confirmCloseSession} className="btn-primary flex-1">
                Conferma Pagamento
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                Annulla
              </button>
            </div>
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
        size="md"
      >
        {selectedSession && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-900 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-dark-400">Totale</p>
                <p className="text-lg font-bold text-white">€{selectedSession.total.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Pagato</p>
                <p className="text-lg font-bold text-emerald-400">
                  €{(selectedSession.total - remainingAmount).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-dark-400">Rimanente</p>
                <p className="text-lg font-bold text-primary-400">€{remainingAmount.toFixed(2)}</p>
              </div>
            </div>

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
                        {payment.notes && <span className="text-dark-400">- {payment.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Payment Form */}
            {remainingAmount > 0 && (
              <div className="space-y-4 p-4 border border-dark-700 rounded-xl">
                <h4 className="font-medium text-white">Nuovo pagamento</h4>
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitPaymentForm({ ...splitPaymentForm, method: 'cash' })}
                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${
                      splitPaymentForm.method === 'cash'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> Contanti
                  </button>
                  <button
                    onClick={() => setSplitPaymentForm({ ...splitPaymentForm, method: 'card' })}
                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${
                      splitPaymentForm.method === 'card'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Carta
                  </button>
                </div>
                <button onClick={addSplitPayment} className="btn-primary w-full">
                  Aggiungi Pagamento
                </button>
              </div>
            )}

            <button onClick={() => setShowSplitModal(false)} className="btn-secondary w-full">
              Chiudi
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
