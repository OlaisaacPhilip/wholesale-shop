import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function MyDeliveries() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await api.get('/delivery/my-deliveries');
      setOrders(res.data);
    } catch (err) {
      setError('Failed to load your deliveries');
    }
  }

  async function handleMarkDelivered(orderId) {
    try {
      await api.patch(`/delivery/${orderId}/deliver`);
      loadOrders(); // refresh status
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as delivered');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>My Deliveries</h2>
        <div>
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/available-orders')}>Available Orders</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {orders.map((order) => (
        <div key={order._id} className="card">
          <p>Order ID: {order._id}</p>
          <p>Delivery Address: {order.deliveryAddress}</p>
          <p>Contact Phone: {order.contactPhone}</p>
          <p>Payment: {order.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Card (Paid)'}</p>
          <p>Status: <strong>{order.status}</strong></p>
          <ul>
            {order.items.map((item, idx) => (
              <li key={idx}>{item.name} x {item.quantity}</li>
            ))}
          </ul>
          {order.status === 'claimed' && (
            <button onClick={() => handleMarkDelivered(order._id)}>Mark Delivered</button>
          )}
        </div>
      ))}
    </div>
  );
}