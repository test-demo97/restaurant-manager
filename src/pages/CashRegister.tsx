import { useEffect, useState, useRef } from 'react';
import {
  Calculator,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  XCircle,
  Receipt,
  Lock,
  History,
  Printer,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
} from 'lucide-react';
import {
  getDailyCashSummary,
  getCashClosures,
  saveCashClosure,
  getOrders,
  generateReceipt,
  getSessionPayments,
  getSettings,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';
import { useSmac } from '../context/SmacContext';
import type { CashClosure, Order, Receipt as ReceiptType, SessionPayment } from '../types';

export function CashRegister() {
  useLanguage(); // Ready for translations
  const { smacEnabled } = useSmac();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    total_orders: number;
    total_revenue: number;
    cash_revenue: number;
    card_revenue: number;
    online_revenue: number;
    smac_total: number;
    non_smac_total: number;
    orders_by_type: { dine_in: number; takeaway: number; delivery: number };
    orders_by_status: Record<string, number>;
  } | null>(null);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sessionPaymentsMap, setSessionPaymentsMap] = useState<Record<number, SessionPayment[]>>({});
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function loadData() {
    setLoading(true);
    try {
      const [summaryData, closuresData, ordersData] = await Promise.all([
        getDailyCashSummary(selectedDate),
        getCashClosures(),
        getOrders(selectedDate),
      ]);
      setSummary(summaryData);
      setClosures(closuresData);
      const filteredOrders = ordersData.filter(o => o.status !== 'cancelled');
      setOrders(filteredOrders);

      // Carica i pagamenti per tutte le sessioni chiuse
      const sessionIds = [...new Set(filteredOrders
        .filter(o => o.session_id && o.session_status === 'paid')
        .map(o => o.session_id!)
      )];

      const paymentsMap: Record<number, SessionPayment[]> = {};
      await Promise.all(
        sessionIds.map(async (sessionId) => {
          const payments = await getSessionPayments(sessionId);
          if (payments.length > 0) {
            paymentsMap[sessionId] = payments;
          }
        })
      );
      setSessionPaymentsMap(paymentsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  const isClosedToday = closures.some(c => c.date === selectedDate);

  async function handleCloseCash() {
    if (!openingCash || !closingCash) {
      showToast('Inserisci fondo cassa iniziale e finale', 'error');
      return;
    }

    const opening = parseFloat(openingCash);
    const closing = parseFloat(closingCash);

    if (isNaN(opening) || isNaN(closing) || opening < 0 || closing < 0) {
      showToast('Inserisci valori numerici validi', 'error');
      return;
    }
    const expectedCash = opening + (summary?.cash_revenue || 0);
    const difference = closing - expectedCash;

    try {
      await saveCashClosure({
        date: selectedDate,
        opening_cash: opening,
        closing_cash: closing,
        expected_cash: expectedCash,
        difference,
        total_orders: summary?.total_orders || 0,
        total_revenue: summary?.total_revenue || 0,
        cash_revenue: summary?.cash_revenue || 0,
        card_revenue: summary?.card_revenue || 0,
        online_revenue: summary?.online_revenue || 0,
        smac_total: summary?.smac_total || 0,
        non_smac_total: summary?.non_smac_total || 0,
        notes: closureNotes,
        closed_by: 'Admin',
      });

      showToast('Chiusura cassa salvata con successo', 'success');
      setShowClosureModal(false);
      setOpeningCash('');
      setClosingCash('');
      setClosureNotes('');
      loadData();
    } catch (error) {
      console.error('Error saving closure:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function handleViewReceipt(orderId: number) {
    try {
      const receipt = await generateReceipt(orderId);
      if (receipt) {
        setSelectedReceipt(receipt);
        setShowReceiptModal(true);
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      showToast('Errore nella generazione scontrino', 'error');
    }
  }

  async function handleViewPaymentReceipt(payment: SessionPayment, order: Order) {
    try {
      const settings = await getSettings();
      const now = new Date(payment.paid_at);

      // Crea uno scontrino per il singolo pagamento
      const paymentReceipt: ReceiptType = {
        id: payment.id,
        order_id: order.id,
        receipt_number: `PAG-${payment.id}`,
        date: now.toLocaleDateString('it-IT'),
        time: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        items: payment.paid_items?.map(item => ({
          name: item.menu_item_name,
          quantity: item.quantity,
          unit_price: item.price,
          total: item.quantity * item.price,
        })) || [{
          name: payment.notes || 'Pagamento parziale',
          quantity: 1,
          unit_price: payment.amount,
          total: payment.amount,
        }],
        subtotal: payment.amount / (1 + settings.iva_rate / 100),
        iva_rate: settings.iva_rate,
        iva_amount: payment.amount - (payment.amount / (1 + settings.iva_rate / 100)),
        total: payment.amount,
        payment_method: payment.payment_method,
        smac_passed: payment.smac_passed || false,
        shop_info: {
          name: settings.shop_name,
          address: settings.address,
          phone: settings.phone,
        },
      };

      setSelectedReceipt(paymentReceipt);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Error generating payment receipt:', error);
      showToast('Errore nella generazione scontrino', 'error');
    }
  }

  function handlePrintReceipt() {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
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
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Chiusura Cassa</h1>
          <p className="text-dark-400 mt-1 text-sm sm:text-base">Riepilogo giornaliero e scontrini</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="btn-secondary text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-2.5"
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            Storico
          </button>
          {!isClosedToday && summary && summary.total_orders > 0 && (
            <button
              onClick={() => setShowClosureModal(true)}
              className="btn-primary text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-2.5"
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              Chiudi Cassa
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
        {isClosedToday && (
          <span className="px-2 py-1 sm:px-3 bg-emerald-500/20 text-emerald-400 rounded-full text-xs sm:text-sm flex items-center gap-1">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Cassa Chiusa
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card glow-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Incasso Totale</p>
              <p className="stat-value text-primary-400 text-lg sm:text-2xl">
                €{summary?.total_revenue.toFixed(2)}
              </p>
              <p className="text-xs text-dark-500 mt-1">
                {summary?.total_orders} ordini
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Contanti</p>
              <p className="stat-value text-emerald-400 text-lg sm:text-2xl">
                €{summary?.cash_revenue.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Carta</p>
              <p className="stat-value text-blue-400 text-lg sm:text-2xl">
                €{summary?.card_revenue.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">Online</p>
              <p className="stat-value text-purple-400 text-lg sm:text-2xl">
                €{summary?.online_revenue.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* SMAC Summary */}
      {smacEnabled && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <h3 className="font-semibold text-white text-sm sm:text-base">SMAC Passata</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">
              €{summary?.smac_total.toFixed(2)}
            </p>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <h3 className="font-semibold text-white text-sm sm:text-base">SMAC Non Passata</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-400">
              €{summary?.non_smac_total.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Orders by Type */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white text-sm sm:text-base">Ordini per Tipologia</h2>
        </div>
        <div className="p-3 sm:p-4 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-4 bg-dark-800 rounded-xl">
            <p className="text-xl sm:text-3xl font-bold text-white">{summary?.orders_by_type.dine_in || 0}</p>
            <p className="text-dark-400 text-xs sm:text-sm">In Sala</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-dark-800 rounded-xl">
            <p className="text-xl sm:text-3xl font-bold text-white">{summary?.orders_by_type.takeaway || 0}</p>
            <p className="text-dark-400 text-xs sm:text-sm">Asporto</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-dark-800 rounded-xl">
            <p className="text-xl sm:text-3xl font-bold text-white">{summary?.orders_by_type.delivery || 0}</p>
            <p className="text-dark-400 text-xs sm:text-sm">Domicilio</p>
          </div>
        </div>
      </div>

      {/* Orders List with Receipt - Raggruppa ordini per session_id */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            Ordini del Giorno ({orders.length} {orders.length === 1 ? 'comanda' : 'comande'})
          </h2>
        </div>
        <div className="divide-y divide-dark-700 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
          {orders.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-dark-400">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Nessun ordine per questa data</p>
            </div>
          ) : (
            (() => {
              // Raggruppa ordini per session_id (null = ordine singolo)
              const grouped: { [key: string]: Order[] } = {};
              orders.forEach(order => {
                const key = order.session_id ? `session_${order.session_id}` : `order_${order.id}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(order);
              });

              return Object.entries(grouped).map(([key, groupOrders]) => {
                const isSession = key.startsWith('session_');
                const firstOrder = groupOrders[0];
                const totalAmount = groupOrders.reduce((sum, o) => sum + o.total, 0);
                const comandeCount = groupOrders.length;
                const sessionId = firstOrder.session_id;
                const payments = sessionId ? sessionPaymentsMap[sessionId] || [] : [];
                const hasSplitPayment = payments.length > 1;
                const isExpanded = sessionId ? expandedSessions.has(sessionId) : false;

                return (
                  <div key={key}>
                    {/* Riga principale */}
                    <div
                      className={`flex items-center justify-between p-3 sm:p-4 hover:bg-dark-900/50 transition-colors gap-2 ${
                        isExpanded ? 'bg-dark-900/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        {/* Icona espansione per sessioni con pagamenti */}
                        {isSession && payments.length > 0 ? (
                          <button
                            onClick={() => {
                              if (!sessionId) return;
                              setExpandedSessions(prev => {
                                const next = new Set(prev);
                                if (next.has(sessionId)) {
                                  next.delete(sessionId);
                                } else {
                                  next.add(sessionId);
                                }
                                return next;
                              });
                            }}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 hover:bg-dark-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                            )}
                          </button>
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                            {isSession ? (
                              <span className="text-xs font-bold text-primary-400">
                                {comandeCount > 1 ? `${comandeCount}C` : `#${firstOrder.id}`}
                              </span>
                            ) : (
                              <span className="text-xs sm:text-sm font-bold text-primary-400">#{firstOrder.id}</span>
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white text-sm sm:text-base truncate">
                            {firstOrder.order_type === 'dine_in' ? 'Tavolo' : firstOrder.order_type === 'takeaway' ? 'Asporto' : 'Domicilio'}
                            {firstOrder.table_name && ` - ${firstOrder.table_name}`}
                            {firstOrder.customer_name && (
                              <span className="ml-2 text-dark-300">({firstOrder.customer_name})</span>
                            )}
                            {hasSplitPayment && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full inline-flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Diviso
                              </span>
                            )}
                          </p>
                          <p className="text-xs sm:text-sm text-dark-400 truncate">
                            {hasSplitPayment ? (
                              <span>{payments.length} pagamenti</span>
                            ) : (
                              <>
                                {firstOrder.payment_method === 'cash' ? 'Contanti' : firstOrder.payment_method === 'card' ? 'Carta' : 'Online'}
                                {smacEnabled && firstOrder.smac_passed && ' • SMAC'}
                              </>
                            )}
                            {isSession && comandeCount > 1 && (
                              <span className="ml-2 text-primary-400">
                                • {comandeCount} comande (#{groupOrders.map(o => o.id).join(', #')})
                              </span>
                            )}
                            {isSession && (
                              <span className={`ml-2 ${firstOrder.session_status === 'open' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                • {firstOrder.session_status === 'open' ? 'Aperto' : 'Chiuso'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <p className="text-sm sm:text-lg font-bold text-primary-400 whitespace-nowrap">€{totalAmount.toFixed(2)}</p>
                        {/* Bottone scontrino - sempre visibile */}
                        <button
                          onClick={() => handleViewReceipt(firstOrder.id)}
                          className="p-1.5 sm:p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                          title={hasSplitPayment ? "Visualizza scontrino totale riepilogativo" : "Visualizza scontrino"}
                        >
                          <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-dark-300" />
                        </button>
                      </div>
                    </div>

                    {/* Pagamenti espansi */}
                    {isExpanded && payments.length > 0 && (
                      <div className="bg-dark-900/50 border-t border-dark-700">
                        {payments.map((payment, idx) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 pl-12 sm:pl-16 border-b border-dark-800 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-dark-500">└</span>
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-dark-700 flex items-center justify-center text-xs font-mono text-dark-400">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm text-white font-medium">
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
                                  {smacEnabled && (
                                    <span className={payment.smac_passed ? 'text-emerald-400' : 'text-red-400'}>
                                      {' • '}SMAC {payment.smac_passed ? '✓' : '✗'}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewPaymentReceipt(payment, firstOrder)}
                              className="p-1.5 sm:p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                              title="Visualizza scontrino pagamento"
                            >
                              <Receipt className="w-4 h-4 text-dark-300" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Closure Modal */}
      <Modal
        isOpen={showClosureModal}
        onClose={() => setShowClosureModal(false)}
        title="Chiusura Cassa"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-dark-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-dark-400">Incasso Totale:</span>
              <span className="font-bold text-white">{summary?.total_revenue.toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Di cui Contanti:</span>
              <span className="font-bold text-emerald-400">{summary?.cash_revenue.toFixed(2)} EUR</span>
            </div>
          </div>

          {/* Desktop: 2 colonne per i campi di input */}
          <div className="md:grid md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Fondo Cassa Iniziale (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="input"
                placeholder="Es: 100.00"
              />
            </div>

            <div className="mt-4 md:mt-0">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Contanti in Cassa Finale (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="input"
                placeholder="Es: 350.00"
              />
            </div>
          </div>

          {openingCash && closingCash && (
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-dark-400">Contanti Attesi:</span>
                <span className="font-bold text-white">
                  {(parseFloat(openingCash) + (summary?.cash_revenue || 0)).toFixed(2)} EUR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Differenza:</span>
                <span className={`font-bold ${
                  parseFloat(closingCash) - (parseFloat(openingCash) + (summary?.cash_revenue || 0)) >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}>
                  {(parseFloat(closingCash) - (parseFloat(openingCash) + (summary?.cash_revenue || 0))).toFixed(2)} EUR
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Note (opzionale)
            </label>
            <textarea
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              className="input resize-none h-16"
              placeholder="Eventuali note sulla chiusura..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowClosureModal(false)}
              className="btn-secondary flex-1"
            >
              Annulla
            </button>
            <button
              onClick={handleCloseCash}
              className="btn-primary flex-1"
            >
              <Lock className="w-5 h-5" />
              Conferma Chiusura
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Storico Chiusure Cassa"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {closures.length === 0 ? (
            <p className="text-center text-dark-400 py-8">Nessuna chiusura registrata</p>
          ) : (
            closures.slice(0, 30).map((closure) => (
              <div
                key={closure.id}
                className="bg-dark-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-white">
                    {new Date(closure.date).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${
                    closure.difference >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {closure.difference >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {closure.difference >= 0 ? '+' : ''}{closure.difference.toFixed(2)} EUR
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-dark-400">Incasso:</span>
                    <span className="text-white ml-2">{closure.total_revenue.toFixed(2)} EUR</span>
                  </div>
                  <div>
                    <span className="text-dark-400">Ordini:</span>
                    <span className="text-white ml-2">{closure.total_orders}</span>
                  </div>
                  <div>
                    <span className="text-dark-400">Contanti:</span>
                    <span className="text-emerald-400 ml-2">{closure.cash_revenue.toFixed(2)} EUR</span>
                  </div>
                  <div>
                    <span className="text-dark-400">Carta:</span>
                    <span className="text-blue-400 ml-2">{closure.card_revenue.toFixed(2)} EUR</span>
                  </div>
                </div>
                {closure.notes && (
                  <p className="text-dark-500 text-sm mt-2 italic">"{closure.notes}"</p>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Scontrino"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div ref={receiptRef} className="bg-white text-black p-6 rounded-lg font-mono text-sm">
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
                <p>Scontrino: {selectedReceipt.receipt_number}</p>
                <p>Data: {selectedReceipt.date} {selectedReceipt.time}</p>
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <div className="space-y-1">
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Imponibile:</span>
                  <span>{selectedReceipt.subtotal.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA ({selectedReceipt.iva_rate}%):</span>
                  <span>{selectedReceipt.iva_amount.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>TOTALE:</span>
                  <span>{selectedReceipt.total.toFixed(2)} EUR</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <div className="text-xs text-center">
                <p>Pagamento: {selectedReceipt.payment_method === 'cash' ? 'Contanti' : selectedReceipt.payment_method === 'card' ? 'Carta' : 'Online'}</p>
                {smacEnabled && selectedReceipt.smac_passed && <p className="font-bold">SMAC REGISTRATA</p>}
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              <p className="text-center text-xs">Grazie e arrivederci!</p>
            </div>

            <button
              onClick={handlePrintReceipt}
              className="btn-primary w-full"
            >
              <Printer className="w-5 h-5" />
              Stampa Scontrino
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
