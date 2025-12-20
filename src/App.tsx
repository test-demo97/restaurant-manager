/**
 * RESTAURANT MANAGER SYSTEM
 *
 * Copyright (c) 2024-2025 Andrea Fabbri. Tutti i diritti riservati.
 *
 * Questo software è proprietario e confidenziale.
 * L'uso, la copia, la modifica o la distribuzione non autorizzata
 * di questo software è severamente vietata.
 *
 * Licenza: Proprietaria - Vedere file LICENSE per i dettagli
 * Versione: 2.5
 */

import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { SmacProvider } from './context/SmacContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { LicenseBlocked } from './pages/LicenseBlocked';

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
const CashRegister = lazy(() => import('./pages/CashRegister').then(m => ({ default: m.CashRegister })));
const DishCosts = lazy(() => import('./pages/DishCosts').then(m => ({ default: m.DishCosts })));
const GuideFAQ = lazy(() => import('./pages/GuideFAQ').then(m => ({ default: m.GuideFAQ })));

// Loading component per Suspense
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  );
}

// Componente che ricontrolla la licenza ad ogni cambio di pagina
function LicenseRouteChecker() {
  const location = useLocation();
  const { recheckLicense } = useLicense();

  useEffect(() => {
    // Ricontrolla la licenza ad ogni cambio di route
    recheckLicense();
  }, [location.pathname, recheckLicense]);

  return null;
}

// Componente che controlla la licenza
function LicenseGate({ children }: { children: React.ReactNode }) {
  const { isLicenseValid, isChecking } = useLicense();

  // Durante il check iniziale, mostra un loader
  if (isChecking) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-400">Verifica licenza...</p>
        </div>
      </div>
    );
  }

  // Se la licenza non è valida, mostra la pagina di blocco
  if (!isLicenseValid) {
    return <LicenseBlocked />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <LicenseProvider>
            <LicenseGate>
              <SmacProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <HashRouter>
        <LicenseRouteChecker />
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

            {/* Chiusura Cassa - admin e superadmin */}
            <Route
              path="cash-register"
              element={
                <PrivateRoute permission="cash-register">
                  <Suspense fallback={<PageLoader />}>
                    <CashRegister />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Costo Piatti - admin e superadmin */}
            <Route
              path="dish-costs"
              element={
                <PrivateRoute permission="dish-costs">
                  <Suspense fallback={<PageLoader />}>
                    <DishCosts />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Guida e FAQ - tutti */}
            <Route
              path="guide"
              element={
                <PrivateRoute permission="guide">
                  <Suspense fallback={<PageLoader />}>
                    <GuideFAQ />
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
              </SmacProvider>
            </LicenseGate>
          </LicenseProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
