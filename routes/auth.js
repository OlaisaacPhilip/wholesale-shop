const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (User, Shop) => {

// ---------- SIGNUP ----------
  router.post('/signup', async (req, res) => {
    try {
      const { name, email, phone, password, shopId } = req.body;

      if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({ message: 'Phone number must be exactly 11 digits' });
      }

      if (!shopId) {
        return res.status(400).json({ message: 'Please select a shop to sign up under' });
      }

      const shop = await Shop.findOne({ _id: shopId, status: 'active' });
      if (!shop) {
        return res.status(400).json({ message: 'Selected shop is not available' });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name,
        email,
        phone,
        password: hashedPassword,
        shopId
        // role defaults to 'customer' automatically
      });

      await user.save();

      res.status(201).json({ message: 'Signup successful' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- LOGIN ----------
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // No user account exists yet — check if this email belongs to a shop
        // application that was rejected, so we can explain why instead of
        // just saying "invalid" with no context
        const rejectedShop = await Shop.findOne({ ownerEmail: email, status: 'rejected' });
        if (rejectedShop) {
          return res.status(400).json({
            message: `Your shop application was not approved${rejectedShop.rejectionReason ? ': ' + rejectedShop.rejectionReason : '.'} Contact 07077941592 (call) or 07013297651 (WhatsApp) for details.`
          });
        }

        const pendingShop = await Shop.findOne({ ownerEmail: email, status: 'pending' });
        if (pendingShop) {
          return res.status(400).json({
            message: 'Your shop application is still pending review. Contact 07077941592 (call) or 07013297651 (WhatsApp) if you have questions.'
          });
        }

        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role, shopId: user.shopId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, shopId: user.shopId }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};