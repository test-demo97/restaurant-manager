import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  ChefHat,
  Package,
  Search,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  getMenuItems,
  getIngredients,
  getMenuItemIngredients,
  addMenuItemIngredient,
  updateMenuItemIngredient,
  deleteMenuItemIngredient,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { MenuItem, Ingredient, MenuItemIngredient } from '../types';

export function Recipes() {
  useLanguage(); // Ready for translations
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<MenuItemIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenuItem, setSelectedMenuItem] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Per mobile: mostra editor o lista
  const [showEditor, setShowEditor] = useState(false);

  // Form per nuovo ingrediente nella ricetta
  const [newIngredientId, setNewIngredientId] = useState<number | ''>('');
  const [newQuantity, setNewQuantity] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      const [items, ings, recs] = await Promise.all([
        getMenuItems(),
        getIngredients(),
        getMenuItemIngredients(),
      ]);
      setMenuItems(items);
      setIngredients(ings);
      setRecipes(recs);
      if (items.length > 0 && !selectedMenuItem) {
        setSelectedMenuItem(items[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItemRecipe = recipes.filter(r => r.menu_item_id === selectedMenuItem);
  const selectedItem = menuItems.find(m => m.id === selectedMenuItem);

  // Ingredienti non ancora nella ricetta
  const availableIngredients = ingredients.filter(
    ing => !selectedItemRecipe.some(r => r.ingredient_id === ing.id)
  );

  async function handleAddIngredient() {
    if (!selectedMenuItem || !newIngredientId || !newQuantity) {
      showToast('Seleziona ingrediente e quantità', 'warning');
      return;
    }

    try {
      await addMenuItemIngredient({
        menu_item_id: selectedMenuItem,
        ingredient_id: Number(newIngredientId),
        quantity: parseFloat(newQuantity),
      });
      showToast('Ingrediente aggiunto alla ricetta', 'success');
      setNewIngredientId('');
      setNewQuantity('');
      loadData();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      showToast('Errore nell\'aggiunta', 'error');
    }
  }

  async function handleUpdateQuantity(recipeId: number, quantity: number) {
    try {
      await updateMenuItemIngredient(recipeId, { quantity });
      showToast('Quantità aggiornata', 'success');
      loadData();
    } catch (error) {
      console.error('Error updating quantity:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  async function handleRemoveIngredient(recipeId: number) {
    try {
      await deleteMenuItemIngredient(recipeId);
      showToast('Ingrediente rimosso', 'success');
      loadData();
    } catch (error) {
      console.error('Error removing ingredient:', error);
      showToast('Errore nella rimozione', 'error');
    }
  }

  // Calcola costo totale ingredienti per il piatto selezionato
  const recipeCost = selectedItemRecipe.reduce((sum, r) => {
    const ing = ingredients.find(i => i.id === r.ingredient_id);
    return sum + (ing ? ing.cost * r.quantity : 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Funzione per selezionare un piatto (su mobile apre anche l'editor)
  function handleSelectItem(itemId: number) {
    setSelectedMenuItem(itemId);
    setShowEditor(true);
  }

  // Torna alla lista su mobile
  function handleBackToList() {
    setShowEditor(false);
  }

  // Statistiche rapide
  const itemsWithRecipe = menuItems.filter(item =>
    recipes.some(r => r.menu_item_id === item.id)
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary-400" />
            Gestione Ricette
          </h1>
          <p className="text-dark-400 text-sm">
            Collega ingredienti ai piatti per calcolo scorte e costi
          </p>
        </div>
        {/* Statistiche rapide */}
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-medium">{itemsWithRecipe}</span>
            <span className="text-dark-400 hidden sm:inline">con ricetta</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-medium">{menuItems.length - itemsWithRecipe}</span>
            <span className="text-dark-400 hidden sm:inline">senza</span>
          </div>
        </div>
      </div>

      {/* Layout Desktop: side-by-side | Mobile: pannelli separati */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:h-[calc(100vh-180px)]">

        {/* Lista Piatti - sempre visibile su desktop, nascosta su mobile quando editor aperto */}
        <div className={`lg:col-span-4 bg-dark-800 rounded-xl border border-dark-700 flex flex-col ${showEditor ? 'hidden lg:flex' : 'flex'}`}
             style={{ minHeight: showEditor ? undefined : 'calc(100vh - 180px)' }}>
          <div className="p-3 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Cerca piatto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredMenuItems.length === 0 ? (
              <div className="p-6 text-center text-dark-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessun piatto trovato</p>
              </div>
            ) : (
              filteredMenuItems.map((item) => {
                const itemRecipe = recipes.filter(r => r.menu_item_id === item.id);
                const hasRecipe = itemRecipe.length > 0;
                const itemCost = itemRecipe.reduce((sum, r) => {
                  const ing = ingredients.find(i => i.id === r.ingredient_id);
                  return sum + (ing ? ing.cost * r.quantity : 0);
                }, 0);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={`w-full p-3 sm:p-4 text-left border-b border-dark-700 transition-colors ${
                      selectedMenuItem === item.id
                        ? 'bg-primary-500/20 border-l-4 border-l-primary-500'
                        : 'hover:bg-dark-700 active:bg-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-dark-400">€{item.price.toFixed(2)}</span>
                          {hasRecipe && (
                            <>
                              <span className="text-dark-600">•</span>
                              <span className={`text-xs ${item.price - itemCost > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                Margine €{(item.price - itemCost).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasRecipe ? (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                            {itemRecipe.length} ing.
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                            Da fare
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="p-3 border-t border-dark-700 text-xs text-dark-400 hidden sm:block">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Con ricetta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span>Senza ricetta</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Ricetta - sempre visibile su desktop, a tutto schermo su mobile quando selezionato */}
        <div className={`lg:col-span-8 bg-dark-800 rounded-xl border border-dark-700 flex flex-col ${showEditor ? 'flex' : 'hidden lg:flex'}`}
             style={{ minHeight: showEditor ? 'calc(100vh - 180px)' : undefined }}>
          {selectedItem ? (
            <>
              {/* Header con back button su mobile */}
              <div className="p-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  {/* Back button solo su mobile */}
                  <button
                    onClick={handleBackToList}
                    className="lg:hidden p-2 -ml-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate">{selectedItem.name}</h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-dark-400">
                      <span>Prezzo: <span className="text-white">€{selectedItem.price.toFixed(2)}</span></span>
                      <span>Costo: <span className="text-white">€{recipeCost.toFixed(2)}</span></span>
                      <span className={recipeCost > 0 ? (selectedItem.price - recipeCost > 0 ? 'text-emerald-400' : 'text-red-400') : ''}>
                        Margine: €{(selectedItem.price - recipeCost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista Ingredienti */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-medium text-dark-300 mb-3">
                  Ingredienti nella ricetta ({selectedItemRecipe.length})
                </h3>

                {selectedItemRecipe.length === 0 ? (
                  <div className="text-center py-8 text-dark-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Nessun ingrediente</p>
                    <p className="text-sm mt-1">Usa il form qui sotto per aggiungere ingredienti</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedItemRecipe.map((recipe) => {
                      const ing = ingredients.find(i => i.id === recipe.ingredient_id);
                      const cost = ing ? ing.cost * recipe.quantity : 0;

                      return (
                        <div
                          key={recipe.id}
                          className="p-3 bg-dark-900 rounded-lg"
                        >
                          {/* Layout mobile: stack | Desktop: row */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Package className="w-5 h-5 text-dark-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate">{recipe.ingredient_name}</p>
                                <p className="text-xs text-dark-400">
                                  €{ing?.cost.toFixed(2)}/{recipe.unit} → <span className="text-primary-400">€{cost.toFixed(3)}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 pl-8 sm:pl-0">
                              <div className="flex items-center gap-1 flex-1 sm:flex-none">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={recipe.quantity}
                                  onChange={(e) => handleUpdateQuantity(recipe.id, parseFloat(e.target.value) || 0)}
                                  className="w-20 sm:w-24 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-center"
                                />
                                <span className="text-sm text-dark-400 w-10">{recipe.unit}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveIngredient(recipe.id)}
                                className="p-2.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Aggiungi Ingrediente */}
              <div className="p-4 border-t border-dark-700 bg-dark-900/50">
                <h3 className="text-sm font-medium text-dark-300 mb-3">Aggiungi ingrediente</h3>
                {/* Layout mobile: stack | Desktop: row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newIngredientId}
                    onChange={(e) => setNewIngredientId(e.target.value ? Number(e.target.value) : '')}
                    className="input flex-1 py-2.5 text-sm"
                  >
                    <option value="">Seleziona ingrediente...</option>
                    {availableIngredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit}) - €{ing.cost.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Quantità"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="input flex-1 sm:w-28 py-2.5 text-sm"
                    />
                    <button
                      onClick={handleAddIngredient}
                      disabled={!newIngredientId || !newQuantity}
                      className="btn-primary px-4 py-2.5 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="sm:hidden">Aggiungi</span>
                    </button>
                  </div>
                </div>
                {availableIngredients.length === 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    Tutti gli ingredienti sono già nella ricetta
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-dark-400 p-8">
              <div className="text-center">
                <ChefHat className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Seleziona un piatto</p>
                <p className="text-sm mt-1">Clicca su un piatto dalla lista per modificare la ricetta</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
