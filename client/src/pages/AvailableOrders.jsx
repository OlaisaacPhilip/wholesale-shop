import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AvailableOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await api.get('/delivery/available');
      setOrders(res.data);
    } catch (err) {
      setError('Failed to load available orders');
    }
  }

  async function handleClaim(orderId) {
    try {
      await api.patch(`/delivery/${orderId}/claim`);
      loadOrders(); // refresh — claimed order disappears from this list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim order');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Available Orders</h2>
        <div>
          <div>
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/my-deliveries')}>My Deliveries</button>
          <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {orders.length === 0 && <p>No available orders right now.</p>}

      {orders.map((order) => (
        <div key={order._id} className="card">
          <p>Order ID: {order._id}</p>
          <p>Delivery Address: {order.deliveryAddress}</p>
          <p>Contact Phone: {order.contactPhone}</p>
          <p>Payment: {order.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Card (Paid)'}</p>
          <p>Total: ₦{order.totalAmount}</p>
          <ul>
            {order.items.map((item, idx) => (
              <li key={idx}>{item.name} x {item.quantity}</li>
            ))}
          </ul>
          <button onClick={() => handleClaim(order._id)}>Claim This Order</button>
        </div>
      ))}
    </div>
  );
}