import { useEffect, useState } from 'react';
import {
  FileCheck,
  FileX,
  Calendar,
  CheckCircle,
  AlertCircle,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getOrders, getSessionPayments } from '../lib/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { Order, SessionPayment } from '../types';

// Interfaccia per le voci raggruppate
interface GroupedSmacEntry {
  type: 'session' | 'single';
  sessionId?: number;
  orders: Order[];
  payments: SessionPayment[]; // Pagamenti per le sessioni split
  total: number;
  tableName?: string;
  customerName?: string;
  smacPassed: boolean | 'partial'; // true = tutto passato, false = niente passato, 'partial' = parziale
  smacAmount: number; // Importo SMAC passata
}

// Extend the database to support SMAC update
async function updateOrderSmac(orderId: number, smacPassed: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Aggiorna su Supabase
    const { error } = await supabase
      .from('orders')
      .update({ smac_passed: smacPassed })
      .eq('id', orderId);
    if (error) throw error;
  } else {
    // For local storage mode
    const STORAGE_PREFIX = 'kebab_';
    const orders = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'orders') || '[]');
    const index = orders.findIndex((o: Order) => o.id === orderId);
    if (index !== -1) {
      orders[index].smac_passed = smacPassed;
      localStorage.setItem(STORAGE_PREFIX + 'orders', JSON.stringify(orders));
    }
  }
}

