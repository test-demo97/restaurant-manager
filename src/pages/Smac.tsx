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
import { getOrders } from '../lib/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import type { Order } from '../types';

// Interfaccia per le voci raggruppate
interface GroupedSmacEntry {
  type: 'session' | 'single';
  sessionId?: number;
  orders: Order[];
  total: number;
  tableName?: string;
  customerName?: string;
  smacPassed: boolean; // Tutti gli ordini della sessione hanno lo stesso stato SMAC
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState<'all' | 'passed' | 'not_passed'>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadOrders();
  }, [selectedDate]);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getOrders(selectedDate);
      // Filter out cancelled orders
      setOrders(data.filter(o => o.status !== 'cancelled'));
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
      // Per le sessioni, lo stato SMAC è basato sul primo ordine (dovrebbero essere tutti uguali)
      const smacPassed = firstOrder.smac_passed;
      result.push({
        type: 'session',
        sessionId: Number(sessionId),
        orders: sessionOrders.sort((a, b) => (a.order_number || 0) - (b.order_number || 0)),
        total,
        tableName: firstOrder.table_name,
        customerName: firstOrder.customer_name,
        smacPassed,
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
        smacPassed: order.smac_passed,
      });
    });

    // Ordina per data creazione (più recenti prima)
    return result.sort((a, b) =>
      new Date(b.orders[0].created_at).getTime() - new Date(a.orders[0].created_at).getTime()
    );
  })();

  const filteredEntries = groupedEntries.filter((entry) => {
    if (filter === 'passed') return entry.smacPassed;
    if (filter === 'not_passed') return !entry.smacPassed;
    return true;
  });

  // Stats basati sulle entry raggruppate
  const passedTotal = groupedEntries
    .filter((e) => e.smacPassed)
    .reduce((sum, e) => sum + e.total, 0);

  const notPassedTotal = groupedEntries
    .filter((e) => !e.smacPassed)
    .reduce((sum, e) => sum + e.total, 0);

  const passedCount = groupedEntries.filter((e) => e.smacPassed).length;
  const notPassedCount = groupedEntries.filter((e) => !e.smacPassed).length;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dichiarazioni SMAC</h1>
          <p className="text-dark-400 mt-1">
            Gestione SMAC per la dichiarazione fiscale di San Marino
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadOrders} className="btn-secondary">
            <RefreshCw className="w-5 h-5" />
          </button>
          {notPassedCount > 0 && (
            <button onClick={markAllAsPassed} className="btn-primary">
              <CheckCircle className="w-5 h-5" />
              Segna Tutti come Passati
            </button>
          )}
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <Calendar className="w-5 h-5 text-dark-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-auto"
        />
        <span className="text-dark-400">{formatDate(selectedDate)}</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Ordini/Conti Totali</p>
              <p className="stat-value">{groupedEntries.length}</p>
              <p className="text-xs text-dark-500 mt-1">{orders.length} comande</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card glow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">SMAC Passata</p>
              <p className="stat-value text-emerald-400">€{passedTotal.toFixed(2)}</p>
              <p className="text-xs text-dark-500 mt-1">{passedCount} ordini/conti</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">SMAC Non Passata</p>
              <p className="stat-value text-amber-400">€{notPassedTotal.toFixed(2)}</p>
              <p className="text-xs text-dark-500 mt-1">{notPassedCount} ordini/conti</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Incasso Giornata</p>
              <p className="stat-value">€{(passedTotal + notPassedTotal).toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            filter === 'all'
              ? 'bg-primary-500 text-dark-900'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          Tutti ({groupedEntries.length})
        </button>
        <button
          onClick={() => setFilter('passed')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            filter === 'passed'
              ? 'bg-emerald-500 text-white'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Passata ({passedCount})
          </span>
        </button>
        <button
          onClick={() => setFilter('not_passed')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            filter === 'not_passed'
              ? 'bg-amber-500 text-dark-900'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Non Passata ({notPassedCount})
          </span>
        </button>
      </div>

      {/* Orders List */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white">
            Ordini del {formatDate(selectedDate)}
          </h2>
        </div>
        <div className="divide-y divide-dark-700">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-dark-400">
              <FileX className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun ordine trovato per questa data</p>
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
                    className={`flex items-center justify-between p-4 hover:bg-dark-900/50 transition-colors ${isSession ? 'cursor-pointer' : ''}`}
                    onClick={isSession ? () => toggleSessionExpand(entry.sessionId!) : undefined}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icona SMAC + Expand */}
                      <div className="flex items-center gap-2">
                        {isSession && (
                          <div className="w-6">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-dark-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-dark-400" />
                            )}
                          </div>
                        )}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            entry.smacPassed
                              ? 'bg-emerald-500/20'
                              : 'bg-amber-500/20'
                          }`}
                        >
                          {entry.smacPassed ? (
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-amber-400" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {isSession ? (
                            <>
                              Conto - {entry.tableName}
                              <span className="text-xs text-dark-400 ml-2">({entry.orders.length} comande)</span>
                            </>
                          ) : (
                            `Ordine #${firstOrder.id}`
                          )}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-dark-400">
                          <span>
                            {firstOrder.order_type === 'dine_in'
                              ? `Tavolo ${entry.tableName || firstOrder.table_id}`
                              : firstOrder.order_type === 'takeaway'
                              ? 'Asporto'
                              : 'Domicilio'}
                          </span>
                          <span>•</span>
                          <span>
                            {firstOrder.payment_method === 'cash'
                              ? 'Contanti'
                              : firstOrder.payment_method === 'card'
                              ? 'Carta'
                              : 'Online'}
                          </span>
                          {entry.customerName && (
                            <>
                              <span>•</span>
                              <span>{entry.customerName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary-400">
                          €{entry.total.toFixed(2)}
                        </p>
                        <p
                          className={`text-sm ${
                            entry.smacPassed ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {entry.smacPassed ? 'SMAC Passata' : 'SMAC Non Passata'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSmac(entry);
                        }}
                        className={`p-3 rounded-xl transition-all ${
                          entry.smacPassed
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-dark-700 text-dark-300 hover:bg-amber-500 hover:text-dark-900'
                        }`}
                        title={entry.smacPassed ? 'Rimuovi SMAC' : 'Segna come SMAC passata'}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Comande espanse per le sessioni */}
                  {isSession && isExpanded && (
                    <div className="bg-dark-900/30 border-t border-dark-700">
                      {entry.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between px-4 py-3 pl-20 border-b border-dark-800 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-dark-500">└</span>
                            <div>
                              <p className="text-sm text-dark-300">
                                Comanda #{order.id}
                                {order.order_number && (
                                  <span className="text-dark-500 ml-1">(C{order.order_number})</span>
                                )}
                              </p>
                              <p className="text-xs text-dark-500">
                                {new Date(order.created_at).toLocaleTimeString('it-IT', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-dark-300">
                            €{order.total.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="font-semibold text-blue-400 mb-2">Cos'è la SMAC?</h3>
        <p className="text-sm text-dark-300">
          La <strong>SMAC</strong> (Carta Servizi) è il sistema di San Marino per la
          tracciabilità delle transazioni commerciali. Quando un cliente presenta
          la sua carta SMAC al momento del pagamento, l'importo viene registrato
          per beneficiare di detrazioni fiscali. Questa sezione ti permette di
          tenere traccia di quali ordini hanno avuto la SMAC passata.
        </p>
      </div>
    </div>
  );
}
