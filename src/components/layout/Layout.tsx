import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Menu, X, Trash2, Check, ChefHat, Edit2, AlertTriangle, Plus, History } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getLowStockItems } from '../../lib/database';
import { useAuth } from '../../context/AuthContext';
import { useNotifications, type Notification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';

export function Layout() {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const { user } = useAuth();
  const { sidebarCollapsed } = useTheme();
  const {
    notifications,
    unreadCount,
    removeNotification,
    clearAllNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleNotificationClick(notification: { orderId?: number; id: string }) {
    markAsRead(notification.id);
    if (notification.orderId) {
      navigate('/orders');
    }
    setNotificationsOpen(false);
    setShowAllNotifications(false);
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    return `${diffDays}g fa`;
  }

  function formatFullDate(date: Date): string {
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getNotificationIcon(type: Notification['type']) {
    switch (type) {
      case 'order_new':
        return <Plus className="w-4 h-4" />;
      case 'order_update':
        return <Edit2 className="w-4 h-4" />;
      case 'order_delete':
        return <Trash2 className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <ChefHat className="w-4 h-4" />;
    }
  }

  function getNotificationColor(type: Notification['type']) {
    switch (type) {
      case 'order_new':
        return 'bg-green-500/20 text-green-400';
      case 'order_update':
        return 'bg-blue-500/20 text-blue-400';
      case 'order_delete':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-primary-500/20 text-primary-400';
    }
  }

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Check low stock
    getLowStockItems().then(items => {
      setLowStockCount(items.length);
    });

    return () => clearInterval(timer);
  }, []);

  // Chiudi sidebar quando si ridimensiona a desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Componente per singola notifica
  const NotificationItem = ({ notification, showFullDate = false }: { notification: Notification; showFullDate?: boolean }) => (
    <div
      className={`px-4 py-3 border-b border-dark-700 last:border-b-0 hover:bg-dark-700/50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-dark-700/30' : ''
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-dark-300'}`}>
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              className="p-1 hover:bg-dark-600 rounded text-dark-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-dark-400">{notification.message}</p>
          {notification.actionBy && (
            <p className="text-xs text-primary-400 mt-0.5">
              da {notification.actionBy}
            </p>
          )}
          <p className="text-xs text-dark-500 mt-1">
            {showFullDate ? formatFullDate(notification.timestamp) : formatTimeAgo(notification.timestamp)}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className={`${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} transition-all duration-300`}>
        {/* Header Mobile/Desktop */}
        <header className="sticky top-0 z-30 bg-dark-900/95 backdrop-blur-md border-b border-dark-700">
          <div className="flex items-center justify-between px-3 lg:px-4 py-2 lg:py-2">
            {/* Left side - Menu button (mobile) + User info */}
            <div className="flex items-center gap-3">
              {/* Hamburger menu - solo mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>

              {/* User avatar e nome - mobile */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-400">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{user?.name.split(' ')[0]}</span>
              </div>

              {/* Time - solo desktop */}
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <span className="font-semibold text-white">
                  {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-dark-400">
                  {currentTime.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Time - mobile (compatto) */}
              <div className="lg:hidden text-sm">
                <span className="font-semibold text-white">
                  {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5 lg:w-4 lg:h-4 text-dark-300" />
                  {(unreadCount > 0 || lowStockCount > 0) && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                      {unreadCount + lowStockCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-900">
                      <h3 className="font-semibold text-white">Notifiche</h3>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <>
                            <button
                              onClick={() => markAllAsRead()}
                              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                              title="Segna tutte come lette"
                            >
                              <Check className="w-3 h-3" />
                              Lette
                            </button>
                            <button
                              onClick={() => clearAllNotifications()}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                              title="Cancella tutte"
                            >
                              <Trash2 className="w-3 h-3" />
                              Cancella
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Notifications List (mostra solo le prime 5) */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-10 h-10 text-dark-600 mx-auto mb-2" />
                          <p className="text-dark-400 text-sm">Nessuna notifica</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((notification) => (
                          <NotificationItem key={notification.id} notification={notification} />
                        ))
                      )}
                    </div>

                    {/* Footer con bottone "Vedi tutte" */}
                    {notifications.length > 5 && (
                      <div className="px-4 py-3 border-t border-dark-700 bg-dark-900">
                        <button
                          onClick={() => {
                            setNotificationsOpen(false);
                            setShowAllNotifications(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          <History className="w-4 h-4" />
                          Vedi tutte ({notifications.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 lg:p-4">
          <Outlet />
        </main>
      </div>

      {/* Modal Storico Notifiche */}
      <Modal
        isOpen={showAllNotifications}
        onClose={() => setShowAllNotifications(false)}
        title="Cronologia Attività"
        size="lg"
      >
        <div className="space-y-4">
          {/* Header con azioni */}
          <div className="flex items-center justify-between pb-3 border-b border-dark-700">
            <p className="text-sm text-dark-400">
              {notifications.length} notifiche totali, {unreadCount} non lette
            </p>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-dark-700"
                  >
                    <Check className="w-3 h-3" />
                    Segna tutte lette
                  </button>
                  <button
                    onClick={() => {
                      clearAllNotifications();
                      setShowAllNotifications(false);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-dark-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    Cancella tutte
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500/20"></div>
              <span className="text-dark-400">Nuovo ordine</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500/20"></div>
              <span className="text-dark-400">Modifica</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500/20"></div>
              <span className="text-dark-400">Eliminazione</span>
            </div>
          </div>

          {/* Lista completa notifiche */}
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-dark-700">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <History className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">Nessuna attività registrata</p>
                <p className="text-xs text-dark-500 mt-1">
                  Le notifiche di creazione, modifica ed eliminazione ordini appariranno qui
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  showFullDate={true}
                />
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