export function Smac() {
  useLanguage(); // Ready for translations
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessionPaymentsMap, setSessionPaymentsMap] = useState<Record<number, SessionPayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState<'all' | 'passed' | 'not_passed'>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getOrders(selectedDate);
      // Filter out cancelled orders
      const filteredOrders = data.filter(o => o.status !== 'cancelled');
      setOrders(filteredOrders);

      // Carica i pagamenti per tutte le sessioni
      const sessionIds = [...new Set(filteredOrders.filter(o => o.session_id).map(o => o.session_id!))];
      const paymentsMap: Record<number, SessionPayment[]> = {};
      await Promise.all(
        sessionIds.map(async (sessionId) => {
          const payments = await getSessionPayments(sessionId);
          paymentsMap[sessionId] = payments;
        })
      );
      setSessionPaymentsMap(paymentsMap);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast('Errore nel caricamento ordini', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Raggruppa gli ordini per session_id
  const groupedEntries: GroupedSmacEntry[] = (() => {
    const sessionMap: Record<number, Order[]> = {};
    const singleOrders: Order[] = [];

    orders.forEach(order => {
      if (order.session_id) {
        if (!sessionMap[order.session_id]) {
          sessionMap[order.session_id] = [];
        }
        sessionMap[order.session_id].push(order);
      } else {
        singleOrders.push(order);
      }
    });

    const result: GroupedSmacEntry[] = [];

    // Aggiungi le sessioni raggruppate
    Object.entries(sessionMap).forEach(([sessionId, sessionOrders]) => {
      const firstOrder = sessionOrders[0];
      const total = sessionOrders.reduce((sum, o) => sum + o.total, 0);
      const payments = sessionPaymentsMap[Number(sessionId)] || [];

      // Determina lo stato SMAC basato sui pagamenti (se ci sono) o sull'ordine
      let smacPassed: boolean | 'partial' = firstOrder.smac_passed;
      let smacAmount = 0;

      if (payments.length > 0) {
        // Se ci sono pagamenti, usa quelli per determinare SMAC
        const smacPayments = payments.filter(p => p.smac_passed);
        smacAmount = smacPayments.reduce((sum, p) => sum + p.amount, 0);

        if (smacPayments.length === 0) {
          smacPassed = false;
        } else if (smacPayments.length === payments.length) {
          smacPassed = true;
        } else {
          smacPassed = 'partial';
        }
      } else {
        // Nessun pagamento split, usa lo stato dell'ordine
        smacAmount = firstOrder.smac_passed ? total : 0;
      }

      result.push({
        type: 'session',
        sessionId: Number(sessionId),
        orders: sessionOrders.sort((a, b) => (a.order_number || 0) - (b.order_number || 0)),
        payments,
        total,
        tableName: firstOrder.table_name,
        customerName: firstOrder.customer_name,
        smacPassed,
        smacAmount,
      });
    });

    // Aggiungi gli ordini singoli
    singleOrders.forEach(order => {
      result.push({
        type: 'single',
        orders: [order],
        payments: [],
        total: order.total,
        tableName: order.table_name,
        customerName: order.customer_name,
        smacPassed: order.smac_passed,
        smacAmount: order.smac_passed ? order.total : 0,
      });
    });

    // Ordina per data creazione (più recenti prima)
    return result.sort((a, b) =>
      new Date(b.orders[0].created_at).getTime() - new Date(a.orders[0].created_at).getTime()
    );
  })();

  const filteredEntries = groupedEntries.filter((entry) => {
    if (filter === 'passed') return entry.smacPassed === true;
    if (filter === 'not_passed') return entry.smacPassed === false || entry.smacPassed === 'partial';
    return true;
  });

  // Stats basati sulle entry raggruppate - usa smacAmount per calcoli corretti
  const passedTotal = groupedEntries.reduce((sum, e) => sum + e.smacAmount, 0);
  const notPassedTotal = groupedEntries.reduce((sum, e) => sum + (e.total - e.smacAmount), 0);

  const passedCount = groupedEntries.filter((e) => e.smacPassed === true).length;
  const notPassedCount = groupedEntries.filter((e) => e.smacPassed === false || e.smacPassed === 'partial').length;

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

  // Toggle SMAC per una entry (aggiorna tutti gli ordini della sessione se è una sessione)
  async function toggleSmac(entry: GroupedSmacEntry) {
    try {
      const newSmacValue = !entry.smacPassed;
      // Aggiorna tutti gli ordini della entry
      for (const order of entry.orders) {
        await updateOrderSmac(order.id, newSmacValue);
      }
      showToast(
        newSmacValue ? 'SMAC registrata' : 'SMAC rimossa',
        'success'
      );
      loadOrders();
    } catch (error) {
      console.error('Error updating SMAC:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  async function markAllAsPassed() {
    if (!confirm(`Segnare tutti i ${notPassedCount} ordini/conti come SMAC passata?`)) return;

    try {
      // Aggiorna tutti gli ordini che non hanno SMAC passata
      for (const order of orders.filter((o) => !o.smac_passed)) {
        await updateOrderSmac(order.id, true);
      }
      showToast(`${notPassedCount} ordini/conti segnati come SMAC passata`, 'success');
      loadOrders();
    } catch (error) {
      console.error('Error updating SMAC:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dichiarazioni SMAC</h1>
          <p className="text-dark-400 mt-1 text-xs sm:text-sm">
            Gestione SMAC per la dichiarazione fiscale
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={loadOrders} className="btn-secondary p-2 sm:px-4 sm:py-2">
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {notPassedCount > 0 && (
            <button onClick={markAllAsPassed} className="btn-primary text-xs sm:text-sm flex-1 sm:flex-none justify-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Segna Tutti come</span> Passati
            </button>
          )}
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Calendar className="w-5 h-5 text-dark-400 hidden sm:block" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto text-sm sm:text-base"
        />
        <span className="text-dark-400 text-sm sm:text-base hidden sm:inline">{formatDate(selectedDate)}</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Totali</p>
              <p className="stat-value text-lg sm:text-2xl">{groupedEntries.length}</p>
              <p className="text-xs text-dark-500">{orders.length} comande</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card glow-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">SMAC Passata</p>
              <p className="stat-value text-emerald-400 text-lg sm:text-2xl">€{passedTotal.toFixed(0)}</p>
              <p className="text-xs text-dark-500">{passedCount} conti</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Non Passata</p>
              <p className="stat-value text-amber-400 text-lg sm:text-2xl">€{notPassedTotal.toFixed(0)}</p>
              <p className="text-xs text-dark-500">{notPassedCount} conti</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Incasso</p>
              <p className="stat-value text-lg sm:text-2xl">€{(passedTotal + notPassedTotal).toFixed(0)}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-4 h-4 sm:w-6 sm:h-6 text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
            filter === 'all'
              ? 'bg-primary-500 text-dark-900'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          Tutti ({groupedEntries.length})
        </button>
        <button
          onClick={() => setFilter('passed')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
            filter === 'passed'
              ? 'bg-emerald-500 text-white'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          <span className="flex items-center gap-1 sm:gap-2">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Passata ({passedCount})
          </span>
        </button>
        <button
          onClick={() => setFilter('not_passed')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
            filter === 'not_passed'
              ? 'bg-amber-500 text-dark-900'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          <span className="flex items-center gap-1 sm:gap-2">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Non Passata ({notPassedCount})
          </span>
        </button>
      </div>

      {/* Orders List */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white text-sm sm:text-base">
            Ordini del Giorno
          </h2>
        </div>
        <div className="divide-y divide-dark-700">
          {filteredEntries.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-dark-400">
              <FileX className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Nessun ordine trovato per questa data</p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSession = entry.type === 'session' && entry.orders.length > 1;
              const isExpanded = isSession && expandedSessions.has(entry.sessionId!);
              const firstOrder = entry.orders[0];

              return (
                <div key={entry.type === 'session' ? `session-${entry.sessionId}` : `order-${firstOrder.id}`}>
                  {/* Riga principale */}
                  <div
                    className={`flex items-center justify-between p-3 sm:p-4 hover:bg-dark-900/50 transition-colors gap-2 ${isSession ? 'cursor-pointer' : ''}`}
                    onClick={isSession ? () => toggleSessionExpand(entry.sessionId!) : undefined}
                  >
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      {/* Icona SMAC + Expand */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {isSession && (
                          <div className="w-5 sm:w-6">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
                            )}
                          </div>
                        )}
                        <div
                          className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                            entry.smacPassed === true
                              ? 'bg-emerald-500/20'
                              : entry.smacPassed === 'partial'
                              ? 'bg-blue-500/20'
                              : 'bg-amber-500/20'
                          }`}
                        >
                          {entry.smacPassed === true ? (
                            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
                          ) : entry.smacPassed === 'partial' ? (
                            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white text-sm sm:text-base truncate">
                          {isSession ? (
                            <>
                              Conto - {entry.tableName}
                              <span className="text-xs text-dark-400 ml-1 sm:ml-2">({entry.orders.length}c)</span>
                            </>
                          ) : (
                            `#${firstOrder.id}`
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-3 text-xs sm:text-sm text-dark-400">
                          <span>
                            {firstOrder.order_type === 'dine_in'
                              ? `T.${entry.tableName || firstOrder.table_id}`
                              : firstOrder.order_type === 'takeaway'
                              ? 'Asporto'
                              : 'Domicilio'}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">
                            {firstOrder.payment_method === 'cash'
                              ? 'Contanti'
                              : firstOrder.payment_method === 'card'
                              ? 'Carta'
                              : 'Online'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-base sm:text-xl font-bold text-primary-400">
                          €{entry.total.toFixed(2)}
                        </p>
                        <p
                          className={`text-xs sm:text-sm ${
                            entry.smacPassed === true
                              ? 'text-emerald-400'
                              : entry.smacPassed === 'partial'
                              ? 'text-blue-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {entry.smacPassed === true
                            ? 'Passata'
                            : entry.smacPassed === 'partial'
                            ? `Parziale (€${entry.smacAmount.toFixed(2)})`
                            : 'Non Passata'}
                        </p>
                      </div>

                      {/* Nascondi bottone toggle per pagamenti split (non si può cambiare da qui) */}
                      {entry.payments.length === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSmac(entry);
                        }}
                        className={`p-2 sm:p-3 rounded-xl transition-all ${
                          entry.smacPassed === true
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-dark-700 text-dark-300 hover:bg-amber-500 hover:text-dark-900'
                        }`}
                        title={entry.smacPassed === true ? 'Rimuovi SMAC' : 'Segna come SMAC passata'}
                      >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      )}
                    </div>
                  </div>

                  {/* Pagamenti espansi per le sessioni (se ci sono pagamenti split) */}
                  {isSession && isExpanded && (
                    <div className="bg-dark-900/30 border-t border-dark-700">
                      {entry.payments.length > 0 ? (
                        // Mostra i pagamenti se ci sono (pagamento diviso)
                        entry.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-20 border-b border-dark-800 last:border-b-0"
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-dark-500">└</span>
                              <div>
                                <p className="text-xs sm:text-sm text-white font-medium">
                                  €{payment.amount.toFixed(2)}
                                  {payment.notes && (
                                    <span className="text-dark-400 ml-2 font-normal">({payment.notes})</span>
                                  )}
                                </p>
                                <p className="text-xs text-dark-500">
                                  {payment.payment_method === 'cash' ? 'Contanti' : payment.payment_method === 'card' ? 'Carta' : 'Online'}
                                  {' • '}
                                  {new Date(payment.paid_at).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              payment.smac_passed
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              SMAC {payment.smac_passed ? '✓' : '✗'}
                            </span>
                          </div>
                        ))
                      ) : (
                        // Se non ci sono pagamenti, mostra le comande (pagamento singolo)
                        entry.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-20 border-b border-dark-800 last:border-b-0"
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-dark-500">└</span>
                              <div>
                                <p className="text-xs sm:text-sm text-dark-300">
                                  Comanda {order.order_number || 1}
                                </p>
                                <p className="text-xs text-dark-500">
                                  {new Date(order.created_at).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-dark-300">
                              €{order.total.toFixed(2)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 sm:p-4">
        <h3 className="font-semibold text-blue-400 mb-2 text-sm sm:text-base">Cos'è la SMAC?</h3>
        <p className="text-xs sm:text-sm text-dark-300">
          La <strong>SMAC</strong> (Carta Servizi) è il sistema di San Marino per la
          tracciabilità delle transazioni commerciali. Quando un cliente presenta
          la sua carta SMAC al momento del pagamento, l'importo viene registrato
          per beneficiare di detrazioni fiscali.
        </p>
      </div>
    </div>
  );
}
