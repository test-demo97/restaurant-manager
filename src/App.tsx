import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/Toast';
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

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders/new" element={<NewOrder />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="tables" element={<Tables />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="staff" element={<Staff />} />
          <Route path="reports" element={<Reports />} />
          <Route path="smac" element={<Smac />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
}

export default App;
