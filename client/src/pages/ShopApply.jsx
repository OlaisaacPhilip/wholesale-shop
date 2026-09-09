import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function ShopApply() {
  const [form, setForm] = useState({
    name: '', ownerName: '', ownerEmail: '', ownerPhone: '', password: '', plan: 'free'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/shops/apply', form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <h2>Application Submitted</h2>
        <p>
          Thanks, <strong>{form.ownerName}</strong>! Your shop <strong>"{form.name}"</strong> is
          now pending review.
        </p>
        <p>
          You'll be able to log in once your shop is approved. This usually doesn't take long —
          if you have any questions or want to follow up, reach out directly:
        </p>
        <div className="card">
          <p><strong>Call:</strong> 07077941592</p>
          <p><strong>WhatsApp:</strong> 07013297651</p>
        </div>
        <button onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Apply to List Your Shop</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Shop Name" value={form.name} onChange={handleChange} required />
        <input name="ownerName" placeholder="Your Full Name" value={form.ownerName} onChange={handleChange} required />
        <input name="ownerEmail" type="email" placeholder="Your Email" value={form.ownerEmail} onChange={handleChange} required />
        <input name="ownerPhone" placeholder="Your Phone Number" value={form.ownerPhone} onChange={handleChange} required />
        <div style={{ position: 'relative' }}>
          <input
            <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Choose a Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ paddingRight: '45px' }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#1565c0'
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </span>
        </div>

        <h3>Choose a Plan</h3>
        <div>
          <label>
            <input type="radio" name="plan" value="free" checked={form.plan === 'free'} onChange={handleChange} />
            Free — up to 100 products, 1MB image uploads
          </label>
        </div>
        <div>
          <label>
            <input type="radio" name="plan" value="premium" checked={form.plan === 'premium'} onChange={handleChange} />
            Premium — unlimited products, larger image uploads (₦5000/month)
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
      <p>Already have a shop account? <Link to="/login">Login</Link></p>
    </div>
  );
}