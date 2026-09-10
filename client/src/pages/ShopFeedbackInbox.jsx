import { useState, useEffect } from 'react';
import api from '../api';

export default function ShopFeedbackInbox() {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    try {
      const res = await api.get('/feedback/shop');
      setFeedback(res.data);
    } catch (err) {
      setError('Failed to load feedback');
    }
  }

  return (
    <div>
      <h2>Customer Feedback</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {feedback.length === 0 && <p>No feedback yet.</p>}
      {feedback.map((f) => (
        <div key={f._id} className="card">
          <p>{f.message}</p>
          <p style={{ fontSize: '13px', color: '#666' }}>
            From: {f.customerId?.name} ({f.customerId?.email}) — {new Date(f.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}