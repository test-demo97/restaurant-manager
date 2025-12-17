import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getLowStockItems } from '../../lib/database';
import { useAuth } from '../../context/AuthContext';

export function Layout() {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64">
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
              <button className="relative p-2 hover:bg-dark-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5 lg:w-4 lg:h-4 text-dark-300" />
                {lowStockCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                    {lowStockCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 lg:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
