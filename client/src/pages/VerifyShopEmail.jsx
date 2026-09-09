import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyShopEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    verify();
  }, []);

  async function verify() {
    try {
      const res = await api.post(`/shops/verify-email/${token}`);
      setShopName(res.data.shopName);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Verification failed');
    }
  }

  return (
    <div>
      <h2>Email Verification</h2>
      {status === 'verifying' && <p>Verifying your email...</p>}
      {status === 'success' && (
        <div>
          <p>Email verified for <strong>{shopName}</strong>!</p>
          <p>
            Your shop application is now pending review. You'll be able to log in once it's approved.
            If you have any questions, reach out directly:
          </p>
          <div className="card">
            <p><strong>Call:</strong> 07077941592</p>
            <p><strong>WhatsApp:</strong> 07013297651</p>
          </div>
          <Link to="/login">Back to Login</Link>
        </div>
      )}
      {status === 'error' && (
        <div>
          <p style={{ color: 'red' }}>{message}</p>
          <p><Link to="/login">Back to Login</Link></p>
        </div>
      )}
    </div>
  );
}