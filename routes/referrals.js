const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

function superadminOnly(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access only' });
  }
  next();
}

module.exports = (Referral, User, Shop) => {

  // ---------- GET the logged-in user's own referral code (auto-generates one if missing) ----------
  router.get('/my-code', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!user.referralCode) {
        // Short, human-shareable code: first 4 letters of name + 4 random hex chars
        const namePart = user.name.replace(/\s+/g, '').slice(0, 4).toUpperCase();
        const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
        user.referralCode = `${namePart}${randomPart}`;
        await user.save();
      }

      res.json({ referralCode: user.referralCode });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- GET all referrals + payout status (superadmin only) ----------
  router.get('/', auth, superadminOnly, async (req, res) => {
    try {
      const referrals = await Referral.find()
        .populate('referrerId', 'name email phone')
        .populate('shopId', 'name')
        .sort({ createdAt: -1 });
      res.json(referrals);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- PATCH mark a referral as paid (superadmin only) ----------
  router.patch('/:id/mark-paid', auth, superadminOnly, async (req, res) => {
    try {
      const referral = await Referral.findByIdAndUpdate(
        req.params.id,
        { status: 'paid', paidAt: new Date() },
        { new: true }
      );
      if (!referral) return res.status(404).json({ message: 'Referral not found' });
      res.json(referral);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};