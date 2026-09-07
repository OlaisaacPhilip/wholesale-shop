import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shopId: '' });
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
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
    try {
      await api.post('/auth/signup', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  }

  return (
    <div>
      <h2>Sign Up</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
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
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}