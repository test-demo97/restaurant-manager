import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../types';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Nuovo Ordine', href: '/orders/new', icon: ShoppingCart, permission: 'orders.new' },
  { name: 'Ordini', href: '/orders', icon: ChefHat, permission: 'orders' },
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed, permission: 'menu' },
  { name: 'Tavoli', href: '/tables', icon: CalendarDays, permission: 'tables' },
  { name: 'Inventario', href: '/inventory', icon: Package, permission: 'inventory' },
  { name: 'Ricette', href: '/recipes', icon: BookOpen, permission: 'recipes' },
  { name: 'Personale', href: '/staff', icon: Users, permission: 'staff' },
  { name: 'Report', href: '/reports', icon: BarChart3, permission: 'reports' },
  { name: 'SMAC', href: '/smac', icon: CreditCard, permission: 'smac' },
  { name: 'Impostazioni', href: '/settings', icon: Settings, permission: 'settings' },
  { name: 'Utenti', href: '/users', icon: UserCog, permission: 'users' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, hasPermission } = useAuth();

  // Filtra navigazione in base ai permessi
  const filteredNavigation = navigation.filter((item) => hasPermission(item.permission));

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
        className={`fixed left-0 top-0 h-screen w-72 lg:w-64 bg-dark-900 border-r border-dark-700 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header con logo e close button */}
        <div className="p-4 lg:p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-dark-900" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">Kebab</h1>
                <p className="text-xs text-dark-400">San Marino</p>
              </div>
            </div>
            {/* Close button - solo mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-primary-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{user.name}</p>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getRoleBadgeClass()}`}>
                  <Shield className="w-3 h-3" />
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-dark-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>
          <div className="text-xs text-dark-500 text-center mt-3 hidden lg:block">
            <p>Versione 2.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
