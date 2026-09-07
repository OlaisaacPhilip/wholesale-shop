const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

module.exports = (Product, Order) => {

  router.get('/summary', auth, adminOnly, async (req, res) => {
    try {
      const shopId = new mongoose.Types.ObjectId(req.user.shopId);

      const stockAgg = await Product.aggregate([
        { $match: { shopId } },
        { $group: { _id: null, stockWorth: { $sum: { $multiply: ['$price', '$stock'] } } } }
      ]);
      const stockWorth = stockAgg[0]?.stockWorth || 0;

      const deliveredAgg = await Order.aggregate([
        { $match: { shopId, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const deliveredRevenue = deliveredAgg[0]?.total || 0;

      const pendingAgg = await Order.aggregate([
        { $match: { shopId, status: { $in: ['pending', 'available', 'claimed'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const pendingValue = pendingAgg[0]?.total || 0;

      const totalBusinessValue = stockWorth + deliveredRevenue + pendingValue;

      res.json({ stockWorth, deliveredRevenue, pendingValue, totalBusinessValue });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};