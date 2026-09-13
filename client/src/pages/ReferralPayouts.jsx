import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ReferralPayouts() {
  const [referrals, setReferrals] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
    try {
      const res = await api.get('/referrals');
      setReferrals(res.data);
    } catch (err) {
      setError('Failed to load referrals');
    }
  }

  async function handleMarkPaid(id) {
    if (!confirm('Mark this referral as paid?')) return;
    try {
      await api.patch(`/referrals/${id}/mark-paid`);
      loadReferrals();
    } catch (err) {
      setError('Failed to update referral');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Referral Payouts</h2>
        <button onClick={() => navigate('/all-shops')}>All Shops</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {referrals.length === 0 && <p>No referrals yet.</p>}

      {referrals.map((r) => (
        <div key={r._id} className="card">
          <p>Referrer: {r.referrerId?.name} — {r.referrerId?.phone}</p>
          <p>Shop: {r.shopId?.name}</p>
          <p>Amount: ₦{r.amount.toLocaleString()}</p>
          <p>Status: <strong>{r.status}</strong></p>
          {r.status === 'pending' ? (
            <button onClick={() => handleMarkPaid(r._id)}>Mark as Paid</button>
          ) : (
            <p style={{ fontSize: '13px', color: '#666' }}>Paid on {new Date(r.paidAt).toLocaleDateString()}</p>
          )}
        </div>
      ))}
    </div>
  );
}