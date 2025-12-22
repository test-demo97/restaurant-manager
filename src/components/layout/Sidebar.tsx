/**
 * RESTAURANT MANAGER SYSTEM
 * Copyright (c) 2025 Andrea Fabbri. Tutti i diritti riservati.
 * Licenza: Proprietaria - Vedere file LICENSE
 */

import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  ChefHat,
  CreditCard,
  BookOpen,
  LogOut,
  UserCog,
  Shield,
  X,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Calculator,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSmac } from '../../context/SmacContext';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { ROLE_LABELS } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getSettings } from '../../lib/database';

// Menu organizzato per gruppi logici:
// 1. Panoramica (superadmin)
// 2. Operazioni quotidiane (tutti)
// 3. Gestione prodotti (admin)
// 4. Gestione risorse (admin)
// 5. Amministrazione (admin/superadmin)
// 6. Sistema (superadmin)
// 7. Aiuto (tutti)
const navigation = [
  // Panoramica
  { nameKey: 'sidebar.dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard' },
  // Operazioni quotidiane - usate da tutti
  { nameKey: 'sidebar.newOrder', href: '/orders/new', icon: ShoppingCart, permission: 'orders.new' },
  { nameKey: 'sidebar.orders', href: '/orders', icon: ChefHat, permission: 'orders' },
  { nameKey: 'sidebar.tables', href: '/tables', icon: CalendarDays, permission: 'tables' },
  // Gestione prodotti
  { nameKey: 'sidebar.menu', href: '/menu', icon: UtensilsCrossed, permission: 'menu' },
  { nameKey: 'sidebar.recipes', href: '/recipes', icon: BookOpen, permission: 'recipes' },
  { nameKey: 'sidebar.dishCosts', href: '/dish-costs', icon: Calculator, permission: 'dish-costs' },
  // Gestione risorse
  { nameKey: 'sidebar.inventory', href: '/inventory', icon: Package, permission: 'inventory' },
  { nameKey: 'sidebar.staff', href: '/staff', icon: Users, permission: 'staff' },
  // Amministrazione
  { nameKey: 'sidebar.cashRegister', href: '/cash-register', icon: Receipt, permission: 'cash-register' },
  { nameKey: 'sidebar.smac', href: '/smac', icon: CreditCard, permission: 'smac' },
  { nameKey: 'sidebar.reports', href: '/reports', icon: BarChart3, permission: 'reports' },
  // Sistema
  { nameKey: 'sidebar.settings', href: '/settings', icon: Settings, permission: 'settings' },
  { nameKey: 'sidebar.users', href: '/users', icon: UserCog, permission: 'users' },
  // Aiuto - visibile a tutti
  { nameKey: 'sidebar.guide', href: '/guide', icon: HelpCircle, permission: 'guide' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, hasPermission } = useAuth();
  const { isRealtimeConnected } = useNotifications();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useTheme();
  const { t } = useLanguage();
  const { smacEnabled } = useSmac();
  const { canAccessFeature } = usePlanFeatures();
  const [shopName, setShopName] = useState('Il Mio Ristorante');

  // Carica il nome del ristorante dalle settings
  useEffect(() => {
    function loadShopName() {
      getSettings().then((settings) => {
        if (settings.shop_name) {
          setShopName(settings.shop_name);
        }
      });
    }

    loadShopName();

    // Ascolta per aggiornamenti delle settings
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.shop_name) {
        setShopName(event.detail.shop_name);
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  // Filtra navigazione in base ai permessi, piano licenza e impostazioni SMAC
  const filteredNavigation = navigation.filter((item) => {
    // Nascondi SMAC se disabilitato nelle impostazioni
    if (item.href === '/smac' && !smacEnabled) return false;
    // Nascondi se il piano non include questa funzionalità
    if (!canAccessFeature(item.permission)) return false;
    // Controlla i permessi dell'utente
    return hasPermission(item.permission);
  });

  function getRoleBadgeClass() {
    switch (user?.role) {
      case 'superadmin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'admin':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'staff':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-dark-700 text-dark-400';
    }
  }

  function handleNavClick() {
    // Chiudi sidebar su mobile quando si clicca un link
    if (window.innerWidth < 1024) {
      onClose();
    }
  }

  function handleLogout() {
    onClose();
    logout();
  }

  // Determina la larghezza della sidebar
  const sidebarWidth = sidebarCollapsed ? 'lg:w-20' : 'lg:w-64';

  return (
    <>
      {/* Overlay per mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 ${sidebarWidth} bg-dark-900 border-r border-dark-700 flex flex-col z-50 transform transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header compatto con nome ristorante e utente */}
        <div className={`px-3 py-2 ${sidebarCollapsed ? 'lg:px-2' : ''} border-b border-dark-700`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : 'gap-2'}`}>
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-dark-900" />
              </div>
              <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
                <h1 className="font-semibold text-sm text-white truncate max-w-[160px]" title={shopName}>
                  {shopName}
                </h1>
              </div>
            </div>
            {/* Close button - solo mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>

          {/* User info inline - compatto */}
          {user && !sidebarCollapsed && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-700/50">
              <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <p className="font-medium text-white text-xs truncate">{user.name}</p>
                <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border ${getRoleBadgeClass()}`}>
                  <Shield className="w-2.5 h-2.5" />
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
            </div>
          )}

          {/* User avatar quando collapsed */}
          {user && sidebarCollapsed && (
            <div className="hidden lg:flex justify-center mt-2 pt-2 border-t border-dark-700/50">
              <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center" title={user.name}>
                <span className="text-sm font-semibold text-primary-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 p-3 ${sidebarCollapsed ? 'lg:p-2' : 'lg:p-4'} space-y-1 overflow-y-auto`}>
          {filteredNavigation.map((item) => {
            const itemName = t(item.nameKey);
            return (
              <NavLink
                key={item.nameKey}
                to={item.href}
                onClick={handleNavClick}
                title={sidebarCollapsed ? itemName : undefined}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''}`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className={`flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{itemName}</span>
                {/* Live indicator for Orders */}
                {item.href === '/orders' && isSupabaseConfigured && !sidebarCollapsed && (
                  <span
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                      isRealtimeConnected
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                    title={isRealtimeConnected ? 'Connesso in tempo reale' : 'Non connesso'}
                  >
                    {isRealtimeConnected ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                  </span>
                )}
                {/* Collapsed indicator - dot for orders */}
                {item.href === '/orders' && isSupabaseConfigured && sidebarCollapsed && (
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full hidden lg:block ${
                      isRealtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section - Compatto */}
        <div className={`p-2 ${sidebarCollapsed ? 'lg:p-1.5' : ''} border-t border-dark-700 space-y-1`}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('sidebar.lightTheme') : t('sidebar.darkTheme')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors ${
              sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 flex-shrink-0" />
            )}
            <span className={`text-sm ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{theme === 'dark' ? t('sidebar.lightTheme') : t('sidebar.darkTheme')}</span>
          </button>

          {/* Collapse Toggle - solo desktop */}
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
            className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-4 h-4 flex-shrink-0" />
            ) : (
              <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
            )}
            {!sidebarCollapsed && <span className="text-sm">{t('sidebar.collapseMenu')}</span>}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? t('sidebar.logout') : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors ${
              sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={`text-sm ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{t('sidebar.logout')}</span>
          </button>

          <div className={`text-[9px] text-dark-500 text-center ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            v3.0 · © 2025 Andrea Fabbri
          </div>
        </div>
      </aside>
    </>
  );
}
