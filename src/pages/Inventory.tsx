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
  Settings,
  DollarSign,
  Bell,
} from 'lucide-react';
import {
  getInventory,
  createIngredient,
  updateInventoryQuantity,
  updateIngredientCost,
  getLowStockItems,
  calculateEOQ,
  getIngredients,
  getSupplies,
  getSupplyItems,
  createSupply,
  deleteSupply,
  getSupplyStats,
  getInventorySettings,
  updateInventorySettings,
  createInvoice,
  updateInventoryThresholdMode,
  updateInventoryThreshold,
  deleteIngredient,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { Modal } from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';
import type { InventoryItem, EOQResult, Ingredient, Supply, SupplyItem, InventorySettings, CostCalculationMethod } from '../types';

// Interfaccia per item temporanei nella creazione fornitura
interface TempSupplyItem {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
}

export function Inventory() {
  useLanguage(); // Ready for translations
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
    createAsInvoice: false, // Toggle per creare automaticamente fattura
  });
  const [supplyItems, setSupplyItems] = useState<TempSupplyItem[]>([]);
  const [newSupplyItem, setNewSupplyItem] = useState({
    ingredient_id: 0,
    quantity: '',
    unit_cost: '',
  });

  // Inventory settings state
  const [inventorySettings, setInventorySettings] = useState<InventorySettings>({
    cost_calculation_method: 'fixed',
    moving_avg_months: 3,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modifica costo unitario
  const [showCostModal, setShowCostModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [newCost, setNewCost] = useState('');

  // Modifica soglia scorta
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [selectedThresholdItem, setSelectedThresholdItem] = useState<InventoryItem | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const [thresholdMode, setThresholdMode] = useState<'manual' | 'eoq'>('manual');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [inv, low, eoq, ing, sup, stats, invSettings] = await Promise.all([
        getInventory(),
        getLowStockItems(),
        calculateEOQ(),
        getIngredients(),
        getSupplies(),
        getSupplyStats(),
        getInventorySettings(),
      ]);
      setInventory(inv);
      setLowStock(low);
      setEoqData(eoq);
      setIngredients(ing);
      setSupplies(sup);
      setSupplyStats(stats);
      setInventorySettings(invSettings);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Realtime refresh
  useRealtimeRefresh(loadData);

  async function handleSaveSettings() {
    try {
      await updateInventorySettings(inventorySettings);
      showToast('Impostazioni salvate', 'success');
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  const costMethodLabels: Record<CostCalculationMethod, string> = {
    fixed: 'Costo Fisso',
    last: 'Ultimo Costo',
    weighted_avg: 'Media Ponderata',
    moving_avg: 'Media Mobile',
  };

  const costMethodDescriptions: Record<CostCalculationMethod, string> = {
    fixed: 'Il costo unitario non cambia mai automaticamente. Devi aggiornarlo manualmente.',
    last: 'Il costo unitario viene aggiornato con il costo dell\'ultima fornitura.',
    weighted_avg: 'Il costo viene calcolato come media ponderata tra stock esistente e nuova fornitura.',
    moving_avg: 'Il costo viene calcolato come media delle forniture degli ultimi N mesi.',
  };

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

  function openCostModal(item: InventoryItem) {
    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
    if (ingredient) {
      setSelectedIngredient(ingredient);
      setNewCost(ingredient.cost.toString());
      setShowCostModal(true);
    }
  }

  async function handleUpdateCost() {
    if (!selectedIngredient || !newCost) return;

    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost < 0) {
      showToast('Inserisci un costo valido', 'warning');
      return;
    }

    try {
      await updateIngredientCost(selectedIngredient.id, cost);
      showToast('Costo aggiornato con successo', 'success');
      setShowCostModal(false);
      setSelectedIngredient(null);
      setNewCost('');
      loadData();
    } catch (error) {
      console.error('Error updating cost:', error);
      showToast('Errore nell\'aggiornamento del costo', 'error');
    }
  }

  function openThresholdModal(item: InventoryItem) {
    setSelectedThresholdItem(item);
    setThresholdValue(item.threshold.toString());
    setThresholdMode(item.threshold_mode || 'manual');
    // Cerca il valore EOQ per questo ingrediente
    const eoqItem = eoqData.find(e => e.ingredient_id === item.ingredient_id);
    if (eoqItem && item.threshold_mode === 'eoq') {
      // Se è in modalità EOQ, mostra il reorder_point
      setThresholdValue(eoqItem.reorder_point.toString());
    }
    setShowThresholdModal(true);
  }

  async function handleUpdateThreshold() {
    if (!selectedThresholdItem) return;

    try {
      if (thresholdMode === 'manual') {
        const threshold = parseFloat(thresholdValue);
        if (isNaN(threshold) || threshold < 0) {
          showToast('Inserisci una soglia valida', 'warning');
          return;
        }
        await updateInventoryThreshold(selectedThresholdItem.ingredient_id, threshold);
        await updateInventoryThresholdMode(selectedThresholdItem.ingredient_id, 'manual');
      } else {
        // Modalità EOQ - usa il reorder_point calcolato
        const eoqItem = eoqData.find(e => e.ingredient_id === selectedThresholdItem.ingredient_id);
        if (!eoqItem || eoqItem.reorder_point === 0) {
          showToast('EOQ non disponibile: servono più dati di consumo', 'warning');
          return;
        }
        await updateInventoryThresholdMode(
          selectedThresholdItem.ingredient_id,
          'eoq',
          eoqItem.reorder_point
        );
      }

      showToast('Soglia scorta aggiornata', 'success');
      setShowThresholdModal(false);
      setSelectedThresholdItem(null);
      loadData();
    } catch (error) {
      console.error('Error updating threshold:', error);
      showToast('Errore nell\'aggiornamento della soglia', 'error');
    }
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

    const qty = parseFloat(updateQuantity);
    if (isNaN(qty) || qty < 0) {
      showToast('Inserisci un valore numerico valido', 'warning');
      return;
    }

    try {
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

      // Se l'utente ha scelto di creare automaticamente la fattura
      if (supplyForm.createAsInvoice) {
        const totalAmount = supplyItems.reduce((sum, item) => sum + item.unit_cost, 0);
        const description = supplyItems.map(item => `${item.ingredient_name} (${item.quantity} ${item.unit})`).join(', ');

        // Genera numero fattura automatico
        const today = new Date();
        const invoiceNumber = `FORN-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

        await createInvoice({
          date: supplyForm.date,
          invoice_number: invoiceNumber,
          supplier_name: supplyForm.supplier_name || 'Fornitore',
          description: description.length > 200 ? description.substring(0, 197) + '...' : description,
          amount: totalAmount,
          vat_amount: 0, // L'IVA può essere modificata successivamente in Reports
          total: totalAmount,
          category: 'supplies',
          paid: false,
          notes: supplyForm.notes || 'Fattura generata automaticamente da fornitura inventario',
        });

        showToast('Fornitura registrata e fattura creata', 'success');
      } else {
        showToast('Fornitura registrata con successo', 'success');
      }

      setShowSupplyModal(false);
      setSupplyForm({
        date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        notes: '',
        createAsInvoice: false,
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
    if (!confirm('Sei sicuro di voler eliminare questa fornitura? Le quantità verranno sottratte dall\'inventario.')) {
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
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Inventario</h1>
          <p className="text-dark-400 text-xs sm:text-sm">Gestisci scorte e ottimizza riordini</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary btn-sm p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSupplyModal(true)} className="btn-primary btn-sm text-xs sm:text-sm">
            <Truck className="w-4 h-4" />
            Fornitura
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary btn-sm text-xs sm:text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ingrediente</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-dark-700 pb-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3 sm:px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm ${
            activeTab === 'inventory'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4 inline mr-1 sm:mr-2" />
          Scorte
        </button>
        <button
          onClick={() => setActiveTab('supplies')}
          className={`px-3 sm:px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm ${
            activeTab === 'supplies'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4 inline mr-1 sm:mr-2" />
          Forniture
          {supplies.length > 0 && (
            <span className="ml-1 sm:ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {supplies.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('eoq')}
          className={`px-3 sm:px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm ${
            activeTab === 'eoq'
              ? 'bg-dark-800 text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4 inline mr-1 sm:mr-2" />
          <span className="hidden sm:inline">EOQ & </span>Riordini
          {urgentReorders.length > 0 && (
            <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {urgentReorders.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Tot. Ingredienti</p>
                  <p className="stat-value text-lg sm:text-2xl">{inventory.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Scorte Basse</p>
                  <p className="stat-value text-lg sm:text-2xl">{lowStock.length}</p>
                </div>
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${lowStock.length > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                  <AlertTriangle className={`w-4 h-4 sm:w-6 sm:h-6 ${lowStock.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Riordina (7gg)</p>
                  <p className="stat-value text-lg sm:text-2xl">{urgentReorders.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStock.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-red-400 text-sm sm:text-base">Attenzione: Scorte Basse</p>
                  <p className="text-xs sm:text-sm text-dark-300 truncate">
                    {lowStock.map(i => i.ingredient_name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              Tutti ({inventory.length})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                filter === 'low'
                  ? 'bg-red-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              Scorte Basse ({lowStock.length})
            </button>
          </div>

          {/* Inventory - Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {filteredInventory.map((item) => {
              const isLow = item.quantity <= item.threshold;
              return (
                <div key={item.id} className="card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-white text-sm">{item.ingredient_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {isLow ? 'Basso' : 'OK'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${isLow ? 'text-red-400' : 'text-white'}`}>
                        {item.quantity.toFixed(2)} {item.unit}
                      </span>
                      <span className="text-dark-500 text-xs">
                        Soglia: {item.threshold} {item.threshold_mode === 'eoq' && <span className="text-primary-400">(EOQ)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openUpdateModal(item)}
                        className="p-2 bg-dark-700 rounded-lg"
                        title="Aggiorna quantità"
                      >
                        <Edit2 className="w-4 h-4 text-dark-300" />
                      </button>
                      <button
                        onClick={() => openCostModal(item)}
                        className="p-2 bg-dark-700 rounded-lg"
                        title="Modifica costo"
                      >
                        <DollarSign className="w-4 h-4 text-dark-300" />
                      </button>
                      <button
                        onClick={() => openThresholdModal(item)}
                        className={`p-2 bg-dark-700 rounded-lg ${item.threshold_mode === 'eoq' ? 'ring-1 ring-primary-500' : ''}`}
                        title="Soglia scorta"
                      >
                        <Bell className={`w-4 h-4 ${item.threshold_mode === 'eoq' ? 'text-primary-400' : 'text-dark-300'}`} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Eliminare ${item.ingredient_name}?`)) {
                            deleteIngredient(item.id).then(() => {
                              loadData();
                              showToast('Ingrediente eliminato', 'success');
                            }).catch((error) => {
                              console.error('Errore eliminazione:', error);
                              showToast('Errore nell\'eliminazione', 'error');
                            });
                          }
                        }}
                        className="p-2 bg-red-500/20 rounded-lg"
                        title="Elimina ingrediente"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inventory Table - Desktop */}
          <div className="card hidden sm:block">
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openUpdateModal(item)}
                              className="btn-secondary btn-sm"
                              title="Aggiorna quantità"
                            >
                              <Edit2 className="w-4 h-4" />
                              Qtà
                            </button>
                            <button
                              onClick={() => openCostModal(item)}
                              className="btn-ghost btn-sm"
                              title="Modifica costo unitario"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openThresholdModal(item)}
                              className={`btn-ghost btn-sm ${item.threshold_mode === 'eoq' ? 'text-primary-400' : ''}`}
                              title={`Soglia scorta (${item.threshold_mode === 'eoq' ? 'EOQ' : 'Manuale'})`}
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Eliminare ${item.ingredient_name}?`)) {
                                  deleteIngredient(item.id).then(() => {
                                    loadData();
                                    showToast('Ingrediente eliminato', 'success');
                                  }).catch((error) => {
                                    console.error('Errore eliminazione:', error);
                                    showToast('Errore nell\'eliminazione', 'error');
                                  });
                                }
                              }}
                              className="btn-danger btn-sm"
                              title="Elimina ingrediente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Tot. Forniture</p>
                  <p className="stat-value text-lg sm:text-2xl">{supplyStats?.suppliesCount || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Speso Totale</p>
                  <p className="stat-value text-lg sm:text-2xl">€{supplyStats?.totalSpent.toFixed(0) || '0'}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Media Fornitura</p>
                  <p className="stat-value text-lg sm:text-2xl">€{supplyStats?.avgSupplyCost.toFixed(0) || '0'}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label text-xs sm:text-sm">Ingredienti</p>
                  <p className="stat-value text-lg sm:text-2xl">{ingredients.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Top Ingredients Purchased */}
          {supplyStats && supplyStats.topIngredients.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-white text-sm sm:text-base">Top Ingredienti Acquistati</h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                  {supplyStats.topIngredients.map((ing, index) => (
                    <div key={index} className="bg-dark-900 rounded-lg p-2 sm:p-3">
                      <p className="font-medium text-white text-xs sm:text-sm truncate">{ing.ingredient_name}</p>
                      <p className="text-primary-400 font-semibold text-sm sm:text-base">€{ing.total_cost.toFixed(2)}</p>
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
              <h2 className="font-semibold text-white text-sm sm:text-base">Storico Forniture</h2>
              <button onClick={() => setShowSupplyModal(true)} className="btn-primary btn-sm text-xs sm:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuova</span> Fornitura
              </button>
            </div>
            {supplies.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Truck className="w-10 h-10 sm:w-12 sm:h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400 text-sm sm:text-base">Nessuna fornitura registrata</p>
                <p className="text-dark-500 text-xs sm:text-sm mt-1">
                  Clicca su "Nuova Fornitura" per registrare la prima
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-dark-700">
                  {supplies.map((supply) => (
                    <div key={supply.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-white text-sm">
                          {new Date(supply.date).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="font-semibold text-primary-400">€{supply.total_cost.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-dark-400 text-xs truncate">{supply.supplier_name || 'Fornitore non spec.'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewSupply(supply)}
                            className="p-2 bg-dark-700 rounded-lg"
                            title="Visualizza"
                          >
                            <Eye className="w-4 h-4 text-dark-300" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupply(supply.id)}
                            className="p-2 bg-red-500/20 rounded-lg"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="table-container hidden sm:block">
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
                              €{supply.total_cost.toFixed(2)}
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
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'eoq' && (
        <>
          {/* Cost Settings Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Calcolo Costo Unitario Ingredienti</h3>
                  <p className="text-sm text-dark-400">
                    Metodo: <span className="text-primary-400">{costMethodLabels[inventorySettings.cost_calculation_method]}</span>
                    {inventorySettings.cost_calculation_method === 'moving_avg' && (
                      <span className="text-dark-500"> ({inventorySettings.moving_avg_months} mesi)</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configura
              </button>
            </div>
          </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-3">
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
          setSupplyForm({ date: new Date().toISOString().split('T')[0], supplier_name: '', notes: '', createAsInvoice: false });
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
                setSupplyForm({ date: new Date().toISOString().split('T')[0], supplier_name: '', notes: '', createAsInvoice: false });
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>

          {/* Toggle Crea Fattura */}
          <div className="bg-dark-900 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={supplyForm.createAsInvoice}
                onChange={(e) => setSupplyForm({ ...supplyForm, createAsInvoice: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="font-medium text-white">Crea fattura automaticamente</span>
                <p className="text-xs text-dark-400 mt-0.5">
                  Aggiunge questa fornitura come fattura nella sezione Ammin. & Report
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
            <p className="text-sm text-blue-400">
              <strong>Nota:</strong> Quando registri una fornitura, le quantità vengono automaticamente
              aggiunte all'inventario e i costi degli ingredienti vengono aggiornati.
              {supplyForm.createAsInvoice && (
                <span className="block mt-1">
                  Una fattura con categoria "Forniture" verrà creata automaticamente. Potrai modificare l'IVA e altri dettagli in seguito.
                </span>
              )}
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
                        {item.quantity} {item.unit} × {(item.unit_cost / item.quantity).toFixed(2)} €/{item.unit}
                      </p>
                    </div>
                    <p className="font-semibold text-primary-400">
                      {item.unit_cost.toFixed(2)} €
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

      {/* Inventory Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Impostazioni Costo Ingredienti"
        size="xl"
      >
        <div className="space-y-6">
          {/* Method Selection */}
          <div>
            <label className="label">Metodo di Calcolo del Costo Unitario</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['fixed', 'last', 'weighted_avg', 'moving_avg'] as CostCalculationMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setInventorySettings({ ...inventorySettings, cost_calculation_method: method })}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    inventorySettings.cost_calculation_method === method
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      inventorySettings.cost_calculation_method === method ? 'text-primary-400' : 'text-white'
                    }`}>
                      {costMethodLabels[method]}
                    </span>
                    {inventorySettings.cost_calculation_method === method && (
                      <span className="text-primary-400 text-sm">✓</span>
                    )}
                  </div>
                  <p className="text-sm text-dark-400 mt-1">
                    {costMethodDescriptions[method]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Moving Average Months - Only shown when moving_avg is selected */}
          {inventorySettings.cost_calculation_method === 'moving_avg' && (
            <div className="bg-dark-900 rounded-xl p-4">
              <label className="label">Periodo Media Mobile</label>
              <p className="text-sm text-dark-400 mb-3">
                Seleziona il numero di mesi da considerare per la media mobile (ultimi forniture nell'ultimo anno)
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={inventorySettings.moving_avg_months}
                  onChange={(e) => setInventorySettings({
                    ...inventorySettings,
                    moving_avg_months: parseInt(e.target.value)
                  })}
                  className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="bg-dark-800 px-4 py-2 rounded-lg min-w-[80px] text-center">
                  <span className="text-xl font-bold text-primary-400">{inventorySettings.moving_avg_months}</span>
                  <span className="text-dark-400 text-sm ml-1">mesi</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-dark-500 mt-2">
                <span>1 mese</span>
                <span>6 mesi</span>
                <span>12 mesi</span>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-sm text-blue-400">
              <strong>Nota:</strong> Il metodo selezionato verrà applicato automaticamente quando registri nuove forniture.
              I costi esistenti non verranno ricalcolati retroattivamente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
            <button onClick={handleSaveSettings} className="btn-primary flex-1">
              Salva Impostazioni
            </button>
            <button onClick={() => setShowSettingsModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Threshold Modal */}
      <Modal
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        title={`Soglia Scorta - ${selectedThresholdItem?.ingredient_name}`}
        size="sm"
      >
        <div className="space-y-4">
          {/* Stato attuale */}
          <div className="bg-dark-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400">Quantità attuale:</span>
              <span className="text-white font-semibold">
                {selectedThresholdItem?.quantity.toFixed(2)} {selectedThresholdItem?.unit}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Soglia attuale:</span>
              <span className={`font-semibold ${selectedThresholdItem?.threshold_mode === 'eoq' ? 'text-primary-400' : 'text-amber-400'}`}>
                {selectedThresholdItem?.threshold.toFixed(2)} {selectedThresholdItem?.unit}
                <span className="text-xs ml-1">
                  ({selectedThresholdItem?.threshold_mode === 'eoq' ? 'EOQ' : 'Manuale'})
                </span>
              </span>
            </div>
          </div>

          {/* Selezione modalità */}
          <div>
            <label className="label">Modalità Soglia</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setThresholdMode('manual');
                  setThresholdValue(selectedThresholdItem?.threshold.toString() || '10');
                }}
                className={`p-3 rounded-xl border-2 transition-all ${
                  thresholdMode === 'manual'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <Edit2 className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <div className="text-sm font-medium">Manuale</div>
                <div className="text-xs text-dark-400">Imposti tu</div>
              </button>
              <button
                onClick={() => {
                  setThresholdMode('eoq');
                  const eoqItem = eoqData.find(e => e.ingredient_id === selectedThresholdItem?.ingredient_id);
                  if (eoqItem) {
                    setThresholdValue(eoqItem.reorder_point.toString());
                  }
                }}
                className={`p-3 rounded-xl border-2 transition-all ${
                  thresholdMode === 'eoq'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <Calculator className="w-5 h-5 mx-auto mb-1 text-primary-400" />
                <div className="text-sm font-medium">EOQ</div>
                <div className="text-xs text-dark-400">Auto-calcolata</div>
              </button>
            </div>
          </div>

          {/* Input soglia manuale */}
          {thresholdMode === 'manual' && (
            <div>
              <label className="label">Soglia Scorta ({selectedThresholdItem?.unit})</label>
              <input
                type="text"
                inputMode="decimal"
                value={thresholdValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setThresholdValue(val);
                  }
                }}
                className="input"
                placeholder="10"
              />
              <p className="text-xs text-dark-500 mt-1">
                Riceverai un avviso quando la quantità scende sotto questa soglia
              </p>
            </div>
          )}

          {/* Info EOQ */}
          {thresholdMode === 'eoq' && (
            <div className="space-y-3">
              {(() => {
                const eoqItem = eoqData.find(e => e.ingredient_id === selectedThresholdItem?.ingredient_id);
                if (!eoqItem || eoqItem.reorder_point === 0) {
                  return (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                      <p className="text-sm text-amber-400">
                        <strong>EOQ non disponibile</strong><br />
                        Servono più dati di consumo e ordini per calcolare automaticamente la soglia ottimale.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400 text-sm">Punto di riordino:</span>
                      <span className="text-primary-400 font-bold">
                        {eoqItem.reorder_point.toFixed(2)} {selectedThresholdItem?.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400 text-sm">Scorta sicurezza:</span>
                      <span className="text-white">
                        {eoqItem.safety_stock.toFixed(2)} {selectedThresholdItem?.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400 text-sm">Consumo medio/giorno:</span>
                      <span className="text-white">
                        {eoqItem.avg_daily_consumption.toFixed(2)} {selectedThresholdItem?.unit}
                      </span>
                    </div>
                    <p className="text-xs text-primary-300 pt-2 border-t border-primary-500/30">
                      La soglia verrà aggiornata automaticamente in base ai consumi
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
            <button
              onClick={handleUpdateThreshold}
              className="btn-primary flex-1"
              disabled={thresholdMode === 'eoq' && !eoqData.find(e => e.ingredient_id === selectedThresholdItem?.ingredient_id)?.reorder_point}
            >
              Salva
            </button>
            <button
              onClick={() => setShowThresholdModal(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Cost Update Modal */}
      <Modal
        isOpen={showCostModal}
        onClose={() => setShowCostModal(false)}
        title={`Modifica Costo - ${selectedIngredient?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-dark-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-dark-400">Costo attuale:</span>
              <span className="text-white font-semibold">
                €{selectedIngredient?.cost.toFixed(2)}/{selectedIngredient?.unit}
              </span>
            </div>
            <div>
              <label className="label">Nuovo Costo Unitario (€/{selectedIngredient?.unit})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-sm text-amber-400">
              <strong>Attenzione:</strong> Questa modifica influenzerà il calcolo del costo dei piatti che utilizzano questo ingrediente.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
            <button
              onClick={handleUpdateCost}
              className="btn-primary flex-1"
            >
              Conferma Modifica
            </button>
            <button
              onClick={() => setShowCostModal(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
