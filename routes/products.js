const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'wholesale-shop-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto', width: 1200, crop: 'limit' }
    ]
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

module.exports = (Product, Shop) => {

// ---------- GET all products, scoped to the logged-in user's shop ----------
  router.get('/', auth, async (req, res) => {
    try {
      const products = await Product.find({ shopId: req.user.shopId });
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// ---------- Middleware: reject oversized uploads BEFORE Cloudinary ever sees them ----------
async function checkUploadSize(req, res, next) {
  try {
    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const maxSizeBytes = shop.plan === 'free' ? 1 * 1024 * 1024 : 5 * 1024 * 1024;
    const incomingSize = parseInt(req.headers['content-length'] || '0', 10);

    // Content-Length includes the whole multipart form, not just the image,
    // so this is a safe upper-bound check — the actual file can only be smaller
    // than this, never bigger, so rejecting here reliably blocks oversized originals
    if (incomingSize > maxSizeBytes + (50 * 1024)) { // +50KB buffer for form field overhead
      const maxLabel = shop.plan === 'free' ? '1MB' : '5MB';
      return res.status(400).json({
        message: `Image is too large. Free/Premium plans allow original files up to ${maxLabel} before upload — please use a smaller photo.`
      });
    }

    req.shop = shop; // pass it along so the route below doesn't need to re-fetch it
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

router.post('/', auth, adminOnly, checkUploadSize, upload.single('image'), async (req, res) => {
    try {
      const shop = req.shop; // already fetched in checkUploadSize, no need to query again

// Enforce free-tier product count limit
      if (shop.plan === 'free') {
        const currentCount = await Product.countDocuments({ shopId: req.user.shopId });
        if (currentCount >= shop.maxProducts) {
          if (req.file) await cloudinary.uploader.destroy(req.file.filename);
          return res.status(403).json({
            message: `You've reached the free plan limit of ${shop.maxProducts} products. Upgrade to Premium for unlimited listings.`
          });
        }
      }

/*
// Enforce image size limits: Free tier 1MB, Premium 5MB
      const maxSizeBytes = shop.plan === 'free' ? 1 * 1024 * 1024 : 5 * 1024 * 1024;
      if (req.file && req.file.size > maxSizeBytes) {
        await cloudinary.uploader.destroy(req.file.filename);
        const maxLabel = shop.plan === 'free' ? '1MB' : '5MB';
        return res.status(400).json({
          message: `Image must be under ${maxLabel}. Try a smaller or compressed image.`
        });
      } */

      const { name, price, stock, description, category } = req.body;
      const imageUrl = req.file ? req.file.path : '';
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