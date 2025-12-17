import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';

// Lazy load delle pagine per ottimizzare il bundle
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const NewOrder = lazy(() => import('./pages/NewOrder').then(m => ({ default: m.NewOrder })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const Menu = lazy(() => import('./pages/Menu').then(m => ({ default: m.Menu })));
const Tables = lazy(() => import('./pages/Tables').then(m => ({ default: m.Tables })));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Recipes = lazy(() => import('./pages/Recipes').then(m => ({ default: m.Recipes })));
const Staff = lazy(() => import('./pages/Staff').then(m => ({ default: m.Staff })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Smac = lazy(() => import('./pages/Smac').then(m => ({ default: m.Smac })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));

// Loading component per Suspense
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <HashRouter>
        <Routes>
          {/* Route pubblica: Login */}
          <Route path="/login" element={<Login />} />

          {/* Route protette */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            {/* Dashboard - solo admin e superadmin */}
            <Route
              index
              element={
                <PrivateRoute permission="dashboard">
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Ordini - tutti */}
            <Route
              path="orders/new"
              element={
                <PrivateRoute permission="orders.new">
                  <Suspense fallback={<PageLoader />}>
                    <NewOrder />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="orders"
              element={
                <PrivateRoute permission="orders">
                  <Suspense fallback={<PageLoader />}>
                    <Orders />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Menu - admin e superadmin */}
            <Route
              path="menu"
              element={
                <PrivateRoute permission="menu">
                  <Suspense fallback={<PageLoader />}>
                    <Menu />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Tavoli - tutti */}
            <Route
              path="tables"
              element={
                <PrivateRoute permission="tables">
                  <Suspense fallback={<PageLoader />}>
                    <Tables />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Inventario - admin e superadmin */}
            <Route
              path="inventory"
              element={
                <PrivateRoute permission="inventory">
                  <Suspense fallback={<PageLoader />}>
                    <Inventory />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Ricette - admin e superadmin */}
            <Route
              path="recipes"
              element={
                <PrivateRoute permission="recipes">
                  <Suspense fallback={<PageLoader />}>
                    <Recipes />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Personale - admin e superadmin */}
            <Route
              path="staff"
              element={
                <PrivateRoute permission="staff">
                  <Suspense fallback={<PageLoader />}>
                    <Staff />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Report - solo superadmin */}
            <Route
              path="reports"
              element={
                <PrivateRoute permission="reports">
                  <Suspense fallback={<PageLoader />}>
                    <Reports />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* SMAC - solo superadmin */}
            <Route
              path="smac"
              element={
                <PrivateRoute permission="smac">
                  <Suspense fallback={<PageLoader />}>
                    <Smac />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Impostazioni - solo superadmin */}
            <Route
              path="settings"
              element={
                <PrivateRoute permission="settings">
                  <Suspense fallback={<PageLoader />}>
                    <Settings />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Gestione Utenti - solo superadmin */}
            <Route
              path="users"
              element={
                <PrivateRoute permission="users">
                  <Suspense fallback={<PageLoader />}>
                    <Users />
                  </Suspense>
                </PrivateRoute>
              }
            />
          </Route>

          {/* Catch-all: redirect al login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
              <ToastContainer />
            </HashRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
