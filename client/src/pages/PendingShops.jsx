import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function PendingShops() {
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    try {
      const res = await api.get('/shops/pending');
      setShops(res.data);
    } catch (err) {
      console.error('Pending shops error:', err.response?.status, err.response?.data);
      setError('Failed to load pending shops');
    }
  }

  async function handleApprove(shopId) {
    try {
      await api.patch(`/shops/${shopId}/approve`);
      loadShops();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve shop');
    }
  }

  async function handleReject(shopId) {
    const reason = prompt('Reason for rejection (optional):') || '';
    try {
      await api.patch(`/shops/${shopId}/reject`, { reason });
      loadShops();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject shop');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Pending Shop Applications</h2>
        <div>
          <button onClick={() => navigate('/all-shops')}>All Shops</button>
          <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {shops.length === 0 && <p>No pending applications right now.</p>}

      {shops.map((shop) => (
        <div key={shop._id} className="card">
          <h4>{shop.name}</h4>
          <p>Owner: {shop.ownerName}</p>
          <p>Email: {shop.ownerEmail}</p>
          <p>Phone: {shop.ownerPhone}</p>
          <p>Applied: {new Date(shop.createdAt).toLocaleDateString()}</p>
          <button onClick={() => handleApprove(shop._id)}>Approve</button>
          <button onClick={() => handleReject(shop._id)} style={{ backgroundColor: '#c62828' }}>Reject</button>
        </div>
      ))}
    </div>
  );
}