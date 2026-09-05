require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://wholesale-shop-nu.vercel.app'
  ]
}));

app.use(express.json());
app.use('/uploads', express.static('uploads')); // makes uploaded images publicly viewable

// ---------- Connect to MongoDB Atlas ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ---------- USER MODEL ----------
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['customer', 'delivery', 'admin'],
    default: 'customer'
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ---------- PRODUCT MODEL ----------
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  description: { type: String },
  imageUrl: { type: String, default: '' },
  category: { type: String, required: true, default: 'General' }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// ---------- ORDER MODEL ----------
const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  deliveryAddress: { type: String, required: true },
  contactPhone: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'available', 'claimed', 'delivered'],
    default: 'pending'
  },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  claimedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// ---------- Routes ----------
const authRoutes = require('./routes/auth')(User);
app.use('/api/auth', authRoutes);

const productRoutes = require('./routes/products')(Product);
app.use('/api/products', productRoutes);

const orderRoutes = require('./routes/orders')(Order, Product);
app.use('/api/orders', orderRoutes);

const paymentRoutes = require('./routes/payment')(Order, Product);
app.use('/api/payment', paymentRoutes);

const deliveryRoutes = require('./routes/delivery')(Order);
app.use('/api/delivery', deliveryRoutes);

const statsRoutes = require('./routes/stats')(Order);
app.use('/api/stats', statsRoutes);

// ---------- Test route ----------
app.get('/', (req, res) => {
  res.send('Wholesale Shop API is running');
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, User, Product, Order };