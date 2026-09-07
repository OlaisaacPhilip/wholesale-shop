const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function superadminOnly(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access only' });
  }
  next();
}

module.exports = (Shop, User) => {

  // ---------- POST apply as a new shop (public, no login needed yet) ----------
  router.post('/apply', async (req, res) => {
    try {
      const { name, ownerName, ownerEmail, ownerPhone, password } = req.body;

      const existingShopName = await Shop.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        status: { $ne: 'rejected' }
      });
      if (existingShopName) {
        return res.status(400).json({ message: 'Shop name already exists! Choose another shop name' });
      }

      const existingShop = await Shop.findOne({ ownerEmail });
      if (existingShop) {
        return res.status(400).json({ message: 'An application with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const shop = new Shop({
        name,
        ownerName,
        ownerEmail,
        ownerPhone,
        pendingPassword: hashedPassword,
        status: 'pending'
      });

      await shop.save();
      res.status(201).json({ message: 'Application submitted', shopId: shop._id, status: shop.status });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET list of active shops (public — for the customer/delivery signup dropdown) ----------
  router.get('/active', async (req, res) => {
    try {
      const shops = await Shop.find({ status: 'active' }).select('name _id');
      res.json(shops);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET all pending shops (superadmin only) ----------
  router.get('/pending', auth, superadminOnly, async (req, res) => {
    try {
      const shops = await Shop.find({ status: 'pending' }).sort({ createdAt: 1 });
      res.json(shops);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// ---------- GET all shops, any status (superadmin only) ----------
  router.get('/', auth, superadminOnly, async (req, res) => {
    try {
      const shops = await Shop.find().sort({ createdAt: -1 });
      res.json(shops);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH approve a shop (superadmin only) ----------
  router.patch('/:id/approve', auth, superadminOnly, async (req, res) => {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) return res.status(404).json({ message: 'Shop not found' });
      if (shop.status !== 'pending') {
        return res.status(400).json({ message: 'Shop is not pending approval' });
      }

      const existingUser = await User.findOne({ email: shop.ownerEmail });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      const adminUser = new User({
        name: shop.ownerName,
        email: shop.ownerEmail,
        phone: shop.ownerPhone,
        password: shop.pendingPassword,
        role: 'admin',
        shopId: shop._id
      });
      await adminUser.save();

      shop.status = 'active';
      shop.pendingPassword = undefined;
      shop.subscriptionStatus = 'trial';
      shop.trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
      await shop.save();

      res.json({ message: 'Shop approved and admin account created', shop });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH reject a shop (superadmin only) ----------
  router.patch('/:id/reject', auth, superadminOnly, async (req, res) => {
    try {
      const { reason } = req.body;
      const shop = await Shop.findByIdAndUpdate(
        req.params.id,
        { status: 'rejected', rejectionReason: reason || '' },
        { new: true }
      );
      if (!shop) return res.status(404).json({ message: 'Shop not found' });
      res.json(shop);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH hold a shop (superadmin only) ----------
  router.patch('/:id/hold', auth, superadminOnly, async (req, res) => {
    try {
      const shop = await Shop.findByIdAndUpdate(
        req.params.id,
        { status: 'held' },
        { new: true }
      );
      if (!shop) return res.status(404).json({ message: 'Shop not found' });
      res.json(shop);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH unhold a shop (superadmin only) ----------
  router.patch('/:id/unhold', auth, superadminOnly, async (req, res) => {
    try {
      const shop = await Shop.findByIdAndUpdate(
        req.params.id,
        { status: 'active' },
        { new: true }
      );
      if (!shop) return res.status(404).json({ message: 'Shop not found' });
      res.json(shop);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};