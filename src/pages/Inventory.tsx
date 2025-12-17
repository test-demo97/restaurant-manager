import { useEffect, useState } from 'react';
import {
  Plus,
  Package,
  AlertTriangle,
  TrendingDown,
  Edit2,
  RefreshCw,
  Calculator,
  ShoppingCart,
  Clock,
  ArrowRight,
  Truck,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import {
  getInventory,
  createIngredient,
  updateInventoryQuantity,
  getLowStockItems,
  calculateEOQ,
  getIngredients,
  getSupplies,
  getSupplyItems,
  createSupply,
  deleteSupply,
  getSupplyStats,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import type { InventoryItem, EOQResult, Ingredient, Supply, SupplyItem } from '../types';

// Interfaccia per item temporanei nella creazione fornitura
interface TempSupplyItem {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [eoqData, setEoqData] = useState<EOQResult[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyStats, setSupplyStats] = useState<{
    totalSpent: number;
    suppliesCount: number;
    avgSupplyCost: number;
    topIngredients: { ingredient_name: string; quantity: number; total_cost: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'eoq' | 'supplies'>('inventory');
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showSupplyDetailModal, setShowSupplyDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [selectedSupplyItems, setSelectedSupplyItems] = useState<SupplyItem[]>([]);

  // Form states
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'kg',
    cost: '',
  });
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateMode, setUpdateMode] = useState<'add' | 'set'>('add');

  // Supply form states
  const [supplyForm, setSupplyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    notes: '',
  });
  const [supplyItems, setSupplyItems] = useState<TempSupplyItem[]>([]);
  const [newSupplyItem, setNewSupplyItem] = useState({
    ingredient_id: 0,
    quantity: '',
    unit_cost: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [inv, low, eoq, ing, sup, stats] = await Promise.all([
        getInventory(),
        getLowStockItems(),
        calculateEOQ(),
        getIngredients(),
        getSupplies(),
        getSupplyStats(),
      ]);
      setInventory(inv);
      setLowStock(low);
      setEoqData(eoq);
      setIngredients(ing);
      setSupplies(sup);
      setSupplyStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Ingredienti da riordinare (giorni fino al riordino < 7)
  const urgentReorders = eoqData.filter(e => e.days_until_reorder < 7 && e.avg_daily_consumption > 0);

  const filteredInventory =
    filter === 'low' ? lowStock : inventory;

  function openUpdateModal(item: InventoryItem) {
    setSelectedItem(item);
    setUpdateQuantity('');
    setUpdateMode('add');
    setShowUpdateModal(true);
  }

  async function handleAddIngredient() {
    if (!ingredientForm.name.trim()) {
      showToast('Inserisci un nome', 'warning');
      return;
    }

    try {
      await createIngredient({
        name: ingredientForm.name.trim(),
        unit: ingredientForm.unit,
        cost: parseFloat(ingredientForm.cost) || 0,
      });

      showToast('Ingrediente aggiunto', 'success');
      setShowAddModal(false);
      setIngredientForm({ name: '', unit: 'kg', cost: '' });
      loadData();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      showToast('Errore nell\'aggiunta', 'error');
    }
  }

  async function handleUpdateQuantity() {
    if (!selectedItem || !updateQuantity) {
      showToast('Inserisci una quantità', 'warning');
      return;
    }

    try {
      const qty = parseFloat(updateQuantity);
      const newQty = updateMode === 'add'
        ? selectedItem.quantity + qty
        : qty;

      await updateInventoryQuantity(selectedItem.ingredient_id, newQty);
      showToast('Quantità aggiornata', 'success');
      setShowUpdateModal(false);
      loadData();
    } catch (error) {
      console.error('Error updating quantity:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  // Supply functions
  function handleAddSupplyItem() {
    if (!newSupplyItem.ingredient_id || !newSupplyItem.quantity || !newSupplyItem.unit_cost) {
      showToast('Compila tutti i campi', 'warning');
      return;
    }

    const ingredient = ingredients.find(i => i.id === newSupplyItem.ingredient_id);
    if (!ingredient) return;

    // Verifica se l'ingrediente è già nella lista
    if (supplyItems.some(item => item.ingredient_id === newSupplyItem.ingredient_id)) {
      showToast('Ingrediente già aggiunto', 'warning');
      return;
    }

    setSupplyItems([
      ...supplyItems,
      {
        ingredient_id: newSupplyItem.ingredient_id,
        ingredient_name: ingredient.name,
        unit: ingredient.unit,
        quantity: parseFloat(newSupplyItem.quantity),
        unit_cost: parseFloat(newSupplyItem.unit_cost),
      },
    ]);

    setNewSupplyItem({ ingredient_id: 0, quantity: '', unit_cost: '' });
  }

  function handleRemoveSupplyItem(ingredientId: number) {
    setSupplyItems(supplyItems.filter(item => item.ingredient_id !== ingredientId));
  }

  async function handleCreateSupply() {
    if (supplyItems.length === 0) {
      showToast('Aggiungi almeno un ingrediente', 'warning');
      return;
    }

    try {
      await createSupply(
        {
          date: supplyForm.date,
          supplier_name: supplyForm.supplier_name || undefined,
          notes: supplyForm.notes || undefined,
        },
        supplyItems.map(item => ({
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        }))
      );

      showToast('Fornitura registrata con successo', 'success');
      setShowSupplyModal(false);
      setSupplyForm({
        date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        notes: '',
      });
      setSupplyItems([]);
      loadData();
    } catch (error) {
      console.error('Error creating supply:', error);
      showToast('Errore nella creazione fornitura', 'error');
    }
  }

  async function handleViewSupply(supply: Supply) {
    try {
      const items = await getSupplyItems(supply.id);
      setSelectedSupply(supply);
      setSelectedSupplyItems(items);
      setShowSupplyDetailModal(true);
    } catch (error) {
      console.error('Error loading supply items:', error);
      showToast('Errore nel caricamento dettagli', 'error');
    }
  }

  async function handleDeleteSupply(id: number) {
    if (!confirm('Sei sicuro di voler eliminare questa fornitura? Le quantità non verranno restituite all\'inventario.')) {
      return;
    }

    try {
      await deleteSupply(id);
      showToast('Fornitura eliminata', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting supply:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  // Calcola totale fornitura corrente (unit_cost è il costo totale per quell'ingrediente)
  const currentSupplyTotal = supplyItems.reduce((sum, item) => sum + item.unit_cost, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-dark-400 text-sm">Gestisci scorte e ottimizza riordini</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSupplyModal(true)} className="btn-primary btn-sm">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Nuova Fornitura</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary btn-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ingrediente</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Scorte
        </button>
        <button
          onClick={() => setActiveTab('supplies')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'supplies'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4 inline mr-2" />
          Forniture
          {supplies.length > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {supplies.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('eoq')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'eoq'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4 inline mr-2" />
          EOQ & Riordini
          {urgentReorders.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {urgentReorders.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Totale Ingredienti</p>
                  <p className="stat-value">{inventory.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Scorte Basse</p>
                  <p className="stat-value">{lowStock.length}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStock.length > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                  <AlertTriangle className={`w-6 h-6 ${lowStock.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Da Riordinare (7gg)</p>
                  <p className="stat-value">{urgentReorders.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStock.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <p className="font-semibold text-red-400">Attenzione: Scorte Basse</p>
                  <p className="text-sm text-dark-300">
                    {lowStock.map(i => i.ingredient_name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              Tutti ({inventory.length})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === 'low'
                  ? 'bg-red-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              Scorte Basse ({lowStock.length})
            </button>
          </div>

          {/* Inventory Table */}
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Quantità</th>
                    <th>Unità</th>
                    <th>Soglia</th>
                    <th>Stato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const isLow = item.quantity <= item.threshold;
                    return (
                      <tr key={item.id}>
                        <td>
                          <p className="font-medium text-white">{item.ingredient_name}</p>
                        </td>
                        <td>
                          <p className={`font-semibold ${isLow ? 'text-red-400' : 'text-white'}`}>
                            {item.quantity.toFixed(2)}
                          </p>
                        </td>
                        <td>
                          <p className="text-dark-300">{item.unit}</p>
                        </td>
                        <td>
                          <p className="text-dark-400">{item.threshold}</p>
                        </td>
                        <td>
                          <span className={isLow ? 'badge-danger' : 'badge-success'}>
                            {isLow ? 'Basso' : 'OK'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => openUpdateModal(item)}
                            className="btn-secondary btn-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Aggiorna
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'supplies' && (
        <>
          {/* Supplies Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Totale Forniture</p>
                  <p className="stat-value">{supplyStats?.suppliesCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Speso Totale</p>
                  <p className="stat-value">{supplyStats?.totalSpent.toFixed(2) || '0.00'} €</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Media Fornitura</p>
                  <p className="stat-value">{supplyStats?.avgSupplyCost.toFixed(2) || '0.00'} €</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Ingredienti</p>
                  <p className="stat-value">{ingredients.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Top Ingredients Purchased */}
          {supplyStats && supplyStats.topIngredients.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-white">Top Ingredienti Acquistati</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {supplyStats.topIngredients.map((ing, index) => (
                    <div key={index} className="bg-dark-900 rounded-lg p-3">
                      <p className="font-medium text-white text-sm truncate">{ing.ingredient_name}</p>
                      <p className="text-primary-400 font-semibold">{ing.total_cost.toFixed(2)} €</p>
                      <p className="text-dark-400 text-xs">Qty: {ing.quantity.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Supplies List */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-white">Storico Forniture</h2>
              <button onClick={() => setShowSupplyModal(true)} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                Nuova Fornitura
              </button>
            </div>
            {supplies.length === 0 ? (
              <div className="p-8 text-center">
                <Truck className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400">Nessuna fornitura registrata</p>
                <p className="text-dark-500 text-sm mt-1">
                  Clicca su "Nuova Fornitura" per registrare la prima
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Fornitore</th>
                      <th>Totale</th>
                      <th>Note</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplies.map((supply) => (
                      <tr key={supply.id}>
                        <td>
                          <p className="font-medium text-white">
                            {new Date(supply.date).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </td>
                        <td>
                          <p className="text-dark-300">
                            {supply.supplier_name || '-'}
                          </p>
                        </td>
                        <td>
                          <p className="font-semibold text-primary-400">
                            {supply.total_cost.toFixed(2)} €
                          </p>
                        </td>
                        <td>
                          <p className="text-dark-400 text-sm truncate max-w-[200px]">
                            {supply.notes || '-'}
                          </p>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewSupply(supply)}
                              className="btn-secondary btn-sm"
                              title="Visualizza dettagli"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupply(supply.id)}
                              className="btn-danger btn-sm"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'eoq' && (
        <>
          {/* EOQ Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="font-semibold text-blue-400 mb-2">Cos'è l'EOQ?</h3>
            <p className="text-sm text-dark-300">
              L'<strong>Economic Order Quantity</strong> (EOQ) è la quantità ottimale da ordinare
              che minimizza i costi totali (costo ordine + costo stoccaggio). Il sistema analizza
              i consumi storici per calcolare automaticamente quando e quanto riordinare.
            </p>
          </div>

          {/* Urgent Reorders */}
          {urgentReorders.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-amber-400">Da riordinare nei prossimi 7 giorni</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {urgentReorders.map((item) => (
                  <div key={item.ingredient_id} className="bg-dark-800 rounded-lg p-3">
                    <p className="font-medium text-white">{item.ingredient_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">
                        {item.days_until_reorder === 0 ? 'Oggi!' : `${item.days_until_reorder} giorni`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-dark-400">
                      <span>Ordina: {item.eoq.toFixed(1)}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="text-emerald-400">Risparmio ottimale</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EOQ Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-white">Analisi EOQ Ingredienti</h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Stock Attuale</th>
                    <th>Consumo/Giorno</th>
                    <th>EOQ</th>
                    <th>Punto Riordino</th>
                    <th>Giorni al Riordino</th>
                    <th>Ordini/Anno</th>
                  </tr>
                </thead>
                <tbody>
                  {eoqData.map((item) => {
                    const isUrgent = item.days_until_reorder < 7 && item.avg_daily_consumption > 0;
                    const noData = item.avg_daily_consumption === 0;

                    return (
                      <tr key={item.ingredient_id} className={isUrgent ? 'bg-amber-500/10' : ''}>
                        <td>
                          <p className="font-medium text-white">{item.ingredient_name}</p>
                        </td>
                        <td>
                          <p className={`font-semibold ${item.current_stock <= item.reorder_point ? 'text-red-400' : 'text-white'}`}>
                            {item.current_stock.toFixed(2)}
                          </p>
                        </td>
                        <td>
                          {noData ? (
                            <span className="text-dark-500 text-sm">Nessun dato</span>
                          ) : (
                            <p className="text-dark-300">{item.avg_daily_consumption.toFixed(3)}</p>
                          )}
                        </td>
                        <td>
                          {noData ? (
                            <span className="text-dark-500">-</span>
                          ) : (
                            <p className="text-primary-400 font-semibold">{item.eoq.toFixed(1)}</p>
                          )}
                        </td>
                        <td>
                          {noData ? (
                            <span className="text-dark-500">-</span>
                          ) : (
                            <p className="text-dark-300">{item.reorder_point.toFixed(1)}</p>
                          )}
                        </td>
                        <td>
                          {noData ? (
                            <span className="text-dark-500">-</span>
                          ) : item.days_until_reorder === Infinity ? (
                            <span className="badge-success">OK</span>
                          ) : (
                            <span className={`font-semibold ${item.days_until_reorder < 3 ? 'text-red-400' : item.days_until_reorder < 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {item.days_until_reorder} gg
                            </span>
                          )}
                        </td>
                        <td>
                          {noData ? (
                            <span className="text-dark-500">-</span>
                          ) : (
                            <p className="text-dark-400">{item.order_frequency.toFixed(1)}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* EOQ Legend */}
          <div className="bg-dark-800 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Legenda</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-dark-400"><strong className="text-white">EOQ</strong>: Quantità ottimale da ordinare</p>
                <p className="text-dark-400"><strong className="text-white">Punto Riordino</strong>: Stock al quale effettuare l'ordine</p>
              </div>
              <div>
                <p className="text-dark-400"><strong className="text-white">Scorta Sicurezza</strong>: Buffer per evitare stockout</p>
                <p className="text-dark-400"><strong className="text-white">Ordini/Anno</strong>: Frequenza ordini stimata</p>
              </div>
            </div>
            <p className="text-xs text-dark-500 mt-3">
              * I calcoli si basano sui consumi degli ultimi 30 giorni. Più ordini elabori, più precisi saranno i dati.
            </p>
          </div>
        </>
      )}

      {/* Add Ingredient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Aggiungi Ingrediente"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome Ingrediente *</label>
            <input
              type="text"
              value={ingredientForm.name}
              onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
              className="input"
              placeholder="Es. Carne Kebab"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unità di Misura</label>
              <select
                value={ingredientForm.unit}
                onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                className="select"
              >
                <option value="kg">Chilogrammi (kg)</option>
                <option value="g">Grammi (g)</option>
                <option value="lt">Litri (lt)</option>
                <option value="ml">Millilitri (ml)</option>
                <option value="pz">Pezzi (pz)</option>
              </select>
            </div>
            <div>
              <label className="label">Costo Unitario (€)</label>
              <input
                type="number"
                step="0.01"
                value={ingredientForm.cost}
                onChange={(e) => setIngredientForm({ ...ingredientForm, cost: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleAddIngredient} className="btn-primary flex-1">
              Aggiungi
            </button>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Quantity Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title={`Aggiorna ${selectedItem?.ingredient_name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-dark-900 rounded-xl p-4">
            <p className="text-sm text-dark-400">Quantità attuale</p>
            <p className="text-2xl font-bold text-white">
              {selectedItem?.quantity.toFixed(2)} {selectedItem?.unit}
            </p>
          </div>

          <div>
            <label className="label">Modalità</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUpdateMode('add')}
                className={`py-2 rounded-xl font-medium transition-all ${
                  updateMode === 'add'
                    ? 'bg-primary-500 text-dark-900'
                    : 'bg-dark-700 text-dark-300'
                }`}
              >
                Aggiungi
              </button>
              <button
                onClick={() => setUpdateMode('set')}
                className={`py-2 rounded-xl font-medium transition-all ${
                  updateMode === 'set'
                    ? 'bg-primary-500 text-dark-900'
                    : 'bg-dark-700 text-dark-300'
                }`}
              >
                Imposta
              </button>
            </div>
          </div>

          <div>
            <label className="label">
              {updateMode === 'add' ? 'Quantità da aggiungere' : 'Nuova quantità'}
            </label>
            <input
              type="number"
              step="0.01"
              value={updateQuantity}
              onChange={(e) => setUpdateQuantity(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </div>

          {updateMode === 'add' && updateQuantity && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
              <p className="text-sm text-emerald-400">
                Nuova quantità: {((selectedItem?.quantity || 0) + parseFloat(updateQuantity || '0')).toFixed(2)} {selectedItem?.unit}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleUpdateQuantity} className="btn-primary flex-1">
              Aggiorna
            </button>
            <button onClick={() => setShowUpdateModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* New Supply Modal */}
      <Modal
        isOpen={showSupplyModal}
        onClose={() => {
          setShowSupplyModal(false);
          setSupplyItems([]);
          setSupplyForm({ date: new Date().toISOString().split('T')[0], supplier_name: '', notes: '' });
        }}
        title="Nuova Fornitura"
        size="full"
      >
        <div className="space-y-4">
          {/* Supply Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Data Fornitura *</label>
              <input
                type="date"
                value={supplyForm.date}
                onChange={(e) => setSupplyForm({ ...supplyForm, date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Fornitore</label>
              <input
                type="text"
                value={supplyForm.supplier_name}
                onChange={(e) => setSupplyForm({ ...supplyForm, supplier_name: e.target.value })}
                className="input"
                placeholder="Es. Fornitore S.r.l."
              />
            </div>
          </div>

          <div>
            <label className="label">Note</label>
            <input
              type="text"
              value={supplyForm.notes}
              onChange={(e) => setSupplyForm({ ...supplyForm, notes: e.target.value })}
              className="input"
              placeholder="Note opzionali sulla fornitura"
            />
          </div>

          {/* Add Item Form */}
          <div className="border-t border-dark-700 pt-4">
            <h3 className="font-semibold text-white mb-3">Aggiungi Ingrediente</h3>
            <div className="space-y-3">
              {/* Ingrediente - sempre full width */}
              <div>
                <label className="label">Ingrediente</label>
                <select
                  value={newSupplyItem.ingredient_id}
                  onChange={(e) => {
                    const ing = ingredients.find(i => i.id === Number(e.target.value));
                    setNewSupplyItem({
                      ...newSupplyItem,
                      ingredient_id: Number(e.target.value),
                      unit_cost: ing?.cost?.toString() || '',
                    });
                  }}
                  className="select"
                >
                  <option value={0}>Seleziona ingrediente...</option>
                  {ingredients
                    .filter(ing => !supplyItems.some(si => si.ingredient_id === ing.id))
                    .map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                </select>
              </div>

              {/* Quantità e Costo su stessa riga + pulsante */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label">Quantità</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSupplyItem.quantity}
                    onChange={(e) => setNewSupplyItem({ ...newSupplyItem, quantity: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="label">Costo Totale (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSupplyItem.unit_cost}
                    onChange={(e) => setNewSupplyItem({ ...newSupplyItem, unit_cost: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={handleAddSupplyItem}
                  className="btn-primary h-[42px] px-4"
                  title="Aggiungi ingrediente"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          {supplyItems.length > 0 && (
            <div className="border-t border-dark-700 pt-4">
              <h3 className="font-semibold text-white mb-3">Ingredienti nella Fornitura</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {supplyItems.map((item) => (
                  <div
                    key={item.ingredient_id}
                    className="flex items-center justify-between bg-dark-900 rounded-lg px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.ingredient_name}</p>
                      <p className="text-sm text-dark-400">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-primary-400">
                        {item.unit_cost.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleRemoveSupplyItem(item.ingredient_id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
                <p className="font-semibold text-white">Totale Fornitura</p>
                <p className="text-2xl font-bold text-primary-400">
                  {currentSupplyTotal.toFixed(2)} €
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
            <button
              onClick={handleCreateSupply}
              disabled={supplyItems.length === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="w-4 h-4" />
              Registra Fornitura
            </button>
            <button
              onClick={() => {
                setShowSupplyModal(false);
                setSupplyItems([]);
                setSupplyForm({ date: new Date().toISOString().split('T')[0], supplier_name: '', notes: '' });
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
            <p className="text-sm text-blue-400">
              <strong>Nota:</strong> Quando registri una fornitura, le quantità vengono automaticamente
              aggiunte all'inventario e i costi degli ingredienti vengono aggiornati.
            </p>
          </div>
        </div>
      </Modal>

      {/* Supply Detail Modal */}
      <Modal
        isOpen={showSupplyDetailModal}
        onClose={() => {
          setShowSupplyDetailModal(false);
          setSelectedSupply(null);
          setSelectedSupplyItems([]);
        }}
        title="Dettaglio Fornitura"
        size="md"
      >
        {selectedSupply && (
          <div className="space-y-4">
            {/* Supply Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-900 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Data</p>
                <p className="font-semibold text-white">
                  {new Date(selectedSupply.date).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="bg-dark-900 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Fornitore</p>
                <p className="font-semibold text-white">
                  {selectedSupply.supplier_name || 'Non specificato'}
                </p>
              </div>
            </div>

            {selectedSupply.notes && (
              <div className="bg-dark-900 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Note</p>
                <p className="text-white">{selectedSupply.notes}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="font-semibold text-white mb-3">Articoli</h3>
              <div className="space-y-2">
                {selectedSupplyItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-dark-900 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{item.ingredient_name}</p>
                      <p className="text-sm text-dark-400">
                        {item.quantity} {item.unit} x {item.unit_cost.toFixed(2)} €/{item.unit}
                      </p>
                    </div>
                    <p className="font-semibold text-primary-400">
                      {(item.total_cost || item.quantity * item.unit_cost).toFixed(2)} €
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <p className="font-semibold text-white text-lg">Totale</p>
              <p className="text-2xl font-bold text-primary-400">
                {selectedSupply.total_cost.toFixed(2)} €
              </p>
            </div>

            {/* Close Button */}
            <div className="pt-4 border-t border-dark-700">
              <button
                onClick={() => {
                  setShowSupplyDetailModal(false);
                  setSelectedSupply(null);
                  setSelectedSupplyItems([]);
                }}
                className="btn-secondary w-full"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
