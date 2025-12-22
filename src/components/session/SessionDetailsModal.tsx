import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Eye, Edit2, Trash2, Plus, Shuffle } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import { useSmac } from '../../context/SmacContext';
import {
  getSessionOrders,
  getOrderItems,
  getSessionPayments,
  getTableSession,
  getSessionRemainingAmount,
  updateSessionTotal,
  getSettings,
} from '../../lib/database';
import type { Order, OrderItem, SessionPayment } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: number | null;
  orderId?: number | null; // optional single-order view
  onViewOrder?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onDeleteOrder?: (orderId: number, sessionId?: number) => void;
  onOpenSplit?: () => void;
  onOpenBillStatus?: () => void;
  onAddOrder?: () => void;
  onTransfer?: () => void;
  onCloseSession?: () => void;
};

export default function SessionDetailsModal({
  isOpen,
  onClose,
  sessionId,
  orderId,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onOpenSplit,
  onOpenBillStatus,
  onAddOrder,
  onTransfer,
  onCloseSession,
}: Props) {
  const { formatPrice } = useCurrency();
  const { smacEnabled } = useSmac();
  

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<number, OrderItem[]>>({});
  const [payments, setPayments] = useState<SessionPayment[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [includeCover, setIncludeCover] = useState<boolean>(false);
  const [coverUnit, setCoverUnit] = useState<number>(0);
  const [coversCount, setCoversCount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      setLoading(true);
      try {
        if (sessionId) {
          const so = await getSessionOrders(sessionId);
          setOrders(so);

          const map: Record<number, OrderItem[]> = {};
          await Promise.all(
            so.map(async (o) => {
              const items = await getOrderItems(o.id);
              map[o.id] = items;
            })
          );
          setOrderItemsMap(map);

          const p = await getSessionPayments(sessionId);
          setPayments(p);

          const rem = await getSessionRemainingAmount(sessionId);
          setRemaining(rem);

          const s = await getTableSession(sessionId);
          setSession(s);
          // load cover settings and compute whether cover is applied
          try {
            const settings = await getSettings();
            const cover = settings?.cover_charge || 0;
            const covers = s?.covers || 0;
            setCoverUnit(cover);
            setCoversCount(covers);
            if (cover > 0 && covers > 0) {
              // detect if session.total already includes cover
              const ordersTotal = so.reduce((sum, o) => sum + o.total, 0);
              const expectedWithCover = ordersTotal + cover * covers;
              const applied = Math.abs((s?.total || 0) - expectedWithCover) < 0.01 || (s?.total || 0) >= expectedWithCover - 0.01;
              setIncludeCover(applied && cover > 0 && covers > 0);
            } else {
              setIncludeCover(false);
            }
          } catch (err) {
            console.error('Error loading settings for cover:', err);
          }
        } else if (orderId) {
          // If only orderId provided, try to load its order via session queries
          // Fallback: load orders by searching sessions containing this order is not implemented here.
          setOrders([]);
          setOrderItemsMap({});
          setPayments([]);
          setRemaining(0);
          setSession(null);
        }
      } catch (err) {
        console.error('Error loading session details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, sessionId, orderId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={session ? `${session.table_name} - Conto` : 'Dettagli Conto'} size="lg">
      {loading ? (
        <div className="flex items-center justify-center h-40">Loading...</div>
      ) : (
        <div className="space-y-4">
          {session && (
            <div className={`rounded-xl p-3 text-center border ${session.status === 'open' ? 'bg-primary-500/10 border-primary-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <span className={`font-medium ${session.status === 'open' ? 'text-primary-400' : 'text-emerald-400'}`}>
                {session.status === 'open' ? 'Conto Aperto' : 'Conto Chiuso'}
                {orders.length > 1 && ` - ${orders.length} comande`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-dark-400">Tipo</p>
              <p className="font-medium text-white">{session ? (session.order_type || 'Al Tavolo') : ''}</p>

              {smacEnabled && (
                <div className="mt-3">
                  <p className="text-sm text-dark-400">SMAC</p>
                  <p className="font-medium text-white text-sm px-2 py-1 rounded bg-dark-800 inline-block">
                    {payments.filter(p => p.smac_passed).length ? 'Sì' : 'No'}
                  </p>
                </div>
              )}

              {session?.customer_name && (
                <div className="mt-3">
                  <p className="text-sm text-dark-400">Cliente</p>
                  <p className="font-medium text-white">{session.customer_name}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-dark-400">Stato</p>
              <div className="flex items-center gap-3">
                <span className={`badge-${session?.status === 'open' ? 'primary' : 'success'}`}>{session?.status}</span>
              </div>

              {session?.table_name && (
                <div className="mt-3">
                  <p className="text-sm text-dark-400">Tavolo</p>
                  <p className="font-medium text-white">{session.table_name}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-dark-400">Comande del conto</p>
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-dark-900 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-dark-700 px-2 py-1 rounded text-dark-300">#{order.order_number || order.id}</span>
                      <span className="font-medium text-white">Comanda {order.order_number || order.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge-secondary`}>{order.status}</span>
                      <span className="font-bold text-primary-400">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pl-2 border-l-2 border-dark-700">
                    {(orderItemsMap[order.id] || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-white">{item.quantity}x {item.menu_item_name}</span>
                        </div>
                        <span className="text-dark-300">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-dark-700">
                    {onViewOrder && (
                      <button onClick={() => onViewOrder(order)} className="btn-ghost btn-sm px-2 py-1" title="Visualizza comanda"><Eye className="w-4 h-4"/></button>
                    )}
                    {onEditOrder && (
                      <button onClick={() => onEditOrder(order)} className="btn-ghost btn-sm px-2 py-1" title="Modifica comanda"><Edit2 className="w-4 h-4"/></button>
                    )}
                    {onDeleteOrder && (
                      <button onClick={() => onDeleteOrder(order.id, sessionId ?? undefined)} className="btn-ghost btn-sm px-2 py-1 text-red-400" title="Elimina"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {includeCover && coverUnit > 0 && coversCount > 0 && (
            <div className="p-3 bg-dark-900 rounded-xl">
              <p className="text-sm text-dark-400">Voci aggiuntive</p>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-white">{coversCount}x Coperto</div>
                <div className="text-sm text-primary-400 font-semibold">{formatPrice(coverUnit * coversCount)}</div>
              </div>
            </div>
          )}

          <div className="p-3 bg-dark-900 rounded-xl">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <p className="text-xs text-dark-400">Totale</p>
                <p className="text-base lg:text-lg font-bold text-white">{formatPrice(session?.total || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-400">Pagato</p>
                <p className="text-base lg:text-lg font-bold text-emerald-400">{formatPrice((session?.total || 0) - remaining)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-400">Rimanente</p>
                <p className="text-base lg:text-lg font-bold text-primary-400">{formatPrice(remaining)}</p>
              </div>
            </div>
          </div>

          {session && coverUnit > 0 && coversCount > 0 && (
            <div className="p-3 bg-dark-900 rounded-xl">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setIncludeCover(val);
                    if (!session?.id) return;
                    try {
                      await updateSessionTotal(session.id, val);
                      // reload session and remaining
                      const s = await getTableSession(session.id);
                      setSession(s);
                      const rem = await getSessionRemainingAmount(session.id);
                      setRemaining(rem);
                    } catch (err) {
                      console.error('Error toggling cover:', err);
                    }
                  }}
                />
                <span className="ml-1">Applica coperto ({formatPrice(coverUnit)} / ospite)</span>
              </label>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            {/** Optional actions forwarded from parent */}
            {typeof onAddOrder === 'function' && (
              <button onClick={() => { onAddOrder && onAddOrder(); onClose(); }} className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 flex items-center gap-2">
                <Plus className="w-4 h-4"/> Nuova Comanda
              </button>
            )}
            {typeof onTransfer === 'function' && (
              <button onClick={() => { onTransfer && onTransfer(); onClose(); }} className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 flex items-center gap-2">
                <Shuffle className="w-4 h-4"/> Trasferisci
              </button>
            )}
            {typeof onOpenSplit === 'function' && (
              <button onClick={() => { onOpenSplit && onOpenSplit(); onClose(); }} className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 flex items-center gap-2">
                Dividi Conto
              </button>
            )}
            {typeof onOpenBillStatus === 'function' && (
              <button onClick={() => { onOpenBillStatus && onOpenBillStatus(); onClose(); }} className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 flex items-center gap-2">
                Stato Conto
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => { if (onCloseSession) { onCloseSession(); } else { onClose(); } }} className="px-4 py-3 rounded-xl bg-amber-500 text-dark-900 font-semibold">Chiudi Conto</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
