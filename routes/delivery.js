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

function deliveryOnly(req, res, next) {
  if (req.user.role !== 'delivery' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Delivery access only' });
  }
  next();
}

module.exports = (Order) => {

  // ---------- GET available orders (paid, unclaimed, same shop only) ----------
  router.get('/available', auth, deliveryOnly, async (req, res) => {
    try {
      const orders = await Order.find({
        shopId: req.user.shopId,
        status: 'available',
        claimedBy: null
      }).sort({ createdAt: 1 });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET my claimed orders (delivery person's own list) ----------
  router.get('/my-deliveries', auth, deliveryOnly, async (req, res) => {
    try {
      const orders = await Order.find({ claimedBy: req.user.id, shopId: req.user.shopId }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH claim an order ----------
  router.patch('/:id/claim', auth, deliveryOnly, async (req, res) => {
    try {
      // The critical part: findOneAndUpdate with a condition on claimedBy: null
      // means this only succeeds if NO ONE has claimed it yet, checked and
      // updated as a single atomic operation. If two delivery persons tap
      // "Claim" at the same instant, only one findOneAndUpdate wins —
      // MongoDB guarantees this, since the check-and-set happens in one step
      // at the database level, not in two separate steps in our code.
      const order = await Order.findOneAndUpdate(
        { _id: req.params.id, shopId: req.user.shopId, status: 'available', claimedBy: null },
        { claimedBy: req.user.id, claimedAt: new Date(), status: 'claimed' },
        { new: true }
      );

      if (!order) {
        return res.status(400).json({ message: 'Order already claimed or not available' });
      }

      res.json(order);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH mark delivered ----------
  router.patch('/:id/deliver', auth, deliveryOnly, async (req, res) => {
    try {
      const order = await Order.findOneAndUpdate(
        { _id: req.params.id, shopId: req.user.shopId, claimedBy: req.user.id, status: 'claimed' },
        { status: 'delivered', deliveredAt: new Date(), paymentStatus: 'paid' },
        { new: true }
      );

      if (!order) {
        return res.status(400).json({ message: 'Order not found or not claimed by you' });
      }

      res.json(order);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};