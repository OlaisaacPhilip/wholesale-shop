const express = require('express');
const axios = require('axios');
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

module.exports = (Order, Product) => {

  // ---------- Initialize payment ----------
  router.post('/initialize/:orderId', auth, async (req, res) => {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (order.buyerId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your order' });
      }
      if (order.status !== 'pending') {
        return res.status(400).json({ message: 'Order already processed' });
      }

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: req.body.email, // buyer's email
          amount: order.totalAmount * 100, // Paystack uses kobo (naira x100)
          metadata: { orderId: order._id.toString() }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json(response.data.data); // contains authorization_url, reference
    } catch (err) {
      res.status(500).json({ message: 'Payment init failed', error: err.message });
    }
  });

  // ---------- Verify payment ----------
  router.get('/verify/:reference', auth, async (req, res) => {
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${req.params.reference}`,
        {
          headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        }
      );

      const data = response.data.data;

      if (data.status !== 'success') {
        return res.status(400).json({ message: 'Payment not successful' });
      }

      const orderId = data.metadata.orderId;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      if (order.status === 'pending') {
        order.status = 'available';
        order.paymentStatus = 'paid';
        await order.save();

        // Deduct stock now that payment is confirmed
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity }
          });
        }
      }

      res.json({ message: 'Payment verified', order });
    } catch (err) {
      res.status(500).json({ message: 'Verification failed', error: err.message });
    }
  });

  return router;
};