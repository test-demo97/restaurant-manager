/**
 * RESTAURANT MANAGER SYSTEM
 *
 * Copyright (c) 2025 Andrea Fabbri. Tutti i diritti riservati.
 *
 * Questo software è proprietario e confidenziale.
 * L'uso, la copia, la modifica o la distribuzione non autorizzata
 * di questo software è severamente vietata.
 *
 * Licenza: Proprietaria - Vedere file LICENSE per i dettagli
 * Versione: 3.0
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
import { DemoWatermark } from './components/DemoWatermark';
import { Login } from './pages/Login';
import { LicenseBlocked } from './pages/LicenseBlocked';
import { UpgradeRequired } from './pages/UpgradeRequired';
import { usePlanFeatures } from './hooks/usePlanFeatures';

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
  const { isLicenseValid, isInitializing } = useLicense();

  // Mostra loader SOLO durante il primo check all'avvio
  if (isInitializing) {
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

  return (
    <>
      <DemoWatermark />
      {children}
    </>
  );
}

// Componente per route che richiedono un piano specifico
function PlanRestrictedRoute({
  children,
  permission,
  requiredPlan
}: {
  children: React.ReactNode;
  permission: string;
  requiredPlan: 'standard' | 'premium';
}) {
  const { canAccessFeature } = usePlanFeatures();

  // Se il piano non include questa funzionalità, mostra la pagina di upgrade
  if (!canAccessFeature(permission)) {
    return <UpgradeRequired requiredPlan={requiredPlan} feature={permission} />;
  }

  return <PrivateRoute permission={permission}>{children}</PrivateRoute>;
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

            {/* Inventario - premium */}
            <Route
              path="inventory"
              element={
                <PlanRestrictedRoute permission="inventory" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <Inventory />
                  </Suspense>
                </PlanRestrictedRoute>
              }
            />

            {/* Ricette - premium */}
            <Route
              path="recipes"
              element={
                <PlanRestrictedRoute permission="recipes" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <Recipes />
                  </Suspense>
                </PlanRestrictedRoute>
              }
            />

            {/* Personale - premium */}
            <Route
              path="staff"
              element={
                <PlanRestrictedRoute permission="staff" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <Staff />
                  </Suspense>
                </PlanRestrictedRoute>
              }
            />

            {/* Report - premium */}
            <Route
              path="reports"
              element={
                <PlanRestrictedRoute permission="reports" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <Reports />
                  </Suspense>
                </PlanRestrictedRoute>
              }
            />

            {/* SMAC - premium */}
            <Route
              path="smac"
              element={
                <PlanRestrictedRoute permission="smac" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <Smac />
                  </Suspense>
                </PlanRestrictedRoute>
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

            {/* Gestione Utenti - standard (modifica) / premium (creazione) */}
            <Route
              path="users"
              element={
                <PlanRestrictedRoute permission="users" requiredPlan="standard">
                  <Suspense fallback={<PageLoader />}>
                    <Users />
                  </Suspense>
                </PlanRestrictedRoute>
              }
            />

            {/* Chiusura Cassa - premium */}
            <Route
              path="cash-register"
              element={
                <PlanRestrictedRoute permission="cash-register" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <CashRegister />
                  </Suspense>
                </PlanRestrictedRoute>
              }
            />

            {/* Costo Piatti - premium */}
            <Route
              path="dish-costs"
              element={
                <PlanRestrictedRoute permission="dish-costs" requiredPlan="premium">
                  <Suspense fallback={<PageLoader />}>
                    <DishCosts />
                  </Suspense>
                </PlanRestrictedRoute>
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
