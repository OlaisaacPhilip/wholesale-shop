import { useState } from 'react';
import api from '../api';

export default function SubmitShopFeedback() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      const res = await api.post('/feedback/shop', { message });
      setStatus(res.data.message);
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    }
  }

  return (
    <div>
      <h2>Share Your Feedback</h2>
      <p>Tell us about your delivery experience, the shop, or anything you'd like improved.</p>
      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <textarea
          rows={5}
          placeholder="Your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          style={{ width: '100%' }}
        />
        <button type="submit">Send Feedback</button>
      </form>
    </div>
  );
}