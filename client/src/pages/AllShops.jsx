import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

function daysRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AllShops() {
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    try {
      const res = await api.get('/shops');
      setShops(res.data);
    } catch (err) {
      setError('Failed to load shops');
    }
  }

  async function handleHold(shopId) {
    try {
      await api.patch(`/shops/${shopId}/hold`);
      loadShops();
    } catch (err) {
      setError('Failed to hold shop');
    }
  }

  async function handleUnhold(shopId) {
    try {
      await api.patch(`/shops/${shopId}/unhold`);
      loadShops();
    } catch (err) {
      setError('Failed to unhold shop');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>All Shops</h2>
        <div>
          <button onClick={() => navigate('/pending-shops')}>Pending</button>
          <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {shops.map((shop) => {
        const days = daysRemaining(shop.trialEndsAt);
        return (
          <div key={shop._id} className="card">
            <h4>{shop.name}</h4>
            <p>Owner: {shop.ownerName} - {shop.ownerEmail}</p>
            <p>Status: <strong>{shop.status}</strong></p>
            <p>Subscription: {shop.subscriptionStatus}</p>
            {shop.subscriptionStatus === 'trial' && shop.status === 'active' && (
              <p style={{ color: days <= 7 ? '#c62828' : 'inherit' }}>
                {days >= 0 ? `Trial ends in ${days} day(s)` : 'Trial expired'}
              </p>
            )}
            {shop.status === 'held' ? (
              <button onClick={() => handleUnhold(shop._id)}>Unhold</button>
            ) : shop.status === 'active' ? (
              <button onClick={() => handleHold(shop._id)} style={{ backgroundColor: '#c62828' }}>Hold</button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}