const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { getClientIP, recordLoginIP, checkIPBlacklist } = require('../middleware/ipCheck');
const emailService = require('../services/emailService');

const router = express.Router();

// Rate limit for email verification resend
const resendEmailLimiter = rateLimit({
  windowMs: parseInt(process.env.EMAIL_RESEND_COOLDOWN_MINUTES || '5') * 60 * 1000, // Default 5 minutes
  max: 1, // limit each IP to 1 resend per windowMs
  message: { error: 'Please wait before requesting another verification email' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

router.post('/register', [
  checkIPBlacklist,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('nickname').isLength({ min: 1, max: 50 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nickname } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ email, password, nickname });
    const clientIP = req.clientIP || getClientIP(req);
    
    // 記錄註冊時的 IP
    user.loginIPs = [{
      ip: clientIP,
      lastLoginAt: new Date(),
      loginCount: 1
    }];
    user.lastLogin = new Date();

    // Handle email verification
    const emailVerificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === 'true';
    let verificationToken = null;
    
    if (emailVerificationEnabled) {
      user.emailVerified = false;
      verificationToken = user.generateEmailVerificationToken();
      user.lastVerificationEmailSent = new Date();
    } else {
      user.emailVerified = true; // Auto-verify when disabled
    }
    
    await user.save();

    // Send verification email if enabled
    if (emailVerificationEnabled) {
      const emailResult = await emailService.sendVerificationEmail(email, nickname, verificationToken);
      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Don't fail registration if email fails, just log it
      }
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: emailVerificationEnabled ? 
        'User created successfully. Please check your email to verify your account.' : 
        'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        emailVerified: user.emailVerified
      },
      emailVerificationRequired: emailVerificationEnabled
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', [
  checkIPBlacklist,
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 記錄登入 IP
    const clientIP = req.clientIP || getClientIP(req);
    await recordLoginIP(user, clientIP);

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        permissions: user.permissions,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      nickname: req.user.nickname,
      role: req.user.role,
      permissions: req.user.permissions,
      emailVerified: req.user.emailVerified,
      createdAt: req.user.createdAt
    }
  });
});

router.post('/refresh', authenticate, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now post and rate content.' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend verification email
router.post('/resend-verification', [
  resendEmailLimiter,
  authenticate,
  checkIPBlacklist
], async (req, res) => {
  try {
    if (process.env.EMAIL_VERIFICATION_ENABLED !== 'true') {
      return res.status(400).json({ error: 'Email verification is not enabled' });
    }

    const user = req.user;

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Check cooldown period
    const cooldownMinutes = parseInt(process.env.EMAIL_RESEND_COOLDOWN_MINUTES || '5');
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    if (user.lastVerificationEmailSent && 
        (new Date() - user.lastVerificationEmailSent) < cooldownMs) {
      const remainingMs = cooldownMs - (new Date() - user.lastVerificationEmailSent);
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      return res.status(429).json({ 
        error: `Please wait ${remainingMinutes} more minutes before requesting another email` 
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    user.lastVerificationEmailSent = new Date();
    await user.save();

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(
      user.email, 
      user.nickname, 
      verificationToken
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ 
      success: true,
      message: 'Verification email sent successfully. Please check your email.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;