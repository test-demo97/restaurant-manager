import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle,
  ChefHat,
} from 'lucide-react';
import {
  getDailyStats,
  getLowStockItems,
  getOrdersByStatus,
} from '../lib/database';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import type { Order, InventoryItem } from '../types';

export function Dashboard() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0, avgOrder: 0 });
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [stats, pending, preparing, stock] = await Promise.all([
        getDailyStats(today),
        getOrdersByStatus('pending'),
        getOrdersByStatus('preparing'),
        getLowStockItems(),
      ]);

      setTodayStats(stats);
      setPendingOrders(pending);
      setPreparingOrders(preparing);
      setLowStock(stock);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Realtime refresh
  useRealtimeRefresh(loadData);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-dark-400 mt-1 text-sm sm:text-base">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/orders/new" className="btn-primary btn-lg w-full sm:w-auto justify-center">
          <ShoppingCart className="w-5 h-5" />
          {t('orders.newOrder')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card glow-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('dashboard.ordersToday')}</p>
              <p className="stat-value text-xl sm:text-2xl">{todayStats.orders}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('dashboard.revenueToday')}</p>
              <p className="stat-value text-xl sm:text-2xl">{formatPrice(todayStats.revenue)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('dashboard.avgOrder')}</p>
              <p className="stat-value text-xl sm:text-2xl">{formatPrice(todayStats.avgOrder)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="stat-label text-xs sm:text-sm">{t('dashboard.lowStock')}</p>
              <p className="stat-value text-xl sm:text-2xl">{lowStock.length}</p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${lowStock.length > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${lowStock.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pending Orders */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <h2 className="font-semibold text-white text-sm sm:text-base">{t('orders.pending')}</h2>
            </div>
            <span className="badge-warning">{pendingOrders.length}</span>
          </div>
          <div className="card-body space-y-2 sm:space-y-3">
            {pendingOrders.length === 0 ? (
              <p className="text-dark-400 text-center py-4 text-sm">{t('orders.noActiveOrders')}</p>
            ) : (
              pendingOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="order-item">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm sm:text-base">{t('orders.title')} #{order.id}</p>
                    <p className="text-xs sm:text-sm text-dark-400 truncate">
                      {order.order_type === 'dine_in' ? `${t('orders.table')} ${order.table_name}` :
                       order.order_type === 'takeaway' ? t('orders.takeaway') : t('orders.delivery')}
                    </p>
                  </div>
                  <p className="font-semibold text-primary-400 text-sm sm:text-base">{formatPrice(order.total)}</p>
                </div>
              ))
            )}
            {pendingOrders.length > 5 && (
              <Link to="/orders" className="flex items-center justify-center gap-2 text-primary-400 hover:text-primary-300 py-2 text-sm">
                {t('dashboard.viewAll')} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Preparing Orders */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <h2 className="font-semibold text-white text-sm sm:text-base">{t('orders.preparing')}</h2>
            </div>
            <span className="badge-info">{preparingOrders.length}</span>
          </div>
          <div className="card-body space-y-2 sm:space-y-3">
            {preparingOrders.length === 0 ? (
              <p className="text-dark-400 text-center py-4 text-sm">{t('orders.noActiveOrders')}</p>
            ) : (
              preparingOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="order-item">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm sm:text-base">{t('orders.title')} #{order.id}</p>
                    <p className="text-xs sm:text-sm text-dark-400 truncate">
                      {order.order_type === 'dine_in' ? `${t('orders.table')} ${order.table_name}` :
                       order.order_type === 'takeaway' ? t('orders.takeaway') : t('orders.delivery')}
                    </p>
                  </div>
                  <p className="font-semibold text-primary-400 text-sm sm:text-base">{formatPrice(order.total)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              <h2 className="font-semibold text-white text-sm sm:text-base">{t('dashboard.lowStock')}</h2>
            </div>
            {lowStock.length > 0 && <span className="badge-danger">{lowStock.length}</span>}
          </div>
          <div className="card-body space-y-2 sm:space-y-3">
            {lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 mb-3" />
                <p className="text-dark-300 text-sm">{t('inventory.inStock')}</p>
              </div>
            ) : (
              lowStock.map((item) => (
                <div key={item.id} className="order-item border-l-4 border-red-500">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm sm:text-base truncate">{item.ingredient_name}</p>
                    <p className="text-xs sm:text-sm text-dark-400">{t('inventory.threshold')}: {item.threshold} {item.unit}</p>
                  </div>
                  <p className="font-semibold text-red-400 text-sm sm:text-base whitespace-nowrap">{item.quantity} {item.unit}</p>
                </div>
              ))
            )}
            {lowStock.length > 0 && (
              <Link to="/inventory" className="flex items-center justify-center gap-2 text-primary-400 hover:text-primary-300 py-2 text-sm">
                {t('sidebar.inventory')} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('dashboard.quickActions')}</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/orders" className="btn-primary text-center py-4 sm:py-6 flex flex-col items-center gap-2">
              <ChefHat className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-base">{t('sidebar.orders')}</span>
            </Link>
            <Link to="/tables" className="btn-secondary text-center py-4 sm:py-6 flex flex-col items-center gap-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-base">{t('sidebar.tables')}</span>
            </Link>
            <Link to="/menu" className="btn-secondary text-center py-4 sm:py-6 flex flex-col items-center gap-2">
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-base">{t('sidebar.menu')}</span>
            </Link>
            <Link to="/reports" className="btn-secondary text-center py-4 sm:py-6 flex flex-col items-center gap-2">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-base">{t('sidebar.reports')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
