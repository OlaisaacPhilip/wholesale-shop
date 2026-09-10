import { useState, useEffect } from 'react';
import api from '../api';

export default function PlatformFeedbackInbox() {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    try {
      const res = await api.get('/feedback/platform');
      setFeedback(res.data);
    } catch (err) {
      setError('Failed to load feedback');
    }
  }

  return (
    <div>
      <h2>Shop Feedback to Meloshop</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {feedback.length === 0 && <p>No feedback yet.</p>}
      {feedback.map((f) => (
        <div key={f._id} className="card">
          <p>{f.message}</p>
          <p style={{ fontSize: '13px', color: '#666' }}>
            From: {f.adminId?.name} ({f.adminId?.email}) — Shop: {f.shopId?.name} — {new Date(f.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}