const express = require('express');
const jwt = require('jsonwebtoken');
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

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
}

function superadminOnly(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access only' });
  }
  next();
}

module.exports = (ShopFeedback, PlatformFeedback, User) => {

  // ---------- POST customer feedback about a shop/delivery experience ----------
  router.post('/shop', auth, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Feedback message is required' });
      }

      const user = await User.findById(req.user.id);
      if (!user || !user.shopId) {
        return res.status(400).json({ message: 'No shop associated with this account' });
      }

      const feedback = new ShopFeedback({
        shopId: user.shopId,
        customerId: user._id,
        message: message.trim()
      });
      await feedback.save();

      res.status(201).json({ message: 'Feedback submitted, thank you!' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET feedback for the logged-in admin's own shop ----------
  router.get('/shop', auth, adminOnly, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      const feedback = await ShopFeedback.find({ shopId: user.shopId })
        .populate('customerId', 'name email')
        .sort({ createdAt: -1 });
      res.json(feedback);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- POST shop admin feedback to the superadmin ----------
  router.post('/platform', auth, adminOnly, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Feedback message is required' });
      }

      const user = await User.findById(req.user.id);

      const feedback = new PlatformFeedback({
        shopId: user.shopId,
        adminId: user._id,
        message: message.trim()
      });
      await feedback.save();

      res.status(201).json({ message: 'Feedback submitted, thank you!' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET all platform feedback (superadmin only) ----------
  router.get('/platform', auth, superadminOnly, async (req, res) => {
    try {
      const feedback = await PlatformFeedback.find()
        .populate('shopId', 'name')
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 });
      res.json(feedback);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};