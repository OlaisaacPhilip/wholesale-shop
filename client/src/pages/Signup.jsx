import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shopId: '' });
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/shops/active').then((res) => setShops(res.data)).catch(() => {});
  }, []);

  
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/auth/signup', form);
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  }

  return (
    <div>
      <h2>Sign Up</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Full Name" onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
        <input
          name="phone"
          type="text"
          placeholder="Phone Number (11 digits)"
          value={form.phone}
          onChange={handleChange}
          pattern="[0-9]{11}"
          maxLength="11"
          title="Phone number must be exactly 11 digits"
          required
        />
        <select name="shopId" onChange={handleChange} value={form.shopId} required>
          <option value="">Select a shop</option>
          {shops.map((shop) => (
            <option key={shop._id} value={shop._id}>{shop.name}</option>
          ))}
        </select>
        <div style={{ position: 'relative' }}>
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
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
        <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
          Save this password somewhere safe (e.g. your Google/Chrome password manager) — it'll be needed to log in.
        </p>
        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}