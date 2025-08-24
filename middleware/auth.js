const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

const requireEmailVerification = (req, res, next) => {
  // Skip check if email verification is disabled
  if (process.env.EMAIL_VERIFICATION_ENABLED !== 'true') {
    return next();
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required. Please verify your email address before posting or rating.',
      requiresEmailVerification: true 
    });
  }
  next();
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.permissions[permission]) {
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }
    next();
  };
};

module.exports = {
  authenticate,
  requireAdmin,
  requireEmailVerification,
  checkPermission
};