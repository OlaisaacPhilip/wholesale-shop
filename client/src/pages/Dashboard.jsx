import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [finance, setFinance] = useState(null);
  const [range, setRange] = useState('day');
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    if (user?.role === 'admin') loadFinanceSummary();
  }, [range]);

  async function loadStats() {
    try {
      const res = await api.get(`/stats?range=${range}`);
      setStats(res.data);
    } catch (err) {
      setError('Failed to load stats');
    }
  }

  async function loadFinanceSummary() {
    try {
      const res = await api.get('/finance/summary');
      setFinance(res.data);
    } catch (err) {
      setError('Failed to load financial summary');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div>
          {user?.role === 'admin' && (
            <>
              <button onClick={() => navigate('/products')}>Manage Products</button>
              <button onClick={() => navigate('/manage-team')}>Manage Team</button>
            </>
          )}
          {user?.role === 'delivery' && (
            <>
              <button onClick={() => navigate('/available-orders')}>Available Orders</button>
              <button onClick={() => navigate('/my-deliveries')}>My Deliveries</button>
            </>
          )}
          <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: '15px' }}>
        {['day', 'week', 'month', 'year'].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{ fontWeight: range === r ? 'bold' : 'normal', marginRight: '5px' }}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {stats ? (
        <div>
          <p><strong>Orders In:</strong> {stats.ordersIn}</p>
          <p><strong>Delivered:</strong> {stats.delivered}</p>
          <p><strong>Pending:</strong> {stats.pending}</p>
          <p><strong>Total Revenue:</strong> ₦{stats.totalRevenue}</p>
          {user?.role === 'delivery' && (
            <p style={{ fontStyle: 'italic' }}>Showing your own deliveries only</p>
          )}
          {user?.role === 'admin' && (
            <p style={{ fontStyle: 'italic' }}>Showing store-wide totals</p>
          )}
        </div>
      ) : (
        <p>Loading stats...</p>
      )}

      {user?.role === 'admin' && finance && (
        <div className="card">
          <h3>Business Valuation</h3>
          <p><strong>Stock Worth:</strong> ₦{finance.stockWorth.toLocaleString()}</p>
          <p><strong>Delivered Revenue:</strong> ₦{finance.deliveredRevenue.toLocaleString()}</p>
          <p><strong>Pending Value:</strong> ₦{finance.pendingValue.toLocaleString()}</p>
          <p><strong>Total Business Value:</strong> ₦{finance.totalBusinessValue.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}   
