import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    verify();
  }, []);

  async function verify() {
    try {
      const res = await api.post(`/auth/verify-email/${token}`);
      login(res.data.user, res.data.token);
      setStatus('success');

      // small delay so they see the success message before redirecting
      setTimeout(() => {
        navigate('/products');
      }, 1500);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Verification failed');
    }
  }

  return (
    <div>
      <h2>Email Verification</h2>
      {status === 'verifying' && <p>Verifying your email...</p>}
      {status === 'success' && <p>Email verified! Logging you in...</p>}
      {status === 'error' && (
        <div>
          <p style={{ color: 'red' }}>{message}</p>
          <p><Link to="/login">Back to Login</Link></p>
        </div>
      )}
    </div>
  );
}