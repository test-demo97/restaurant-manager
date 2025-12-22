import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingCart, ChevronUp, X, Users, Clock, AlertCircle, Minus } from 'lucide-react';
import {
  getCategories,
  getMenuItems,
  getTables,
  createOrder,
  getSettings,
  getTableSession,
  updateSessionTotal,
  getActiveSessionForTable,
  getSessionOrders,
  createTableSession,
  getNextOrderNumber,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { CartContent } from '../components/order/CartContent';
import { Modal } from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { useSmac } from '../context/SmacContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useAuth } from '../context/AuthContext';
import type { Category, MenuItem, Table, CartItem, Settings, TableSession, Order } from '../types';

type OrderType = 'dine_in' | 'takeaway' | 'delivery';
type PaymentMethod = 'cash' | 'card' | 'online';

export function NewOrder() {
  useLanguage(); // Ready for translations
  const { formatPrice } = useCurrency();
  const { smacEnabled } = useSmac();
  const { checkCanWrite } = useDemoGuard();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Session state (conto aperto)
  const [activeSession, setActiveSession] = useState<TableSession | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [smacPassed, setSmacPassed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Mobile cart panel state
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Modal per conto aperto rilevato
  const [showSessionDetectedModal, setShowSessionDetectedModal] = useState(false);
  const [detectedSession, setDetectedSession] = useState<TableSession | null>(null);
  const [detectedSessionOrders, setDetectedSessionOrders] = useState<Order[]>([]);
  const [pendingTableId, setPendingTableId] = useState<number | null>(null);

  // Modal per chiedere se aprire conto dopo ordine su tavolo senza sessione
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<{
    order: Parameters<typeof createOrder>[0];
    items: Parameters<typeof createOrder>[1];
    tableId: number;
    tableName: string;
  } | null>(null);

  // Form per apertura conto (come in Tavoli)
  const [sessionForm, setSessionForm] = useState({
    covers: '2',
    customer_name: '',
    customer_phone: '',
  });
  // Open session: whether to apply cover when creating a new session
  const [openSessionApplyCover, setOpenSessionApplyCover] = useState<boolean>(false);

  // Leggi parametri URL per sessione
  const sessionIdParam = searchParams.get('session');
  const tableIdParam = searchParams.get('table');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdParam, tableIdParam]);

  async function loadData() {
    try {
      const [cats, items, tbls, setts] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getTables(),
        getSettings(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      setTables(tbls);
      setSettings(setts);
      // Default for opening session: show checkbox only if cover configured
      setOpenSessionApplyCover((setts?.cover_charge || 0) > 0);
      if (cats.length > 0) {
        setSelectedCategory(cats[0].id);
      }

      // Se c'è una sessione, caricala
      if (sessionIdParam) {
        const sessionId = parseInt(sessionIdParam);
        const session = await getTableSession(sessionId);
        if (session) {
          setActiveSession(session);
          setSelectedTable(session.table_id);
          setOrderType('dine_in');
          // Precompila cliente se presente nella sessione
          if (session.customer_name) setCustomerName(session.customer_name);
          if (session.customer_phone) setCustomerPhone(session.customer_phone);
        }
      } else if (tableIdParam) {
        // Solo tavolo senza sessione
        setSelectedTable(parseInt(tableIdParam));
        setOrderType('dine_in');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category_id === selectedCategory && item.available)
    : menuItems.filter((item) => item.available);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const ivaRate = settings?.iva_rate || 17;
  const ivaIncluded = settings?.iva_included !== false; // Default true

  // Se IVA inclusa: scorporo l'IVA dal totale (prezzi già comprensivi)
  // Se IVA esclusa: aggiungo l'IVA al totale
  const ivaAmount = ivaIncluded
    ? cartTotal - (cartTotal / (1 + ivaRate / 100)) // IVA scorporata
    : cartTotal * (ivaRate / 100); // IVA aggiunta
  const grandTotal = ivaIncluded
    ? cartTotal // Il cliente paga il prezzo del menu
    : cartTotal + ivaAmount; // L'IVA viene aggiunta

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    // Feedback visivo
    showToast(`${item.name} aggiunto`, 'success');
  }

  function updateQuantity(itemId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(itemId: number) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function updateItemNotes(itemId: number, itemNotes: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notes: itemNotes } : item
      )
    );
  }

  function clearCart() {
    setCart([]);
    setExpandedItemId(null);
  }

  // Gestisce la selezione del tavolo con rilevamento conto aperto
  async function handleTableSelect(tableId: number) {
    // Se siamo già in una sessione (da URL), non fare nulla
    if (activeSession) return;

    // Controlla se il tavolo ha un conto aperto
    const existingSession = await getActiveSessionForTable(tableId);

    if (existingSession) {
      // Carica gli ordini (comande) della sessione per mostrare i dettagli
      const orders = await getSessionOrders(existingSession.id);
      setDetectedSession(existingSession);
      setDetectedSessionOrders(orders);
      setPendingTableId(tableId);
      setShowSessionDetectedModal(true);
    } else {
      // Nessuna sessione, seleziona normalmente il tavolo
      setSelectedTable(tableId);
      setActiveSession(null);
    }
  }

  // Conferma aggiunta al conto esistente
  async function confirmAddToSession() {
    if (!detectedSession || !pendingTableId) return;

    setActiveSession(detectedSession);
    setSelectedTable(pendingTableId);
    setOrderType('dine_in');

    // Precompila cliente se presente nella sessione
    if (detectedSession.customer_name) setCustomerName(detectedSession.customer_name);
    if (detectedSession.customer_phone) setCustomerPhone(detectedSession.customer_phone);

    setShowSessionDetectedModal(false);
    setDetectedSession(null);
    setDetectedSessionOrders([]);
    setPendingTableId(null);

    showToast('Comanda associata al conto aperto', 'success');
  }

  // Rifiuta e crea ordine senza sessione (ordine singolo)
  function cancelAddToSession() {
    if (pendingTableId) {
      setSelectedTable(pendingTableId);
    }
    setShowSessionDetectedModal(false);
    setDetectedSession(null);
    setDetectedSessionOrders([]);
    setPendingTableId(null);
  }

  async function submitOrder() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (cart.length === 0) {
      showToast('Aggiungi almeno un prodotto', 'warning');
      return;
    }

    // Per ordini al tavolo senza sessione, richiedi un tavolo
    if (orderType === 'dine_in' && !selectedTable && !activeSession) {
      showToast('Seleziona un tavolo', 'warning');
      return;
    }

    // Se è un ordine al tavolo senza sessione attiva, chiedi se aprire un conto
    if (orderType === 'dine_in' && selectedTable && !activeSession) {
      const order = {
        date: new Date().toISOString().split('T')[0],
        total: grandTotal,
        payment_method: paymentMethod,
        order_type: orderType,
        table_id: selectedTable,
        notes: notes || undefined,
        status: 'pending' as const,
        smac_passed: smacPassed,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
      };

      const items = cart.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      }));

      const tableName = tables.find(t => t.id === selectedTable)?.name || `Tavolo ${selectedTable}`;

      // Precompila il form sessione con i dati già inseriti
      setSessionForm({
        covers: '2',
        customer_name: customerName || '',
        customer_phone: customerPhone || '',
      });

      setPendingOrderData({ order, items, tableId: selectedTable, tableName });
      setShowOpenSessionModal(true);
      return;
    }

    await executeOrder();
  }

  // Esegue effettivamente l'ordine (chiamato direttamente o dopo conferma modal)
  async function executeOrder(openSession?: boolean, sessionId?: number, includeCover?: boolean) {
    setIsSubmitting(true);

    try {
      const items = cart.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      }));

      // Determina se è un ordine con sessione
      const isSessionOrder = activeSession || openSession;
      const currentSessionId = activeSession?.id || sessionId;

      // Se c'è una sessione, calcola il numero di comanda
      let orderNumber: number | undefined;
      if (currentSessionId) {
        orderNumber = await getNextOrderNumber(currentSessionId);
      }

      // Crea SEMPRE un nuovo ordine (ogni comanda = un ordine nel Kanban cucina)
      const order = {
        date: new Date().toISOString().split('T')[0],
        total: isSessionOrder ? cartTotal : grandTotal,
        payment_method: isSessionOrder ? 'cash' : paymentMethod,
        order_type: orderType,
        table_id: orderType === 'dine_in' ? selectedTable ?? undefined : undefined,
        notes: notes || undefined,
        status: 'pending' as const,
        smac_passed: isSessionOrder ? false : smacPassed,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        session_id: currentSessionId,
        order_number: orderNumber,
        created_by: user?.name,
      };

      await createOrder(order, items);

      // Se c'è una sessione (esistente o appena creata), aggiorna il totale
      if (currentSessionId) {
        // Decide se includere il coperto: se chiamante ha fornito la preferenza, usala, altrimenti tenta di inferirla
        let includeCoverFinal = includeCover;
        if (includeCoverFinal === undefined) {
          try {
            const [session, settings] = await Promise.all([getTableSession(currentSessionId), getSettings()]);
            const covers = session?.covers || 0;
            const coverUnit = settings.cover_charge || 0;
            // Inferendo: se session.total corrisponde a ordersTotal + cover allora il coperto è applicato
            const allSessionOrders = await getSessionOrders(currentSessionId);
            const ordersTotal = allSessionOrders.reduce((sum, o) => sum + o.total, 0);
            const expectedWithCover = ordersTotal + coverUnit * covers;
            includeCoverFinal = Math.abs((session?.total || 0) - expectedWithCover) < 0.01 && coverUnit > 0 && covers > 0;
          } catch (err) {
            includeCoverFinal = false;
          }
        }
        await updateSessionTotal(currentSessionId, includeCoverFinal === undefined ? true : includeCoverFinal);
        const comandaMsg = orderNumber && orderNumber > 1
          ? `Comanda ${orderNumber} inviata!`
          : 'Prima comanda inviata!';
        showToast(comandaMsg, 'success');
        navigate('/tables');
      } else if (sessionId) {
        await updateSessionTotal(sessionId, includeCover === undefined ? openSessionApplyCover : includeCover);
        showToast('Ordine creato e conto aperto!', 'success');
        navigate('/tables');
      } else {
        showToast('Ordine creato con successo!', 'success');
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      showToast('Errore nella creazione dell\'ordine', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Conferma ordine E apertura conto
  async function confirmOpenSession() {
    if (!pendingOrderData) return;

    // Validazione coperti
    const covers = parseInt(sessionForm.covers) || 1;
    if (covers < 1) {
      showToast('Inserisci almeno 1 coperto', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // Crea la sessione con i dati del form
      const session = await createTableSession(
        pendingOrderData.tableId,
        covers,
        sessionForm.customer_name || undefined,
        sessionForm.customer_phone || undefined
      );

      // Aggiorna anche il nome cliente nell'ordine se inserito nel form
      if (sessionForm.customer_name) {
        setCustomerName(sessionForm.customer_name);
      }
      if (sessionForm.customer_phone) {
        setCustomerPhone(sessionForm.customer_phone);
      }

      // Chiudi il modal
      setShowOpenSessionModal(false);
      setPendingOrderData(null);

      // Esegui l'ordine con la sessione
      await executeOrder(true, session.id, openSessionApplyCover);
    } catch (error) {
      console.error('Error creating session:', error);
      showToast('Errore nell\'apertura del conto', 'error');
      setIsSubmitting(false);
    }
  }

  // Conferma ordine SENZA aprire conto
  async function confirmWithoutSession() {
    if (!pendingOrderData) return;

    setShowOpenSessionModal(false);
    setPendingOrderData(null);

    // Esegui l'ordine normalmente senza sessione
    await executeOrder(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Per sessioni, nascondi selezione tavolo e pagamento (già gestiti)
  const isSessionOrder = !!activeSession;

  // Props comuni per CartContent
  const cartContentProps = {
    orderType,
    setOrderType: isSessionOrder ? () => {} : setOrderType, // Blocca cambio tipo per sessioni
    selectedTable,
    setSelectedTable: isSessionOrder ? () => {} : setSelectedTable, // Blocca cambio tavolo per sessioni
    onTableSelect: isSessionOrder ? undefined : handleTableSelect, // Funzione per selezione tavolo con rilevamento sessione
    tables,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    cart,
    cartItemsCount,
    cartTotal,
    ivaRate,
    ivaAmount,
    ivaIncluded,
    grandTotal,
    expandedItemId,
    setExpandedItemId,
    notes,
    setNotes,
    paymentMethod,
    setPaymentMethod,
    smacPassed,
    setSmacPassed,
    smacEnabled,
    isSubmitting,
    clearCart,
    updateQuantity,
    removeFromCart,
    updateItemNotes,
    submitOrder,
    // Props per sessione
    isSessionOrder,
    sessionTableName: activeSession?.table_name,
  };

  return (
    <>
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex gap-4 h-[calc(100vh-100px)]">
        {/* Left side - Products */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-dark-900'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pt-1">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="menu-item-card text-left relative overflow-visible"
                  >
                    {/* Quantità badge */}
                    {inCart && (
                      <div className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-sm font-bold text-dark-900 z-20 shadow-lg">
                        {inCart.quantity}
                      </div>
                    )}

                    <h3 className="font-semibold text-white mb-1 line-clamp-2">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-dark-400 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Footer con prezzo e controlli */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xl font-bold text-primary-400">
                        {formatPrice(item.price)}
                      </p>

                      {/* Pulsante rimuovi - visibile solo se nel carrello */}
                      {inCart && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, -1);
                          }}
                          className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-red-500/20 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-4 h-4 text-red-400" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side - Cart (Desktop) */}
        <div className="w-[420px] flex flex-col bg-dark-800 rounded-2xl border border-dark-700">
          <CartContent {...cartContentProps} />
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-120px)]">
        {/* Categories - Horizontal scroll */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 -mx-3 px-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
                selectedCategory === category.id
                  ? 'bg-primary-500 text-dark-900'
                  : 'bg-dark-800 text-dark-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid - Mobile optimized */}
        <div className="flex-1 overflow-y-auto -mx-3 px-3 pb-24 pt-3">
          <div className="grid grid-cols-2 gap-3 pt-1">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="relative bg-dark-800 rounded-xl p-3 text-left border border-dark-700 active:scale-[0.98] transition-transform overflow-visible"
                >
                  {/* Quantità badge */}
                  {inCart && (
                    <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs font-bold text-dark-900 z-20 shadow-lg">
                      {inCart.quantity}
                    </div>
                  )}

                  <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">
                    {item.name}
                  </h3>

                  {/* Footer con prezzo e controlli */}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-lg font-bold text-primary-400">
                      {formatPrice(item.price)}
                    </p>

                    {/* Pulsante rimuovi - visibile solo se nel carrello */}
                    {inCart && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1);
                        }}
                        className="w-7 h-7 rounded-lg bg-dark-700 active:bg-red-500/30 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5 text-red-400" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Cart Bar - Fixed bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-dark-900 border-t border-dark-700 lg:hidden z-30 safe-bottom">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-primary-400" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-xs font-bold text-dark-900">
                    {cartItemsCount}
                  </span>
                )}
              </div>
              <span className="text-white font-medium">
                {cart.length === 0 ? 'Carrello vuoto' : `${cartItemsCount} articoli`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-400">
                {formatPrice(grandTotal)}
              </span>
              <ChevronUp className="w-5 h-5 text-dark-400" />
            </div>
          </button>
        </div>

        {/* Mobile Cart Panel - Full screen slide up */}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileCartOpen(false)}
            />

            {/* Panel */}
            <div className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-dark-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
                <h2 className="text-lg font-bold text-white">Il tuo ordine</h2>
                <button
                  onClick={() => setMobileCartOpen(false)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>

              {/* Cart Content */}
              <div className="flex-1 overflow-y-auto">
                <CartContent {...cartContentProps} isMobile />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 12px);
        }
      `}</style>

      {/* Modal rilevamento conto aperto */}
      <Modal
        isOpen={showSessionDetectedModal}
        onClose={() => setShowSessionDetectedModal(false)}
        title="Conto Aperto Rilevato"
        size="md"
      >
        {detectedSession && (
          <div className="space-y-6">
            {/* Alert */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400">
                  Questo tavolo ha già un conto aperto
                </p>
                <p className="text-sm text-dark-300 mt-1">
                  Vuoi aggiungere la comanda al conto esistente?
                </p>
              </div>
            </div>

            {/* Session Info */}
            <div className="p-4 bg-dark-900 rounded-xl">
              <h3 className="font-semibold text-white mb-3">
                {detectedSession.table_name || `Tavolo ${detectedSession.table_id}`}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-dark-400">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Coperti</span>
                  </div>
                  <p className="text-lg font-bold text-white">{detectedSession.covers}</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-dark-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Comande</span>
                  </div>
                  <p className="text-lg font-bold text-white">{detectedSessionOrders.length}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Totale</p>
                  <p className="text-lg font-bold text-primary-400">{formatPrice(detectedSession.total)}</p>
                </div>
              </div>

              {detectedSession.customer_name && (
                <p className="mt-3 text-sm text-dark-400">
                  Cliente: <span className="text-white">{detectedSession.customer_name}</span>
                </p>
              )}

              {/* Lista comande esistenti */}
              {detectedSessionOrders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-sm text-dark-400 mb-2">Comande esistenti:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {detectedSessionOrders.map((order) => (
                      <div key={order.id} className="flex justify-between text-sm">
                        <span className="text-dark-300">Comanda #{order.order_number || 1}</span>
                        <span className="text-white">{formatPrice(order.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmAddToSession}
                className="btn-primary w-full py-3"
              >
                Sì, aggiungi al conto
              </button>
              <button
                onClick={cancelAddToSession}
                className="btn-secondary w-full"
              >
                No, crea ordine separato
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal per chiedere se aprire conto */}
      <Modal
        isOpen={showOpenSessionModal}
        onClose={() => setShowOpenSessionModal(false)}
        title="Aprire un Conto?"
        size="md"
      >
        {pendingOrderData && (
          <div className="space-y-6">
            {/* Info */}
            <div className="flex items-start gap-3 p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
              <Users className="w-6 h-6 text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-primary-400">
                  Stai creando un ordine per {pendingOrderData.tableName}
                </p>
                <p className="text-sm text-dark-300 mt-1">
                  Vuoi aprire un conto per questo tavolo? Così potrai aggiungere altre comande in seguito.
                </p>
              </div>
            </div>

            {/* Form dati conto (come in Tavoli) */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Numero Coperti *
                </label>
                <input
                  type="number"
                  min="1"
                  value={sessionForm.covers}
                  onChange={(e) => setSessionForm({ ...sessionForm, covers: e.target.value })}
                  className="input w-full"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Nome Cliente (opzionale)
                </label>
                <input
                  type="text"
                  value={sessionForm.customer_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, customer_name: e.target.value })}
                  className="input w-full"
                  placeholder="Es. Mario Rossi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Telefono (opzionale)
                </label>
                <input
                  type="tel"
                  value={sessionForm.customer_phone}
                  onChange={(e) => setSessionForm({ ...sessionForm, customer_phone: e.target.value })}
                  className="input w-full"
                  placeholder="Es. 333 1234567"
                />
              </div>
              {/* Checkbox applica coperto: mostra solo se impostato coperto nelle settings */}
              {settings && (settings.cover_charge || 0) > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <input
                    id="open_session_apply_cover"
                    type="checkbox"
                    checked={openSessionApplyCover}
                    onChange={(e) => setOpenSessionApplyCover(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <label htmlFor="open_session_apply_cover" className="text-white text-sm">
                    Applica coperto ({formatPrice(settings.cover_charge)} / ospite)
                  </label>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-dark-900 rounded-xl">
              <h3 className="font-semibold text-white mb-2">Riepilogo Ordine</h3>
              <div className="flex justify-between items-center">
                <span className="text-dark-400">{cartItemsCount} articoli</span>
                <span className="text-xl font-bold text-primary-400">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmOpenSession}
                disabled={isSubmitting}
                className="btn-primary w-full py-3"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-dark-900 mx-auto"></div>
                ) : (
                  'Apri Conto e Invia Ordine'
                )}
              </button>
              <button
                onClick={confirmWithoutSession}
                disabled={isSubmitting}
                className="btn-secondary w-full"
              >
                No, solo ordine singolo (senza conto)
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
