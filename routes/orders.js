const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ---------- Middleware: verify logged in ----------
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = (Order, Product) => {

  // ---------- POST create order (checkout) ----------
  router.post('/', auth, async (req, res) => {
    try {
      const { items, deliveryAddress, contactPhone, paymentMethod } = req.body;
      const shopId = req.user.shopId;

      if (!paymentMethod || !['cash', 'card'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      // items expected shape: [{ productId, quantity }, ...]

      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      let totalAmount = 0;
      const orderItems = [];

      // Look up each product to snapshot its current name/price
      // Look up each product to snapshot its current name/price
      for (const item of items) {
        const product = await Product.findOne({ _id: item.productId, shopId });
        if (!product) {
          return res.status(404).json({ message: `Product not found: ${item.productId}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Not enough stock for ${product.name}` });
        }

        orderItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity
        });

        totalAmount += product.price * item.quantity;
      }

      // Cash orders: deduct stock immediately, since there's no separate payment
      // confirmation step — the order being placed IS the commitment.
      // Card orders: stock stays untouched here and gets deducted later,
      // only once Paystack confirms payment actually succeeded.
      if (paymentMethod === 'cash') {
        for (const item of orderItems) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity }
          });
        }
      }

      const order = new Order({
        shopId,
        buyerId: req.user.id,
        items: orderItems,
        deliveryAddress,
        contactPhone,
        totalAmount,
        paymentMethod,
        // cash orders skip payment gateway entirely and go straight to the delivery pool;
        // card orders stay 'pending' until Paystack verification flips them to 'available'
        status: paymentMethod === 'cash' ? 'available' : 'pending',
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending'
      });

      await order.save();
      res.status(201).json(order);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET my orders (customer view) ----------
  router.get('/my-orders', auth, async (req, res) => {
    try {
      const orders = await Order.find({ buyerId: req.user.id, shopId: req.user.shopId }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET single order by id ----------
  router.get('/:id', auth, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.json(order);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};