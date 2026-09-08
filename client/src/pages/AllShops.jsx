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

  async function handleDemote(shopId) {
    if (!confirm('Demote this shop from Premium to Free? They will lose unlimited products and larger image uploads.')) return;
    try {
      await api.patch(`/shops/${shopId}/demote-to-free`);
      loadShops();
    } catch (err) {
      setError('Failed to demote shop');
    }
  }

  async function handlePromote(shopId) {
    if (!confirm('Promote this shop from Free to Premium?')) return;
    try {
      await api.patch(`/shops/${shopId}/promote-to-premium`);
      loadShops();
    } catch (err) {
      setError('Failed to promote shop');
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
            <p>Plan: <strong>{shop.plan === 'premium' ? 'Premium' : 'Free'}</strong></p>
            {shop.subscriptionStatus === 'trial' && shop.status === 'active' && (
              <p style={{ color: days <= 7 ? '#c62828' : 'inherit' }}>
                {shop.plan === 'premium'
                  ? (days >= 0 ? `Premium trial — payment due in ${days} day(s)` : 'Premium trial expired — payment overdue')
                  : (days >= 0 ? `Free trial: ${days} day(s) shown for reference` : 'Free trial period ended (no action needed)')}
              </p>
            )}
            {shop.plan === 'premium' ? (
              <button onClick={() => handleDemote(shop._id)} style={{ backgroundColor: '#e65100' }}>
                Demote to Free
              </button>
            ) : (
              <button onClick={() => handlePromote(shop._id)} style={{ backgroundColor: '#1565c0' }}>
                Promote to Premium
              </button>
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