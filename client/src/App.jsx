import { Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import ShopApply from './pages/ShopApply';
import Login from './pages/Login';
import ProductList from './pages/ProductList';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import AvailableOrders from './pages/AvailableOrders';
import MyDeliveries from './pages/MyDeliveries';
import Dashboard from './pages/Dashboard';
import PendingShops from './pages/PendingShops';
import ManageTeam from './pages/ManageTeam';
import AllShops from './pages/AllShops';
import Help from './pages/Help';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shop-apply" element={<ShopApply />} />
      <Route path="/login" element={<Login />} />
      <Route path="/help" element={<Help />} />
      <Route path="/products" element={<ProductList />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/available-orders" element={<AvailableOrders />} />
      <Route path="/my-deliveries" element={<MyDeliveries />} />
       <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/pending-shops" element={<PendingShops />} />
      <Route path="/manage-team" element={<ManageTeam />} />
      <Route path="/all-shops" element={<AllShops />} />
    </Routes>
  );
}

export default App;