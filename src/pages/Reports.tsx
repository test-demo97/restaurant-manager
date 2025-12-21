import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  Edit2,
  Trash2,
  Plus,
  FileText,
  Receipt,
  CreditCard,
  CheckCircle,
  Clock,
  PieChart,
  Percent,
} from 'lucide-react';
import {
  getTopProducts,
  getOrders,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getStatsForPeriod,
  getSettings,
} from '../lib/database';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import type { Expense, Invoice } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface PeriodStat {
  date: string;
  orders: number;
  revenue: number;
}

interface PaymentMethodStat {
  method: string;
  total: number;
}

interface OrderTypeStat {
  type: string;
  count: number;
}

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export function Reports() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [periodChartData, setPeriodChartData] = useState<PeriodStat[]>([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStat[]>([]);
  const [orderTypeStats, setOrderTypeStats] = useState<OrderTypeStat[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [periodStats, setPeriodStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalExpenses: 0,
    totalInvoices: 0,
    profit: 0,
  });
  const [loading, setLoading] = useState(true);

  // IVA as cost settings
  const [applyVatAsCost, setApplyVatAsCost] = useState(() => {
    const saved = localStorage.getItem('reports_apply_vat_as_cost');
    return saved === 'true';
  });
  const [ivaRate, setIvaRate] = useState(17);
  const [ivaIncluded, setIvaIncluded] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'invoices'>('overview');

  // Expenses list
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Invoices list
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'general',
  });

  // Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    supplier_name: '',
    description: '',
    amount: '',
    vat_amount: '',
    category: 'supplies',
    paid: false,
    payment_date: '',
    notes: '',
  });

  // Delete confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // Save applyVatAsCost to localStorage
  useEffect(() => {
    localStorage.setItem('reports_apply_vat_as_cost', applyVatAsCost.toString());
  }, [applyVatAsCost]);

  async function loadData() {
    setLoading(true);
    try {
      const [top, orders, expensesList, invoicesList, periodData, settings] = await Promise.all([
        getTopProducts(10),
        getOrders(),
        getExpenses(startDate, endDate),
        getInvoices(startDate, endDate),
        getStatsForPeriod(startDate, endDate),
        getSettings(),
      ]);

      // Load IVA settings
      setIvaRate(settings.iva_rate || 17);
      setIvaIncluded(settings.iva_included !== false);

      setTopProducts(top);
      setExpenses(expensesList);
      setInvoices(invoicesList);

      // Chart data from period stats
      setPeriodChartData(periodData.dailyStats);
      setPaymentMethodStats(periodData.revenueByPaymentMethod);
      setOrderTypeStats(periodData.ordersByType);

      // Calculate period stats
      const periodOrders = orders.filter(
        (o) => o.date >= startDate && o.date <= endDate && o.status !== 'cancelled'
      );
      const totalRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
      const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
      const totalInvoices = invoicesList.reduce((sum, i) => sum + i.total, 0);

      setPeriodStats({
        totalRevenue,
        totalOrders: periodOrders.length,
        totalExpenses,
        totalInvoices,
        profit: totalRevenue - totalExpenses - totalInvoices,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  // Calculate VAT amount from revenue (only if IVA is included in prices)
  const vatFromRevenue = ivaIncluded
    ? periodStats.totalRevenue - (periodStats.totalRevenue / (1 + ivaRate / 100))
    : 0;

  // Calculate adjusted profit when VAT is applied as cost
  const adjustedProfit = applyVatAsCost
    ? periodStats.profit - vatFromRevenue
    : periodStats.profit;

  function openExpenseModal(expense?: Expense) {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        date: expense.date,
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category || 'general',
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'general',
      });
    }
    setShowExpenseModal(true);
  }

  async function handleSaveExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount) {
      showToast('Compila tutti i campi', 'warning');
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          date: expenseForm.date,
          description: expenseForm.description.trim(),
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
        });
        showToast('Spesa modificata', 'success');
      } else {
        await createExpense({
          date: expenseForm.date,
          description: expenseForm.description.trim(),
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
        });
        showToast('Spesa aggiunta', 'success');
      }

      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'general' });
      loadData();
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function handleDeleteExpense() {
    if (!expenseToDelete) return;

    try {
      await deleteExpense(expenseToDelete.id);
      showToast('Spesa eliminata', 'success');
      setExpenseToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      general: 'Generale',
      utilities: 'Utenze',
      rent: 'Affitto',
      supplies: 'Forniture',
      salaries: 'Stipendi',
      maintenance: 'Manutenzione',
      other: 'Altro',
    };
    return labels[category] || category;
  }

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      general: 'bg-gray-500/20 text-gray-400',
      utilities: 'bg-yellow-500/20 text-yellow-400',
      rent: 'bg-blue-500/20 text-blue-400',
      supplies: 'bg-green-500/20 text-green-400',
      salaries: 'bg-purple-500/20 text-purple-400',
      maintenance: 'bg-orange-500/20 text-orange-400',
      other: 'bg-pink-500/20 text-pink-400',
    };
    return colors[category] || colors.general;
  }

  function openInvoiceModal(invoice?: Invoice) {
    if (invoice) {
      setEditingInvoice(invoice);
      setInvoiceForm({
        date: invoice.date,
        invoice_number: invoice.invoice_number,
        supplier_name: invoice.supplier_name,
        description: invoice.description,
        amount: invoice.amount.toString(),
        vat_amount: invoice.vat_amount.toString(),
        category: invoice.category,
        paid: invoice.paid,
        payment_date: invoice.payment_date || '',
        notes: invoice.notes || '',
      });
    } else {
      setEditingInvoice(null);
      setInvoiceForm({
        date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        supplier_name: '',
        description: '',
        amount: '',
        vat_amount: '',
        category: 'supplies',
        paid: false,
        payment_date: '',
        notes: '',
      });
    }
    setShowInvoiceModal(true);
  }

  async function handleSaveInvoice() {
    if (!invoiceForm.invoice_number.trim() || !invoiceForm.supplier_name.trim() || !invoiceForm.amount) {
      showToast('Compila tutti i campi obbligatori', 'warning');
      return;
    }

    const amount = parseFloat(invoiceForm.amount);
    const vatAmount = parseFloat(invoiceForm.vat_amount) || 0;

    try {
      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, {
          date: invoiceForm.date,
          invoice_number: invoiceForm.invoice_number.trim(),
          supplier_name: invoiceForm.supplier_name.trim(),
          description: invoiceForm.description.trim(),
          amount,
          vat_amount: vatAmount,
          total: amount + vatAmount,
          category: invoiceForm.category,
          paid: invoiceForm.paid,
          payment_date: invoiceForm.paid ? invoiceForm.payment_date : undefined,
          notes: invoiceForm.notes.trim() || undefined,
        });
        showToast('Fattura modificata', 'success');
      } else {
        await createInvoice({
          date: invoiceForm.date,
          invoice_number: invoiceForm.invoice_number.trim(),
          supplier_name: invoiceForm.supplier_name.trim(),
          description: invoiceForm.description.trim(),
          amount,
          vat_amount: vatAmount,
          total: amount + vatAmount,
          category: invoiceForm.category,
          paid: invoiceForm.paid,
          payment_date: invoiceForm.paid ? invoiceForm.payment_date : undefined,
          notes: invoiceForm.notes.trim() || undefined,
        });
        showToast('Fattura aggiunta', 'success');
      }

      setShowInvoiceModal(false);
      setEditingInvoice(null);
      loadData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function handleDeleteInvoice() {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice(invoiceToDelete.id);
      showToast('Fattura eliminata', 'success');
      setInvoiceToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showToast("Errore nell'eliminazione", 'error');
    }
  }

  function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Contanti',
      card: 'Carta',
      online: 'Online',
      satispay: 'Satispay',
    };
    return labels[method] || method;
  }

  function getOrderTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      dine_in: 'Al tavolo',
      takeaway: 'Asporto',
      delivery: 'Consegna',
    };
    return labels[type] || type;
  }

  const chartData = periodChartData.map((stat) => ({
    ...stat,
    date: new Date(stat.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
  }));

  const paymentChartData = paymentMethodStats.map((stat) => ({
    name: getPaymentMethodLabel(stat.method),
    value: stat.total,
  }));

  const orderTypeChartData = orderTypeStats.map((stat) => ({
    name: getOrderTypeLabel(stat.type),
    value: stat.count,
  }));

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('reports.title')}</h1>
          <p className="text-dark-400 mt-1 text-sm sm:text-base">{t('reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openExpenseModal()} className="btn-secondary flex-1 sm:flex-none">
            <Plus className="w-4 h-4" />
            <span>{t('reports.expense')}</span>
          </button>
          <button onClick={() => openInvoiceModal()} className="btn-primary flex-1 sm:flex-none">
            <Receipt className="w-4 h-4" />
            <span>{t('reports.invoice')}</span>
          </button>
        </div>
      </div>

      {/* Date Range and Tabs */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400 hidden sm:block" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input w-auto flex-1 sm:flex-none text-sm"
          />
          <span className="text-dark-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input w-auto flex-1 sm:flex-none text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center bg-dark-800 rounded-lg p-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-primary-500 text-dark-900' : 'text-dark-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1 sm:mr-2" />
              <span>{t('reports.overview')}</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'expenses' ? 'bg-primary-500 text-dark-900' : 'text-dark-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1 sm:mr-2" />
              <span>{t('reports.expenses')}</span>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'invoices' ? 'bg-primary-500 text-dark-900' : 'text-dark-400 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4 inline mr-1 sm:mr-2" />
              <span>{t('reports.invoices')}</span>
            </button>
          </div>

          {/* VAT as Cost Toggle - only shown if IVA is included in prices */}
          {ivaIncluded && (
            <label
              className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors"
              title={t('reports.applyVatAsCostDesc')}
            >
              <input
                type="checkbox"
                checked={applyVatAsCost}
                onChange={(e) => setApplyVatAsCost(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500"
              />
              <Percent className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm text-dark-300">{t('reports.applyVatAsCost')}</span>
            </label>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${applyVatAsCost && ivaIncluded ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2 sm:gap-4`}>
        <div className="stat-card glow-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('reports.revenue')}</p>
              <p className="stat-value text-lg sm:text-2xl">€{periodStats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('reports.orders')}</p>
              <p className="stat-value text-lg sm:text-2xl">{periodStats.totalOrders}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('reports.expenses')}</p>
              <p className="stat-value text-lg sm:text-2xl">€{periodStats.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('reports.invoices')}</p>
              <p className="stat-value text-lg sm:text-2xl">€{periodStats.totalInvoices.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* IVA Card - only shown when applyVatAsCost is enabled */}
        {applyVatAsCost && ivaIncluded && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="stat-label text-xs sm:text-sm">{t('reports.vatAmount')} ({ivaRate}%)</p>
                <p className="stat-value text-lg sm:text-2xl text-amber-400">€{vatFromRevenue.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Percent className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              </div>
            </div>
          </div>
        )}

        <div className={`stat-card ${applyVatAsCost && ivaIncluded ? '' : 'col-span-2 sm:col-span-1'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('reports.profit')}</p>
              <p className={`stat-value text-lg sm:text-2xl ${adjustedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                €{adjustedProfit.toFixed(2)}
              </p>
              {applyVatAsCost && ivaIncluded && (
                <p className="text-[10px] text-dark-500 mt-0.5">{t('reports.netRevenue')}</p>
              )}
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${adjustedProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <DollarSign className={`w-5 h-5 sm:w-6 sm:h-6 ${adjustedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Charts - Period Based */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue Chart */}
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Incassi nel Periodo
                </h2>
              </div>
              <div className="card-body h-64 sm:h-80">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-dark-400">
                    Nessun dato disponibile per il periodo
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" tickFormatter={(v) => `€${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [`€${(value as number).toFixed(2)}`, 'Incasso']}
                      />
                      <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Orders Chart */}
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  Ordini nel Periodo
                </h2>
              </div>
              <div className="card-body h-64 sm:h-80">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-dark-400">
                    Nessun dato disponibile per il periodo
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [value as number, 'Ordini']}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Pie Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Payment Method Chart */}
            <div className="card">
              <div className="card-header py-2 px-3 sm:py-3 sm:px-4">
                <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  Incasso per Metodo Pagamento
                </h2>
              </div>
              <div className="card-body h-72 sm:h-96 p-2 sm:p-4">
                {paymentChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-dark-400">
                    Nessun dato disponibile
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={paymentChartData}
                        cx="50%"
                        cy="45%"
                        outerRadius={80}
                        innerRadius={30}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                      >
                        {paymentChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#ffffff',
                        }}
                        itemStyle={{ color: '#ffffff' }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(value) => [`€${(value as number).toFixed(2)}`, 'Totale']}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ fontSize: '12px', color: isDarkMode ? '#e5e7eb' : '#111827' }}>{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Order Type Chart */}
            <div className="card">
              <div className="card-header py-2 px-3 sm:py-3 sm:px-4">
                <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                  Ordini per Tipologia
                </h2>
              </div>
              <div className="card-body h-72 sm:h-96 p-2 sm:p-4">
                {orderTypeChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-dark-400">
                    Nessun dato disponibile
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={orderTypeChartData}
                        cx="50%"
                        cy="45%"
                        outerRadius={80}
                        innerRadius={30}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                      >
                        {orderTypeChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#ffffff',
                        }}
                        itemStyle={{ color: '#ffffff' }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(value) => [value as number, 'Ordini']}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ fontSize: '12px', color: isDarkMode ? '#e5e7eb' : '#111827' }}>{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                Prodotti Più Venduti
              </h2>
            </div>
            <div className="card-body">
              {topProducts.length === 0 ? (
                <p className="text-dark-400 text-center py-8 text-sm">
                  Nessun dato disponibile per il periodo selezionato
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-dark-900 rounded-xl"
                    >
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${
                          index === 0
                            ? 'bg-primary-500 text-dark-900'
                            : index === 1
                            ? 'bg-dark-600 text-white'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-dark-700 text-dark-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-sm sm:text-base">{product.name}</p>
                        <p className="text-xs sm:text-sm text-dark-400">
                          {product.quantity} venduti
                        </p>
                      </div>
                      <p className="font-semibold text-primary-400 text-sm sm:text-base flex-shrink-0">
                        €{product.revenue.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="card">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Spese del Periodo
            </h2>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-dark-400">
                {expenses.length} {expenses.length === 1 ? 'spesa' : 'spese'} - Totale: €{periodStats.totalExpenses.toFixed(2)}
              </span>
              <button onClick={() => openExpenseModal()} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Aggiungi</span>
              </button>
            </div>
          </div>
          <div className="card-body">
            {expenses.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400 text-base sm:text-lg">Nessuna spesa nel periodo selezionato</p>
                <p className="text-dark-500 text-xs sm:text-sm mt-1">Aggiungi la tua prima spesa per iniziare a tracciare le uscite</p>
                <button
                  onClick={() => openExpenseModal()}
                  className="btn-primary mt-4 sm:mt-6"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi prima spesa</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-dark-900 rounded-xl hover:bg-dark-800 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white truncate text-sm sm:text-base">{expense.description}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${getCategoryColor(expense.category || 'general')}`}>
                          {getCategoryLabel(expense.category || 'general')}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-dark-400">
                        {new Date(expense.date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <p className="font-semibold text-red-400 whitespace-nowrap text-base sm:text-lg">
                        -€{expense.amount.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openExpenseModal(expense)}
                          className="p-1.5 sm:p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(expense)}
                          className="p-1.5 sm:p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              Fatture del Periodo
            </h2>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-dark-400">
                {invoices.length} {invoices.length === 1 ? 'fattura' : 'fatture'} - Totale: €{periodStats.totalInvoices.toFixed(2)}
              </span>
              <button onClick={() => openInvoiceModal()} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Aggiungi</span>
              </button>
            </div>
          </div>
          <div className="card-body">
            {invoices.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Receipt className="w-12 h-12 sm:w-16 sm:h-16 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400 text-base sm:text-lg">Nessuna fattura nel periodo selezionato</p>
                <p className="text-dark-500 text-xs sm:text-sm mt-1">Aggiungi la tua prima fattura per tracciare i documenti contabili</p>
                <button
                  onClick={() => openInvoiceModal()}
                  className="btn-primary mt-4 sm:mt-6"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi prima fattura</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-dark-900 rounded-xl hover:bg-dark-800 transition-colors group"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${invoice.paid ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                        {invoice.paid ? (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                        ) : (
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <p className="font-medium text-white text-sm sm:text-base">{invoice.invoice_number}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${getCategoryColor(invoice.category)}`}>
                            {getCategoryLabel(invoice.category)}
                          </span>
                          {!invoice.paid && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-amber-500/20 text-amber-400">
                              Da pagare
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-dark-300">{invoice.supplier_name}</p>
                        <p className="text-[10px] sm:text-xs text-dark-400 truncate">
                          {new Date(invoice.date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                          {invoice.description && ` - ${invoice.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-11 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-purple-400 text-base sm:text-lg">
                          €{invoice.total.toFixed(2)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-dark-400">
                          IVA: €{invoice.vat_amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openInvoiceModal(invoice)}
                          className="p-1.5 sm:p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setInvoiceToDelete(invoice)}
                          className="p-1.5 sm:p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Modifica Spesa' : 'Aggiungi Spesa'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Data *</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Descrizione *</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="input"
              placeholder="Es. Bolletta elettricità"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Importo (€) *</label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="select"
              >
                <option value="general">Generale</option>
                <option value="utilities">Utenze</option>
                <option value="rent">Affitto</option>
                <option value="supplies">Forniture</option>
                <option value="salaries">Stipendi</option>
                <option value="maintenance">Manutenzione</option>
                <option value="other">Altro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveExpense} className="btn-primary flex-1">
              {editingExpense ? 'Salva Modifiche' : 'Aggiungi Spesa'}
            </button>
            <button
              onClick={() => {
                setShowExpenseModal(false);
                setEditingExpense(null);
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Expense Confirmation Modal */}
      <Modal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        title="Conferma Eliminazione"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark-300">
            Sei sicuro di voler eliminare la spesa{' '}
            <span className="font-semibold text-white">"{expenseToDelete?.description}"</span>?
          </p>
          <p className="text-sm text-dark-400">
            Questa azione non può essere annullata.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleDeleteExpense} className="btn-danger flex-1">
              Elimina
            </button>
            <button onClick={() => setExpenseToDelete(null)} className="btn-secondary flex-1">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setEditingInvoice(null);
        }}
        title={editingInvoice ? 'Modifica Fattura' : 'Aggiungi Fattura'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Numero Fattura *</label>
              <input
                type="text"
                value={invoiceForm.invoice_number}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                className="input"
                placeholder="Es. FT-2024-001"
              />
            </div>
            <div>
              <label className="label">Data *</label>
              <input
                type="date"
                value={invoiceForm.date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Fornitore *</label>
            <input
              type="text"
              value={invoiceForm.supplier_name}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, supplier_name: e.target.value })}
              className="input"
              placeholder="Es. Metro Italia S.p.A."
            />
          </div>

          <div>
            <label className="label">Descrizione</label>
            <input
              type="text"
              value={invoiceForm.description}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
              className="input"
              placeholder="Es. Fornitura alimentari mensile"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Imponibile (€) *</label>
              <input
                type="number"
                step="0.01"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">IVA (€)</label>
              <input
                type="number"
                step="0.01"
                value={invoiceForm.vat_amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, vat_amount: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Totale</label>
              <div className="input bg-dark-700 flex items-center text-primary-400 font-semibold">
                €{((parseFloat(invoiceForm.amount) || 0) + (parseFloat(invoiceForm.vat_amount) || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoria</label>
              <select
                value={invoiceForm.category}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}
                className="select"
              >
                <option value="supplies">Forniture</option>
                <option value="utilities">Utenze</option>
                <option value="rent">Affitto</option>
                <option value="salaries">Stipendi</option>
                <option value="maintenance">Manutenzione</option>
                <option value="other">Altro</option>
              </select>
            </div>
            <div>
              <label className="label">Stato Pagamento</label>
              <div className="flex items-center gap-4 h-11">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceForm.paid}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paid: e.target.checked })}
                    className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-white">Pagata</span>
                </label>
              </div>
            </div>
          </div>

          {invoiceForm.paid && (
            <div>
              <label className="label">Data Pagamento</label>
              <input
                type="date"
                value={invoiceForm.payment_date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_date: e.target.value })}
                className="input"
              />
            </div>
          )}

          <div>
            <label className="label">Note</label>
            <textarea
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveInvoice} className="btn-primary flex-1">
              {editingInvoice ? 'Salva Modifiche' : 'Aggiungi Fattura'}
            </button>
            <button
              onClick={() => {
                setShowInvoiceModal(false);
                setEditingInvoice(null);
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Invoice Confirmation Modal */}
      <Modal
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        title="Conferma Eliminazione"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark-300">
            Sei sicuro di voler eliminare la fattura{' '}
            <span className="font-semibold text-white">"{invoiceToDelete?.invoice_number}"</span>
            {invoiceToDelete?.supplier_name && (
              <> di <span className="text-white">{invoiceToDelete.supplier_name}</span></>
            )}
            ?
          </p>
          <p className="text-sm text-dark-400">
            Questa azione non può essere annullata.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleDeleteInvoice} className="btn-danger flex-1">
              Elimina
            </button>
            <button onClick={() => setInvoiceToDelete(null)} className="btn-secondary flex-1">
              Annulla
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
