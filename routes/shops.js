const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

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
      const { name, ownerName, ownerEmail, ownerPhone, password, plan } = req.body;

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

      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      const shop = new Shop({
        name,
        ownerName,
        ownerEmail,
        ownerPhone,
        pendingPassword: hashedPassword,
        status: 'pending',
        plan: plan === 'premium' ? 'premium' : 'free',
        verificationToken: hashedToken
      });

      await shop.save();

      const verifyUrl = `${process.env.FRONTEND_URL}/verify-shop/${rawToken}`;
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: ownerEmail,
        subject: 'Verify your email — Shop Application',
        html: `<p>Thanks for applying! Please verify your email to confirm your shop application.</p>
               <p><a href="${verifyUrl}">Click here to verify your email</a></p>
               <p>This link expires in 24 hours.</p>`
      });

      res.status(201).json({ message: 'Application submitted', shopId: shop._id, status: shop.status });
    } catch (err) {
      console.error('send mail error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- VERIFY SHOP APPLICANT EMAIL — no login, just confirms and shows pending status ----------
  router.post('/verify-email/:token', async (req, res) => {
    try {
      const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
      const shop = await Shop.findOne({ verificationToken: hashedToken });

      if (!shop) {
        return res.status(400).json({ message: 'Invalid or expired verification link' });
      }

      shop.emailVerified = true;
      shop.verificationToken = undefined;
      await shop.save();

      res.json({ message: 'Email verified', shopName: shop.name, status: shop.status });
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

      if (!shop.emailVerified) {
        return res.status(400).json({
          message: 'Cannot approve this shop — the owner has not verified their email yet.'
        });
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
        shopId: shop._id,
        isVerified: shop.emailVerified
      });

      await adminUser.save();

      shop.status = 'active';
      shop.pendingPassword = undefined;
      shop.subscriptionStatus = 'trial';

      // Free tier gets a generous 90-day trial (matches indefinite free usage anyway).
      // Premium gets a short 7-day trial, since they've already chosen to want more
      // than Free offers — just enough time to confirm the app fits their shop
      // before their first payment is due.
      const trialDays = shop.plan === 'premium' ? 7 : 90;
      shop.trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      await shop.save();

      res.json({ message: 'Shop approved and admin account created', shop });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH reject a shop (superadmin only) ----------
  router.patch('/:id/reject', auth, superadminOnly, async (req, res) => {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) return res.status(404).json({ message: 'Shop not found' });

      // Notify the owner before wiping the record, since there'll be
      // nothing left afterward to explain why (no shop doc, no login-time lookup)
      const { reason } = req.body;
      try {
        await transporter.sendMail({
          from: `"Meloshop" <${process.env.GMAIL_USER}>`,
          to: shop.ownerEmail,
          subject: 'Your Shop Application Was Not Approved',
          html: `<p>Your application for "${shop.name}" was not approved${reason ? ': ' + reason : '.'}</p>
                 <p>You're welcome to reapply at any time.</p>`
        });
      } catch (mailErr) {
        console.error('reject-notification email error:', mailErr);
      }

      await Shop.findByIdAndDelete(req.params.id);
      res.json({ message: 'Shop rejected and record deleted' });
    } catch (err) {
      console.error('reject error:', err);
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

// ---------- PATCH demote a premium shop to free (superadmin only, e.g. non-renewal) ----------
  router.patch('/:id/demote-to-free', auth, superadminOnly, async (req, res) => {
    try {
      const shop = await Shop.findByIdAndUpdate(
        req.params.id,
        { plan: 'free', subscriptionStatus: 'expired' },
        { new: true }
      );
      if (!shop) return res.status(404).json({ message: 'Shop not found' });
      res.json(shop);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH promote a free shop to premium (superadmin only, e.g. after payment received) ----------
  router.patch('/:id/promote-to-premium', auth, superadminOnly, async (req, res) => {
    try {
      const shop = await Shop.findByIdAndUpdate(
        req.params.id,
        { plan: 'premium', subscriptionStatus: 'paid' },
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