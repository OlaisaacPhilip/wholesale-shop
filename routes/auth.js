const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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
        shopId,
        isVerified: true // email verification disabled until a custom domain is set up
        // role defaults to 'customer' automatically
      });

      await user.save();

      res.status(201).json({ message: 'Signup successful. You can now log in.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ---------- VERIFY CUSTOMER/DELIVERY EMAIL — auto-logs them in on success ----------
  router.post('/verify-email/:token', async (req, res) => {
    try {
      const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
      const user = await User.findOne({ verificationToken: hashedToken });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification link' });
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      const token = jwt.sign(
        { id: user._id, role: user.role, shopId: user.shopId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Email verified successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, shopId: user.shopId }
      });
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

    if (user.shopId) {
      const shop = await Shop.findById(user.shopId);
      if (shop && shop.status === 'held') {
        return res.status(403).json({
          message: `This shop is currently on hold. Contact 07077941592 (call) or 07013297651 (WhatsApp) for details.`
        });
      }
    }

    const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Block login until the user has verified their email
     /* if (!user.isVerified) {
        return res.status(403).json({
          message: 'Please verify your email before logging in. Check your inbox for the verification link.'
        });
      } */

      // Block login for anyone belonging to a held shop (admin, delivery, or customer)

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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
console.log('forgot-password lookup:', email, user ? 'FOUND' : 'NOT FOUND');

    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    await resend.emails.send({
      from: 'Meloshop <onboarding@resend.dev>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a></p>
             <p>This link expires in 10 minutes. If you didn't request this, ignore this email.</p>`
    });

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

  return router;
};