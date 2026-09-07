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

module.exports = (User) => {

  // ---------- GET all customers in the admin's own shop ----------
  router.get('/customers', auth, adminOnly, async (req, res) => {
    try {
      const customers = await User.find({
        shopId: req.user.shopId,
        role: 'customer'
      }).select('name email phone createdAt');
      res.json(customers);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET all delivery persons in the admin's own shop ----------
  router.get('/delivery-persons', auth, adminOnly, async (req, res) => {
    try {
      const deliveryPersons = await User.find({
        shopId: req.user.shopId,
        role: 'delivery'
      }).select('name email phone createdAt');
      res.json(deliveryPersons);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH promote a customer to delivery (own shop only) ----------
  router.patch('/:id/promote', auth, adminOnly, async (req, res) => {
    try {
      const user = await User.findOneAndUpdate(
        { _id: req.params.id, shopId: req.user.shopId, role: 'customer' },
        { role: 'delivery' },
        { new: true }
      );
      if (!user) {
        return res.status(404).json({ message: 'Customer not found in your shop' });
      }
      res.json({ message: `${user.name} is now a delivery person`, user });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH demote a delivery person back to customer (own shop only) ----------
  router.patch('/:id/demote', auth, adminOnly, async (req, res) => {
    try {
      const user = await User.findOneAndUpdate(
        { _id: req.params.id, shopId: req.user.shopId, role: 'delivery' },
        { role: 'customer' },
        { new: true }
      );
      if (!user) {
        return res.status(404).json({ message: 'Delivery person not found in your shop' });
      }
      res.json({ message: `${user.name} is now a regular customer`, user });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};