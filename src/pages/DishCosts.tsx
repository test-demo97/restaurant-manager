import { useEffect, useState } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChefHat,
  DollarSign,
  Percent,
  Eye,
  RefreshCw,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import {
  getDishCostsAndSummary,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';
import type { DishCost, MenuItem } from '../types';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

export function DishCosts() {
  useLanguage(); // Ready for translations
  const [loading, setLoading] = useState(true);
  const [dishCosts, setDishCosts] = useState<DishCost[]>([]);
  const [summary, setSummary] = useState<{
    totalDishes: number;
    avgProfitMargin: number;
    highMarginDishes: DishCost[];
    lowMarginDishes: DishCost[];
    dishesWithoutRecipe: MenuItem[];
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'margin' | 'cost'>('margin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDish, setSelectedDish] = useState<DishCost | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Singola chiamata ottimizzata (3 query invece di 120+)
      const { costs, summary: summaryData } = await getDishCostsAndSummary();
      setDishCosts(costs);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading dish costs:', error);
      showToast('Errore nel caricamento costi', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Realtime refresh
  useRealtimeRefresh(loadData);

  const filteredAndSortedCosts = dishCosts
    .filter(dish =>
      dish.menu_item_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.menu_item_name.localeCompare(b.menu_item_name);
          break;
        case 'margin':
          comparison = a.profit_margin_percent - b.profit_margin_percent;
          break;
        case 'cost':
          comparison = a.ingredient_cost - b.ingredient_cost;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  function getMarginColor(margin: number): string {
    if (margin >= 70) return 'text-emerald-400';
    if (margin >= 50) return 'text-primary-400';
    if (margin >= 30) return 'text-amber-400';
    return 'text-red-400';
  }

  function getMarginBgColor(margin: number): string {
    if (margin >= 70) return 'bg-emerald-500/20';
    if (margin >= 50) return 'bg-primary-500/20';
    if (margin >= 30) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  }

  async function handleViewDetail(dishCost: DishCost) {
    setSelectedDish(dishCost);
    setShowDetailModal(true);
  }

  function toggleSort(field: 'name' | 'margin' | 'cost') {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Costo Piatti</h1>
          <p className="text-dark-400 mt-1 text-sm sm:text-base">Analisi costi e margini di profitto</p>
        </div>
        <button onClick={loadData} className="btn-secondary self-start sm:self-auto">
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="sm:inline">Aggiorna</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="stat-label text-xs sm:text-sm">Piatti Totali</p>
              <p className="stat-value text-xl sm:text-2xl">{summary?.totalDishes || 0}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card glow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="stat-label text-xs sm:text-sm">Margine Medio</p>
              <p className={`stat-value text-xl sm:text-2xl ${getMarginColor(summary?.avgProfitMargin || 0)}`}>
                {summary?.avgProfitMargin || 0}%
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Percent className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="stat-label text-xs sm:text-sm truncate">Alto Margine</p>
              <p className="stat-value text-xl sm:text-2xl text-emerald-400">
                {summary?.highMarginDishes.length || 0}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="stat-label text-xs sm:text-sm truncate">Basso Margine</p>
              <p className="stat-value text-xl sm:text-2xl text-red-400">
                {summary?.lowMarginDishes.length || 0}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Warning for dishes without recipe */}
      {summary && summary.dishesWithoutRecipe.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-400">Piatti senza ricetta</h3>
              <p className="text-sm text-dark-300 mt-1">
                I seguenti piatti non hanno ingredienti associati, quindi il costo non può essere calcolato:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {summary.dishesWithoutRecipe.map((dish) => (
                  <span
                    key={dish.id}
                    className="px-2 py-1 bg-dark-700 rounded text-sm text-dark-300"
                  >
                    {dish.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-dark-500 mt-2">
                Vai alla sezione Ricette per associare gli ingredienti.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca piatto..."
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            onClick={() => toggleSort('name')}
            className={`px-3 py-1.5 sm:py-2 rounded-lg text-sm transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              sortBy === 'name' ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            Nome
            {sortBy === 'name' && <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
          <button
            onClick={() => toggleSort('margin')}
            className={`px-3 py-1.5 sm:py-2 rounded-lg text-sm transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              sortBy === 'margin' ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            Margine
            {sortBy === 'margin' && <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
          <button
            onClick={() => toggleSort('cost')}
            className={`px-3 py-1.5 sm:py-2 rounded-lg text-sm transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              sortBy === 'cost' ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            Costo
            {sortBy === 'cost' && <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* Dish Costs - Cards on mobile, Table on desktop */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            Analisi Costi ({filteredAndSortedCosts.length} piatti)
          </h2>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-dark-700">
          {filteredAndSortedCosts.map((dish) => (
            <div key={dish.menu_item_id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg ${getMarginBgColor(dish.profit_margin_percent)} flex items-center justify-center flex-shrink-0`}>
                    <ChefHat className={`w-5 h-5 ${getMarginColor(dish.profit_margin_percent)}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{dish.menu_item_name}</p>
                    <p className="text-xs text-dark-500">{dish.ingredients.length} ingredienti</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-bold ${getMarginBgColor(dish.profit_margin_percent)} ${getMarginColor(dish.profit_margin_percent)} flex-shrink-0`}>
                  {dish.profit_margin_percent}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-dark-900 rounded-lg p-2">
                  <p className="text-[10px] text-dark-500 uppercase">Prezzo</p>
                  <p className="text-sm font-semibold text-white">{dish.selling_price.toFixed(2)}€</p>
                </div>
                <div className="bg-dark-900 rounded-lg p-2">
                  <p className="text-[10px] text-dark-500 uppercase">Costo</p>
                  <p className="text-sm font-semibold text-dark-300">{dish.ingredient_cost.toFixed(2)}€</p>
                </div>
                <div className="bg-dark-900 rounded-lg p-2">
                  <p className="text-[10px] text-dark-500 uppercase">Profitto</p>
                  <p className={`text-sm font-semibold ${dish.profit_margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {dish.profit_margin.toFixed(2)}€
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleViewDetail(dish)}
                className="w-full py-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors flex items-center justify-center gap-2 text-sm text-dark-300"
              >
                <Eye className="w-4 h-4" />
                Vedi dettaglio
              </button>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-dark-400 font-medium">Piatto</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium">Prezzo</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium">Costo</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium">Profitto</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium">Margine</th>
                <th className="text-center py-3 px-4 text-dark-400 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {filteredAndSortedCosts.map((dish) => (
                <tr key={dish.menu_item_id} className="hover:bg-dark-900/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${getMarginBgColor(dish.profit_margin_percent)} flex items-center justify-center`}>
                        <ChefHat className={`w-5 h-5 ${getMarginColor(dish.profit_margin_percent)}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{dish.menu_item_name}</p>
                        <p className="text-xs text-dark-500">{dish.ingredients.length} ingredienti</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-semibold text-white">{dish.selling_price.toFixed(2)} EUR</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-dark-300">{dish.ingredient_cost.toFixed(2)} EUR</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-semibold ${dish.profit_margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {dish.profit_margin.toFixed(2)} EUR
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${getMarginBgColor(dish.profit_margin_percent)} ${getMarginColor(dish.profit_margin_percent)}`}>
                      {dish.profit_margin_percent}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleViewDetail(dish)}
                      className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                      title="Vedi dettaglio"
                    >
                      <Eye className="w-4 h-4 text-dark-300" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Margin Dishes */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Migliori Margini
            </h3>
          </div>
          <div className="divide-y divide-dark-700">
            {summary?.highMarginDishes.slice(0, 5).map((dish) => (
              <div key={dish.menu_item_id} className="flex items-center justify-between p-3">
                <span className="text-white">{dish.menu_item_name}</span>
                <span className="font-bold text-emerald-400">{dish.profit_margin_percent}%</span>
              </div>
            ))}
            {(!summary?.highMarginDishes || summary.highMarginDishes.length === 0) && (
              <p className="p-4 text-center text-dark-400">Nessun piatto con margine &gt;60%</p>
            )}
          </div>
        </div>

        {/* Low Margin Dishes */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Da Migliorare
            </h3>
          </div>
          <div className="divide-y divide-dark-700">
            {summary?.lowMarginDishes.slice(0, 5).map((dish) => (
              <div key={dish.menu_item_id} className="flex items-center justify-between p-3">
                <span className="text-white">{dish.menu_item_name}</span>
                <span className="font-bold text-red-400">{dish.profit_margin_percent}%</span>
              </div>
            ))}
            {(!summary?.lowMarginDishes || summary.lowMarginDishes.length === 0) && (
              <p className="p-4 text-center text-dark-400">Nessun piatto con margine &lt;40%</p>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Dettaglio: ${selectedDish?.menu_item_name}`}
        size="lg"
      >
        {selectedDish && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-sm">Prezzo Vendita</p>
                <p className="text-xl font-bold text-white">{selectedDish.selling_price.toFixed(2)} EUR</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-sm">Costo Ingredienti</p>
                <p className="text-xl font-bold text-amber-400">{selectedDish.ingredient_cost.toFixed(2)} EUR</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-sm">Profitto</p>
                <p className={`text-xl font-bold ${selectedDish.profit_margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedDish.profit_margin.toFixed(2)} EUR
                </p>
              </div>
              <div className={`${getMarginBgColor(selectedDish.profit_margin_percent)} rounded-xl p-4 text-center`}>
                <p className="text-dark-300 text-sm">Margine</p>
                <p className={`text-xl font-bold ${getMarginColor(selectedDish.profit_margin_percent)}`}>
                  {selectedDish.profit_margin_percent}%
                </p>
              </div>
            </div>

            {/* Ingredients Breakdown */}
            <div>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Dettaglio Ingredienti
              </h4>
              <div className="bg-dark-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-2 px-4 text-dark-400 text-sm">Ingrediente</th>
                      <th className="text-right py-2 px-4 text-dark-400 text-sm">Quantità</th>
                      <th className="text-right py-2 px-4 text-dark-400 text-sm">Costo/Unità</th>
                      <th className="text-right py-2 px-4 text-dark-400 text-sm">Totale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {selectedDish.ingredients.map((ing) => (
                      <tr key={ing.ingredient_id}>
                        <td className="py-2 px-4 text-white">{ing.ingredient_name}</td>
                        <td className="py-2 px-4 text-right text-dark-300">
                          {ing.quantity} {ing.unit}
                        </td>
                        <td className="py-2 px-4 text-right text-dark-300">
                          {ing.unit_cost.toFixed(2)} EUR/{ing.unit}
                        </td>
                        <td className="py-2 px-4 text-right font-semibold text-amber-400">
                          {ing.total_cost.toFixed(2)} EUR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-dark-600 bg-dark-900/50">
                      <td colSpan={3} className="py-2 px-4 text-right font-semibold text-white">
                        Costo Totale:
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-primary-400">
                        {selectedDish.ingredient_cost.toFixed(2)} EUR
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            {selectedDish.profit_margin_percent < 40 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-amber-400 mb-2">Suggerimenti</h4>
                <ul className="text-sm text-dark-300 space-y-1">
                  <li>• Considera di aumentare il prezzo di vendita</li>
                  <li>• Cerca fornitori con costi più bassi per gli ingredienti principali</li>
                  <li>• Valuta porzioni più piccole mantenendo il prezzo</li>
                  <li>• Sostituisci ingredienti costosi con alternative più economiche</li>
                </ul>
              </div>
            )}

            {selectedDish.profit_margin_percent >= 70 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-emerald-400 mb-2">Ottimo margine!</h4>
                <p className="text-sm text-dark-300">
                  Questo piatto ha un margine eccellente. Considera di promuoverlo di più o usarlo come base per varianti simili.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
