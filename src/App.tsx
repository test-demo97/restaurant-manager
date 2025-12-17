import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/Toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewOrder } from './pages/NewOrder';
import { Orders } from './pages/Orders';
import { Menu } from './pages/Menu';
import { Tables } from './pages/Tables';
import { Inventory } from './pages/Inventory';
import { Recipes } from './pages/Recipes';
import { Staff } from './pages/Staff';
import { Reports } from './pages/Reports';
import { Smac } from './pages/Smac';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';

function App() {
  return (
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
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* Ordini - tutti */}
            <Route
              path="orders/new"
              element={
                <PrivateRoute permission="orders.new">
                  <NewOrder />
                </PrivateRoute>
              }
            />
            <Route
              path="orders"
              element={
                <PrivateRoute permission="orders">
                  <Orders />
                </PrivateRoute>
              }
            />

            {/* Menu - admin e superadmin */}
            <Route
              path="menu"
              element={
                <PrivateRoute permission="menu">
                  <Menu />
                </PrivateRoute>
              }
            />

            {/* Tavoli - tutti */}
            <Route
              path="tables"
              element={
                <PrivateRoute permission="tables">
                  <Tables />
                </PrivateRoute>
              }
            />

            {/* Inventario - admin e superadmin */}
            <Route
              path="inventory"
              element={
                <PrivateRoute permission="inventory">
                  <Inventory />
                </PrivateRoute>
              }
            />

            {/* Ricette - admin e superadmin */}
            <Route
              path="recipes"
              element={
                <PrivateRoute permission="recipes">
                  <Recipes />
                </PrivateRoute>
              }
            />

            {/* Personale - admin e superadmin */}
            <Route
              path="staff"
              element={
                <PrivateRoute permission="staff">
                  <Staff />
                </PrivateRoute>
              }
            />

            {/* Report - solo superadmin */}
            <Route
              path="reports"
              element={
                <PrivateRoute permission="reports">
                  <Reports />
                </PrivateRoute>
              }
            />

            {/* SMAC - solo superadmin */}
            <Route
              path="smac"
              element={
                <PrivateRoute permission="smac">
                  <Smac />
                </PrivateRoute>
              }
            />

            {/* Impostazioni - solo superadmin */}
            <Route
              path="settings"
              element={
                <PrivateRoute permission="settings">
                  <Settings />
                </PrivateRoute>
              }
            />

            {/* Gestione Utenti - solo superadmin */}
            <Route
              path="users"
              element={
                <PrivateRoute permission="users">
                  <Users />
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
  );
}

export default App;
