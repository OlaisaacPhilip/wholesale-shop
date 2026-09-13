import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function MyReferralCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCode();
  }, []);

  async function loadCode() {
    try {
      const res = await api.get('/referrals/my-code');
      setCode(res.data.referralCode);
    } catch (err) {
      setError('Failed to load referral code');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="page-header">
        <h2>My Referral Code</h2>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {code && (
        <div className="card">
          <p>Share this code with shop owners. When they sign up for Premium using your code, you earn ₦3,000 once their shop is approved.</p>
          <h2 style={{ letterSpacing: '2px' }}>{code}</h2>
          <button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy Code'}</button>
        </div>
      )}
    </div>
  );
}