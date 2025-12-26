import { Modal } from '../../components/ui/Modal';
import { Banknote, CreditCard, ListChecks, Calculator, Receipt, Printer } from 'lucide-react';
import type { OrderItem, SessionPayment, SessionPaymentItem } from '../../types';

type SplitPaymentForm = {
  amount: string;
  method?: 'cash' | 'card' | 'online';
  paymentMethod?: 'cash' | 'card' | 'online';
  notes?: string;
  smac?: boolean;
  change?: number;
};

type ChangeCalculator = {
  customerGives?: string;
  showChange?: boolean;
  amount?: string;
  change?: number;
};

type RemainingItem = Partial<OrderItem> & Partial<SessionPaymentItem> & { order_number?: number; remainingQty?: number };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  session: { id: number; total: number } | null;
  sessionPayments: SessionPayment[];
  remainingAmount: number;
  remainingSessionItems: RemainingItem[];
  sessionCovers: number;
  sessionCoverUnitPrice: number;
  sessionIncludesCover: boolean;
  onToggleSessionCover: (sessionId: number, include: boolean) => void;
  splitMode: 'manual' | 'items';
  setSplitMode: (m: 'manual' | 'items') => void;
  selectedItems: Record<number, number>;
  onIncrementItem: (id: number) => void;
  onDecrementItem: (id: number) => void;
  onApplyItemsSelection: () => void;
  onToggleAllItemQuantity?: (itemId: number) => void;
  splitPaymentForm: SplitPaymentForm;
  onChangeSplitPaymentForm: (patch: Partial<SplitPaymentForm>) => void;
  changeCalculator: ChangeCalculator;
  onChangeChangeCalculator: (patch: Partial<ChangeCalculator>) => void;
  onAddSplitPayment: () => Promise<void>;
  calculateSelectedItemsTotal: () => number;
  calculateSplitChange: () => number;
  smacEnabled: boolean;
  onPrintPaymentReceipt: (p: SessionPayment) => void;
  formatPrice?: (n: number) => string | null;
  coverSelectedCount: number;
  onChangeCoverSelectedCount: (n: number) => void;
};

