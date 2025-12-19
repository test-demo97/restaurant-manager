import { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  FolderPlus,
  ToggleLeft,
  ToggleRight,
  FileDown,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  getCategories,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  deleteCategory,
  getSettings,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import type { Category, MenuItem, Settings } from '../types';

export function Menu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category_id: 0,
    price: '',
    description: '',
    available: true,
  });
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cats, items, settingsData] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getSettings(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory && item.category_id !== selectedCategory) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  function openItemModal(item?: MenuItem) {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category_id: item.category_id,
        price: item.price.toString(),
        description: item.description || '',
        available: item.available,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        category_id: categories[0]?.id || 0,
        price: '',
        description: '',
        available: true,
      });
    }
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemForm.name || !itemForm.price || !itemForm.category_id) {
      showToast('Compila tutti i campi obbligatori', 'warning');
      return;
    }

    try {
      const data = {
        name: itemForm.name,
        category_id: itemForm.category_id,
        price: parseFloat(itemForm.price),
        description: itemForm.description || undefined,
        available: itemForm.available,
      };

      if (editingItem) {
        await updateMenuItem(editingItem.id, data);
        showToast('Articolo aggiornato', 'success');
      } else {
        await createMenuItem(data as Omit<MenuItem, 'id'>);
        showToast('Articolo creato', 'success');
      }

      setShowItemModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving item:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('Sei sicuro di voler eliminare questo articolo?')) return;

    try {
      await deleteMenuItem(id);
      showToast('Articolo eliminato', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    try {
      await updateMenuItem(item.id, { available: !item.available });
      showToast(
        item.available ? 'Articolo disabilitato' : 'Articolo abilitato',
        'success'
      );
      loadData();
    } catch (error) {
      console.error('Error toggling item:', error);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  async function handleSaveCategory() {
    if (!categoryName.trim()) {
      showToast('Inserisci un nome per la categoria', 'warning');
      return;
    }

    try {
      await createCategory({ name: categoryName.trim() });
      showToast('Categoria creata', 'success');
      setCategoryName('');
      setShowCategoryModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Errore nella creazione', 'error');
    }
  }

  async function handleDeleteCategory(id: number) {
    const hasItems = menuItems.some((item) => item.category_id === id);
    if (hasItems) {
      showToast('Impossibile eliminare: la categoria contiene articoli', 'warning');
      return;
    }

    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

    try {
      await deleteCategory(id);
      showToast('Categoria eliminata', 'success');
      if (selectedCategory === id) setSelectedCategory(null);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  function exportMenuToPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    // Helper function to add new page if needed
    function checkPageBreak(height: number) {
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    }

    // Decorative top border
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, pageWidth, 8, 'F');

    // Restaurant name header
    y = 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(31, 41, 55);
    const shopName = settings?.shop_name || 'Il Tuo Ristorante';
    doc.text(shopName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    // Subtitle (slogan)
    const menuSlogan = settings?.menu_slogan;
    if (menuSlogan) {
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text(menuSlogan, pageWidth / 2, y, { align: 'center' });
    }

    // Decorative line
    y += 10;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(margin + 40, y, pageWidth - margin - 40, y);

    y += 15;

    // Group items by category (only available items)
    const availableItems = menuItems.filter(item => item.available);
    const itemsByCategory = new Map<number, MenuItem[]>();

    categories.forEach(cat => {
      const catItems = availableItems.filter(item => item.category_id === cat.id);
      if (catItems.length > 0) {
        itemsByCategory.set(cat.id, catItems);
      }
    });

    // Render each category
    categories.forEach(category => {
      const catItems = itemsByCategory.get(category.id);
      if (!catItems || catItems.length === 0) return;

      // Check if we need a new page for the category header
      checkPageBreak(30);

      // Category header with decorative elements
      doc.setFillColor(254, 243, 199); // Light amber background
      doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 14, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(180, 83, 9); // Darker amber
      doc.text(category.name.toUpperCase(), pageWidth / 2, y + 5, { align: 'center' });

      y += 18;

      // Menu items
      catItems.forEach((item) => {
        checkPageBreak(25);

        // Item name and price on same line with dots
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);

        const nameWidth = doc.getTextWidth(item.name);
        const priceText = `€${item.price.toFixed(2)}`;
        const priceWidth = doc.getTextWidth(priceText);

        // Draw item name
        doc.text(item.name, margin, y);

        // Draw price (right-aligned)
        doc.setTextColor(180, 83, 9);
        doc.text(priceText, pageWidth - margin, y, { align: 'right' });

        // Draw dotted line between name and price
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1, 2], 0);
        const dotsStart = margin + nameWidth + 5;
        const dotsEnd = pageWidth - margin - priceWidth - 5;
        if (dotsEnd > dotsStart) {
          doc.line(dotsStart, y - 2, dotsEnd, y - 2);
        }
        doc.setLineDashPattern([], 0);

        // Description (if exists)
        if (item.description) {
          y += 5;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);

          // Word wrap for long descriptions
          const maxWidth = pageWidth - margin * 2 - 20;
          const lines = doc.splitTextToSize(item.description, maxWidth);
          lines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 5, y);
            y += 4;
          });
          y += 3;
        } else {
          y += 10;
        }
      });

      y += 8; // Space after category
    });

    // Footer on last page
    const footerY = pageHeight - 15;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Tutti i prezzi sono IVA inclusa', pageWidth / 2, footerY - 3, { align: 'center' });
    doc.text('Buon appetito!', pageWidth / 2, footerY + 3, { align: 'center' });

    // Decorative bottom border
    doc.setFillColor(245, 158, 11);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

    // Save the PDF
    const fileName = `menu-${(settings?.shop_name || 'ristorante').toLowerCase().replace(/\s+/g, '-')}.pdf`;
    doc.save(fileName);
    showToast('Menu esportato in PDF', 'success');
  }

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
          <h1 className="text-3xl font-bold text-white">Menu</h1>
          <p className="text-dark-400 mt-1">Gestisci il menu del ristorante</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportMenuToPDF}
            className="btn-secondary"
          >
            <FileDown className="w-5 h-5" />
            Esporta PDF
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-secondary"
          >
            <FolderPlus className="w-5 h-5" />
            Nuova Categoria
          </button>
          <button onClick={() => openItemModal()} className="btn-primary">
            <Plus className="w-5 h-5" />
            Nuovo Articolo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Cerca articolo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              selectedCategory === null
                ? 'bg-primary-500 text-dark-900'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            Tutti
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary-500 text-dark-900'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`card transition-all ${
              !item.available ? 'opacity-50' : ''
            }`}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{item.name}</h3>
                  <p className="text-sm text-dark-400">{item.category_name}</p>
                </div>
                <p className="text-xl font-bold text-primary-400 ml-2">
                  €{item.price.toFixed(2)}
                </p>
              </div>

              {item.description && (
                <p className="text-sm text-dark-400 line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-dark-700">
                <button
                  onClick={() => handleToggleAvailable(item)}
                  className={`flex items-center gap-2 text-sm ${
                    item.available ? 'text-emerald-400' : 'text-dark-500'
                  }`}
                >
                  {item.available ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                  {item.available ? 'Disponibile' : 'Non disponibile'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openItemModal(item)}
                    className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-dark-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-dark-400">Nessun articolo trovato</p>
        </div>
      )}

      {/* Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Modifica Articolo' : 'Nuovo Articolo'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="input"
              placeholder="Nome articolo"
            />
          </div>

          <div>
            <label className="label">Categoria *</label>
            <select
              value={itemForm.category_id}
              onChange={(e) =>
                setItemForm({ ...itemForm, category_id: parseInt(e.target.value) })
              }
              className="select"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Prezzo (€) *</label>
            <input
              type="number"
              step="0.01"
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Descrizione</label>
            <textarea
              value={itemForm.description}
              onChange={(e) =>
                setItemForm({ ...itemForm, description: e.target.value })
              }
              className="input resize-none h-24"
              placeholder="Descrizione opzionale"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white">Disponibile</span>
            <button
              type="button"
              onClick={() =>
                setItemForm({ ...itemForm, available: !itemForm.available })
              }
              className={`relative w-14 h-8 rounded-full transition-colors ${
                itemForm.available ? 'bg-emerald-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  itemForm.available ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveItem} className="btn-primary flex-1">
              {editingItem ? 'Salva Modifiche' : 'Crea Articolo'}
            </button>
            <button
              onClick={() => setShowItemModal(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Nuova Categoria"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome Categoria</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="input"
              placeholder="Es. Bevande"
            />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveCategory} className="btn-primary flex-1">
              Crea Categoria
            </button>
            <button
              onClick={() => setShowCategoryModal(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>

          {/* Existing categories */}
          {categories.length > 0 && (
            <div className="pt-4 border-t border-dark-700">
              <p className="text-sm text-dark-400 mb-3">Categorie esistenti</p>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 bg-dark-900 rounded-lg"
                  >
                    <span className="text-white">{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
