import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ExpandableText from '../components/ExpandableText';

export default function ProductList() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '', description: '', category: '' });
  const [imageFile, setImageFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      setError('Failed to load products');
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('price', form.price);
      data.append('stock', form.stock);
      data.append('description', form.description);
      data.append('category', form.category);
      if (imageFile) data.append('image', imageFile);

      await api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setForm({ name: '', price: '', stock: '', description: '', category: '' });
      setImageFile(null);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add product');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      setError('Failed to delete product');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Products</h2>
<div>
          {(user?.role === 'admin' || user?.role === 'delivery') && (
            <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          )}
          {user?.role === 'customer' && <button onClick={() => navigate('/cart')}>View Cart</button>}
          <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <input
        type="text"
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '10px', width: '100%' }}
      />

      <div style={{ marginBottom: '10px' }}>
        {['All', ...new Set(products.map((p) => p.category))].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{ fontWeight: categoryFilter === cat ? 'bold' : 'normal', marginRight: '5px' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Only admins see the add-product form */}
      {user?.role === 'admin' && (
        <form onSubmit={handleAddProduct} style={{ marginBottom: '20px' }}>
          <h3>Add Product</h3>
          <input name="name" placeholder="Product name" value={form.name} onChange={handleChange} required />
          <input name="price" type="number" placeholder="Price" value={form.price} onChange={handleChange} required />
          <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} required />
          <input name="description" placeholder="Description" value={form.description} onChange={handleChange} />
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          <input name="category" placeholder="Category (e.g. Beverages)" value={form.category} onChange={handleChange} required />
          <button type="submit">Add</button>
        </form>
      )}

      <div>
        {products
          .filter((p) => categoryFilter === 'All' || p.category === categoryFilter)
          .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((p) => (
          <div key={p._id} className="card">
            {p.imageUrl && <img src={`https://wholesale-shop-0pi1.onrender.com${p.imageUrl}`} alt={p.name} style={{ maxWidth: '150px' }} />}
            <h4>{p.name}</h4>
            <p>₦{p.price} — Stock: {p.stock}</p>
            <ExpandableText text={p.description} />
            {user?.role === 'admin' && (
              <button onClick={() => handleDelete(p._id)}>Delete</button>
            )}
            {user?.role === 'customer' && (
              <button onClick={() => addToCart(p)}>Add to Cart</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}