export default function SplitModal(props: Props) {
  const {
    isOpen,
    onClose,
    session,
    sessionPayments,
    remainingAmount,
    remainingSessionItems,
    sessionCovers,
    sessionCoverUnitPrice,
    splitMode,
    setSplitMode,
    coverSelectedCount,
    onChangeCoverSelectedCount,
    selectedItems,
    onIncrementItem,
    onDecrementItem,
    onApplyItemsSelection,
    splitPaymentForm,
    onChangeSplitPaymentForm,
    changeCalculator,
    onChangeChangeCalculator,
    onAddSplitPayment,
    calculateSelectedItemsTotal,
    calculateSplitChange,
    smacEnabled,
    onPrintPaymentReceipt,
    formatPrice,
  } = props;

  const fmt = formatPrice || ((n: number) => n.toFixed(2));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dividi Conto" size="2xl">
      {session && (
        <div className="space-y-4">
          <div className="p-3 bg-dark-900 rounded-xl">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <p className="text-xs text-dark-400">Totale</p>
                <p className="text-base lg:text-lg font-bold text-white">{fmt(session.total + (coverSelectedCount > 0 ? coverSelectedCount * sessionCoverUnitPrice : 0))}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-400">Pagato</p>
                <p className="text-base lg:text-lg font-bold text-emerald-400">{fmt((sessionPayments || []).reduce((s, p) => s + (p.amount || 0), 0) + (coverSelectedCount > 0 ? 0 : 0))}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-400">Rimanente</p>
                <p className="text-base lg:text-lg font-bold text-primary-400">{fmt((session.total + (coverSelectedCount > 0 ? coverSelectedCount * sessionCoverUnitPrice : 0)) - ((sessionPayments || []).reduce((s, p) => s + (p.amount || 0), 0)))}</p>
              </div>
            </div>
            {session.total > 0 && (
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((session.total - remainingAmount) / session.total) * 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="md:grid md:grid-cols-2 md:gap-4">
            <div>
              {sessionPayments.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-2">Pagamenti effettuati</h4>
                  <div className="space-y-2 max-h-40 lg:max-h-64 overflow-y-auto">
                    {sessionPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 bg-dark-900 rounded-lg">
                        <div className="flex items-center gap-2">
                          {payment.payment_method === 'cash' && <Banknote className="w-4 h-4 text-emerald-400" />}
                          {payment.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-400" />}
                          {payment.payment_method === 'online' && <Printer className="w-4 h-4 text-purple-400" />}
                          <span className="text-white text-sm">{fmt(payment.amount)}</span>
                          {payment.notes && <span className="text-dark-400 text-xs">- {payment.notes}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {smacEnabled && payment.smac_passed && (
                            <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">SMAC</span>
                          )}
                          <button onClick={() => onPrintPaymentReceipt(payment)} className="p-1 hover:bg-dark-700 rounded transition-colors" title="Stampa scontrino">
                            <Printer className="w-3.5 h-3.5 text-dark-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-dark-900 rounded-xl text-center text-dark-500 text-sm">Nessun pagamento ancora effettuato</div>
              )}
            </div>

            <div className="mt-4 md:mt-0">

              {remainingAmount > 0 && (
                <>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setSplitMode('manual')} className={`flex-1 p-2 lg:p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${splitMode === 'manual' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 hover:border-dark-600'}`}>
                      <Banknote className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span className="text-xs lg:text-sm font-medium">Manuale</span>
                    </button>
                    <button onClick={() => setSplitMode('items')} className={`flex-1 p-2 lg:p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${splitMode === 'items' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 hover:border-dark-600'}`}>
                      <ListChecks className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span className="text-xs lg:text-sm font-medium">Per Prodotto</span>
                    </button>
                  </div>

                  {splitMode === 'items' && (
                    <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl space-y-4">
                      <p className="text-sm text-dark-400">Seleziona quanti pezzi di ogni prodotto pagare.</p>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {remainingSessionItems.length === 0 ? (
                          <p className="text-center text-dark-500 py-4">Tutti i prodotti sono stati pagati</p>
                        ) : (
                          remainingSessionItems.map((item) => {
                            const id = Number(item.id || 0);
                            const selectedQty = selectedItems[id] || 0;
                            const isSelected = selectedQty > 0;
                            return (
                              <div key={item.id} className={`p-3 rounded-lg border-2 ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700'}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{item.menu_item_name}</p>
                                      <p className="text-xs text-dark-400">{fmt(item.price ?? 0)} • {item.remainingQty ?? 0} rimasti</p>
                                  </div>
                                    <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                                    <button onClick={() => onDecrementItem(id)} disabled={selectedQty === 0} className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30">-</button>
                                    <span className="w-8 text-center font-bold">{selectedQty}</span>
                                      <button onClick={() => onIncrementItem(id)} disabled={selectedQty >= (item.remainingQty ?? 0)} className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30">+</button>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
                                      <span className="text-xs text-dark-400">{selectedQty}/{item.remainingQty ?? 0} selezionati</span>
                                    <span className="text-sm font-semibold text-blue-400">{fmt((item.price ?? 0) * selectedQty)}</span>
                                  </div>
                                )}
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
                                <p className="text-xs text-dark-400">{fmt(sessionCoverUnitPrice)} • {sessionCovers} pers.</p>
                              </div>
                              <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                                <button onClick={() => onChangeCoverSelectedCount(Math.max(0, coverSelectedCount - 1))} disabled={coverSelectedCount === 0} className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30">-</button>
                                <span className="w-8 text-center font-bold">{coverSelectedCount}</span>
                                <button onClick={() => onChangeCoverSelectedCount(Math.min(sessionCovers, coverSelectedCount + 1))} disabled={coverSelectedCount >= sessionCovers} className="w-8 h-8 rounded bg-dark-700 disabled:opacity-30">+</button>
                              </div>
                            </div>
                            {coverSelectedCount > 0 && (
                              <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
                                <span className="text-xs text-dark-400">{coverSelectedCount}/{sessionCovers} selezionati</span>
                                <span className="text-sm font-semibold text-blue-400">{fmt(sessionCoverUnitPrice * coverSelectedCount)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-3 bg-dark-900 rounded-lg flex justify-between">
                          <span>Totale:</span>
                          <span className="text-blue-400 font-bold">{fmt(calculateSelectedItemsTotal() + (coverSelectedCount > 0 ? coverSelectedCount * sessionCoverUnitPrice : 0))}</span>
                        </div>
                      </div>
                      <button onClick={onApplyItemsSelection} disabled={Object.keys(selectedItems).length === 0 && coverSelectedCount === 0} className="btn-primary w-full bg-blue-600 hover:bg-blue-700">Applica Selezione</button>
                    </div>
                  )}

                  {splitMode === 'manual' && (
                    <div className="space-y-4 p-4 border border-dark-700 rounded-xl">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Importo</label>
                          <input type="number" step="0.01" value={splitPaymentForm.amount} onChange={(e) => onChangeSplitPaymentForm({ amount: e.target.value })} className="input" placeholder={`Max €${remainingAmount.toFixed(2)}`} />
                        </div>
                        <div>
                          <label className="label">Note</label>
                          <input type="text" value={splitPaymentForm.notes} onChange={(e) => onChangeSplitPaymentForm({ notes: e.target.value })} className="input" placeholder="Es. Marco" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onChangeSplitPaymentForm({ method: 'cash' })} className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${splitPaymentForm.method === 'cash' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700'}`}>
                          <Banknote className="w-4 h-4" /> Contanti
                        </button>
                        <button onClick={() => onChangeSplitPaymentForm({ method: 'card' })} className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${splitPaymentForm.method === 'card' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700'}`}>
                          <CreditCard className="w-4 h-4" /> Carta
                        </button>
                      </div>
                      {smacEnabled && (
                        <div className="flex items-center gap-3 p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg">
                          <input type="checkbox" id="split_smac_comp" checked={splitPaymentForm.smac} onChange={(e) => onChangeSplitPaymentForm({ smac: e.target.checked })} className="w-5 h-5" />
                          <label htmlFor="split_smac_comp" className="text-white">SMAC passato</label>
                        </div>
                      )}
                      {splitPaymentForm.method === 'cash' && splitPaymentForm.amount && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                          <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" /><span className="font-medium text-emerald-400">Calcolatore Resto</span></div>
                          <input type="number" value={changeCalculator.customerGives} onChange={(e) => onChangeChangeCalculator({ customerGives: e.target.value })} className="input" placeholder="Cliente dà €..." />
                          {changeCalculator.customerGives && (
                            <div className="p-3 bg-dark-900 rounded-lg flex justify-between"><span className="text-emerald-400 font-semibold">RESTO:</span><span className="text-2xl font-bold text-emerald-400">{fmt(calculateSplitChange())}</span></div>
                          )}
                        </div>
                      )}
                      <button onClick={onAddSplitPayment} className="btn-primary w-full">Aggiungi Pagamento</button>
                    </div>
                  )}
                </>
              )}

              {remainingAmount === 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <Receipt className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                  <h4 className="text-lg font-bold text-emerald-400">Conto Saldato!</h4>
                  <p className="text-dark-400 text-sm">Il conto è stato completamente pagato.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button onClick={onClose} className="btn-secondary w-full">Chiudi</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
