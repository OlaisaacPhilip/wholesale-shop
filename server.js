require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
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
resetPasswordToken: { type: String },
resetPasswordExpires: { type: Date },
  role: {
    type: String,
    enum: ['customer', 'delivery', 'admin', 'superadmin'],
    default: 'customer'
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null // null only for superadmin, who isn't tied to one shop
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ---------- SHOP MODEL ----------
const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerEmail: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  pendingPassword: { type: String }, // hashed password, used to create the admin User once approved
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'held'],
    default: 'pending'
  },
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'paid', 'expired'],
    default: 'trial'
  },
  trialEndsAt: { type: Date },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  maxProducts: { type: Number, default: 100 },
  rejectionReason: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String }
}, { timestamps: true });

const Shop = mongoose.model('Shop', shopSchema);

// ---------- PRODUCT MODEL ----------
const productSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
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
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
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

// ---------- SHOP FEEDBACK MODEL (customer -> shop admin) ----------
const shopFeedbackSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true }
}, { timestamps: true });

const ShopFeedback = mongoose.model('ShopFeedback', shopFeedbackSchema);

// ---------- PLATFORM FEEDBACK MODEL (shop admin -> superadmin) ----------
const platformFeedbackSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true }
}, { timestamps: true });

const PlatformFeedback = mongoose.model('PlatformFeedback', platformFeedbackSchema);

// ---------- Routes ----------
const authRoutes = require('./routes/auth')(User, Shop);
app.use('/api/auth', authRoutes);

const shopRoutes = require('./routes/shops')(Shop, User);
app.use('/api/shops', shopRoutes);

const productRoutes = require('./routes/products')(Product, Shop);
app.use('/api/products', productRoutes);

const orderRoutes = require('./routes/orders')(Order, Product);
app.use('/api/orders', orderRoutes);

const paymentRoutes = require('./routes/payment')(Order, Product);
app.use('/api/payment', paymentRoutes);

const deliveryRoutes = require('./routes/delivery')(Order);
app.use('/api/delivery', deliveryRoutes);

const statsRoutes = require('./routes/stats')(Order);
app.use('/api/stats', statsRoutes);

const financeRoutes = require('./routes/finance')(Product, Order);
app.use('/api/finance', financeRoutes);

//shop owner to promote user to rider
const userRoutes = require('./routes/users')(User);
app.use('/api/users', userRoutes);

const feedbackRoutes = require('./routes/feedback')(ShopFeedback, PlatformFeedback, User);
app.use('/api/feedback', feedbackRoutes);


// ---------- Test route ----------
app.get('/', (req, res) => {
  res.send('Wholesale Shop API is running');
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, User, Product, Order, Shop };