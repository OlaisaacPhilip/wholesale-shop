import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);

      // redirect based on role
      if (res.data.user.role === 'superadmin') {
        navigate('/pending-shops');
      } else if (res.data.user.role === 'admin' || res.data.user.role === 'delivery') {
        navigate('/dashboard');
      } else {
        navigate('/products');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Login</h2>
      {loading && (
        <p style={{ fontSize: '13px', color: '#666' }}>
          Logging in... this may take up to a minute if the app is waking up after being idle.
        </p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
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
        {/* <p><Link to="/forgot-password">Forgot password?</Link></p> */}
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <p>To register as customer? <Link to="/signup">Sign up </Link></p>
        <p>To register your shop? <Link to="/shop-apply">Apply here</Link></p>
      <p><Link to="/help">Need help using the app?</Link></p>
    </div>
  );
}