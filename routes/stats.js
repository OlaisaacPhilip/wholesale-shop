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

// Turns "day" | "week" | "month" | "year" into a starting Date
function getRangeStart(range) {
  const now = new Date();
  switch (range) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // back to Sunday
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(0); // beginning of time — fallback
  }
}

module.exports = (Order) => {

  // ---------- GET /api/stats?range=day|week|month|year ----------
  router.get('/', auth, async (req, res) => {
    try {
      const range = req.query.range || 'day';
      const rangeStart = getRangeStart(range);

      let ordersIn, delivered, totalRevenue;

      if (req.user.role === 'delivery') {
        // Delivery persons care about what THEY delivered in this time range,
        // scoped by when they actually delivered it, not when the customer ordered it
        const deliveryMatch = { claimedBy: req.user.id, deliveredAt: { $gte: rangeStart } };

        delivered = await Order.countDocuments({ ...deliveryMatch, status: 'delivered' });

        // "Orders In" for a delivery person means orders they claimed in this range
        ordersIn = await Order.countDocuments({ claimedBy: req.user.id, claimedAt: { $gte: rangeStart } });

        const revenueResult = await Order.aggregate([
          { $match: { ...deliveryMatch, status: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        totalRevenue = revenueResult[0]?.total || 0;

      } else {
        // Admin: store-wide activity, scoped by when orders were placed
        const matchStage = { createdAt: { $gte: rangeStart } };

        ordersIn = await Order.countDocuments(matchStage);
        delivered = await Order.countDocuments({ ...matchStage, status: 'delivered' });

        const revenueResult = await Order.aggregate([
          { $match: { ...matchStage, status: { $in: ['available', 'claimed', 'delivered'] } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        totalRevenue = revenueResult[0]?.total || 0;
      }

      res.json({
        range,
        ordersIn,
        delivered,
        pending: ordersIn - delivered,
        totalRevenue
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};