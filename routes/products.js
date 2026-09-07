const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const router = express.Router();

// Configure where + how uploaded files get saved
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ---------- Middleware: verify logged in ----------
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ---------- Middleware: verify admin ----------
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
}

module.exports = (Product) => {

// ---------- GET all products, scoped to the logged-in user's shop ----------
  router.get('/', auth, async (req, res) => {
    try {
      const products = await Product.find({ shopId: req.user.shopId });
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
    try {
      const { name, price, stock, description, category } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
      const product = new Product({
        shopId: req.user.shopId,
        name, price, stock, description, imageUrl, category
      });
      await product.save();
      res.status(201).json(product);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// ---------- PATCH update product (admin only, own shop only) ----------
  router.patch('/:id', auth, adminOnly, async (req, res) => {
    try {
      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, shopId: req.user.shopId },
        req.body,
        { new: true }
      );
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// ---------- DELETE product (admin only, own shop only) ----------
  router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
      const product = await Product.findOneAndDelete({ _id: req.params.id, shopId: req.user.shopId });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json({ message: 'Product deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};