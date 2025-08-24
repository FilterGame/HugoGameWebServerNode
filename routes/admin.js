const express = require('express');
const { body, validationResult, param } = require('express-validator');
const User = require('../models/User');
const Comment = require('../models/Comment');
const PostRating = require('../models/PostRating');
const IPBlacklist = require('../models/IPBlacklist');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getClientIP } = require('../middleware/ipCheck');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalComments = await Comment.countDocuments({ isDeleted: false });
    const totalRatings = await PostRating.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const hiddenComments = await Comment.countDocuments({ isHidden: true, isDeleted: false });

    const recentUsers = await User.find()
      .select('email nickname createdAt lastLogin isActive')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentComments = await Comment.find({ isDeleted: false })
      .populate('author', 'nickname email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalComments,
        hiddenComments,
        totalRatings
      },
      recentUsers,
      recentComments
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(searchQuery)
      .select('email nickname role isActive permissions createdAt lastLogin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page * limit < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:userId/status', [
  param('userId').isMongoId(),
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot modify your own account status' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('email nickname isActive');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:userId/permissions', [
  param('userId').isMongoId(),
  body('permissions').isObject(),
  body('permissions.canComment').optional().isBoolean(),
  body('permissions.canRate').optional().isBoolean(),
  body('permissions.canPost').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { permissions } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot modify your own permissions' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    Object.assign(user.permissions, permissions);
    await user.save();

    res.json({
      message: 'User permissions updated successfully',
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const postId = req.query.postId || '';
    const userId = req.query.userId || '';
    const includeHidden = req.query.includeHidden === 'true';

    const searchQuery = {
      isDeleted: false
    };

    if (!includeHidden) {
      searchQuery.isHidden = false;
    }

    if (postId) {
      searchQuery.postId = postId;
    }

    if (userId) {
      searchQuery.author = userId;
    }

    const comments = await Comment.find(searchQuery)
      .populate('author', 'email nickname')
      .populate('parentComment', 'content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('+authorIP');

    const totalComments = await Comment.countDocuments(searchQuery);

    res.json({
      comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasNext: page * limit < totalComments,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/comments/:commentId/hide', [
  param('commentId').isMongoId(),
  body('isHidden').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const { isHidden } = req.body;

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { isHidden },
      { new: true }
    ).populate('author', 'email nickname');

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({
      message: `Comment ${isHidden ? 'hidden' : 'shown'} successfully`,
      comment
    });
  } catch (error) {
    console.error('Hide comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/comments/:commentId', [
  param('commentId').isMongoId()
], async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { isDeleted: true },
      { new: true }
    ).populate('author', 'email nickname');

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await Comment.updateMany(
      { parentComment: commentId },
      { isDeleted: true }
    );

    res.json({
      message: 'Comment and replies deleted successfully',
      comment
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } }
        }
      }
    ]);

    const commentStats = await Comment.aggregate([
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          visibleComments: { $sum: { $cond: [{ $and: ['$isHidden', '$isDeleted'] }, 0, 1] } },
          hiddenComments: { $sum: { $cond: ['$isHidden', 1, 0] } },
          deletedComments: { $sum: { $cond: ['$isDeleted', 1, 0] } }
        }
      }
    ]);

    const ratingStats = await PostRating.aggregate([
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      users: userStats[0] || {},
      comments: commentStats[0] || {},
      ratings: ratingStats[0] || {}
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// IP 黑名單管理
router.get('/ip-blacklist', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const blacklist = await IPBlacklist.find()
      .populate('createdBy', 'nickname email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBlacklist = await IPBlacklist.countDocuments();

    res.json({
      blacklist,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBlacklist / limit),
        totalBlacklist,
        hasNext: page * limit < totalBlacklist,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get IP blacklist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/ip-blacklist', [
  body('ip').isLength({ min: 7, max: 100 }).trim(),
  body('type').isIn(['exact', 'subnet', 'range']),
  body('reason').optional().isLength({ max: 500 }).trim(),
  body('expiresAt').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ip, type, reason, expiresAt } = req.body;

    // 驗證 IP 格式
    const ipValidation = validateIPFormat(ip, type);
    if (!ipValidation.valid) {
      return res.status(400).json({ error: ipValidation.error });
    }

    const existingEntry = await IPBlacklist.findOne({ ip });
    if (existingEntry) {
      return res.status(400).json({ error: 'IP 已存在於黑名單中' });
    }

    const blacklistEntry = new IPBlacklist({
      ip,
      type,
      reason: reason || '',
      createdBy: req.user._id,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await blacklistEntry.save();
    await blacklistEntry.populate('createdBy', 'nickname email');

    res.status(201).json({
      message: 'IP 已加入黑名單',
      entry: blacklistEntry
    });
  } catch (error) {
    console.error('Add IP blacklist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/ip-blacklist/:id/toggle', [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await IPBlacklist.findById(id);
    if (!entry) {
      return res.status(404).json({ error: '黑名單項目不存在' });
    }

    entry.isActive = !entry.isActive;
    await entry.save();

    res.json({
      message: `黑名單項目已${entry.isActive ? '啟用' : '停用'}`,
      entry
    });
  } catch (error) {
    console.error('Toggle IP blacklist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/ip-blacklist/:id', [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await IPBlacklist.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ error: '黑名單項目不存在' });
    }

    res.json({ message: 'IP 黑名單項目已刪除' });
  } catch (error) {
    console.error('Delete IP blacklist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 檢查 IP 是否被封鎖
router.post('/check-ip', [
  body('ip').isIP()
], async (req, res) => {
  try {
    const { ip } = req.body;

    const result = await IPBlacklist.isIPBlocked(ip);

    res.json(result);
  } catch (error) {
    console.error('Check IP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// IP 格式驗證函數
function validateIPFormat(ip, type) {
  switch (type) {
    case 'exact':
      // 驗證單一 IP
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ip)) {
        return { valid: false, error: '無效的 IP 格式' };
      }
      const octets = ip.split('.');
      for (const octet of octets) {
        const num = parseInt(octet);
        if (num < 0 || num > 255) {
          return { valid: false, error: 'IP 位址範圍無效 (0-255)' };
        }
      }
      break;

    case 'subnet':
      // 驗證子網路 CIDR
      const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!subnetRegex.test(ip)) {
        return { valid: false, error: '無效的 CIDR 格式 (例: 192.168.1.0/24)' };
      }
      const [network, prefixStr] = ip.split('/');
      const prefix = parseInt(prefixStr);
      if (prefix < 0 || prefix > 32) {
        return { valid: false, error: '無效的 CIDR 前綴長度 (0-32)' };
      }
      // 驗證網路位址
      const networkOctets = network.split('.');
      for (const octet of networkOctets) {
        const num = parseInt(octet);
        if (num < 0 || num > 255) {
          return { valid: false, error: '網路位址範圍無效' };
        }
      }
      break;

    case 'range':
      // 驗證 IP 範圍
      const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}\s*-\s*(\d{1,3}\.){3}\d{1,3}$/;
      if (!rangeRegex.test(ip)) {
        return { valid: false, error: '無效的 IP 範圍格式 (例: 192.168.1.1-192.168.1.10)' };
      }
      const [startIP, endIP] = ip.split('-').map(ip => ip.trim());
      
      // 驗證兩個 IP
      const validateSingleIP = (singleIP) => {
        const octets = singleIP.split('.');
        if (octets.length !== 4) return false;
        for (const octet of octets) {
          const num = parseInt(octet);
          if (num < 0 || num > 255) return false;
        }
        return true;
      };

      if (!validateSingleIP(startIP) || !validateSingleIP(endIP)) {
        return { valid: false, error: '範圍中的 IP 位址無效' };
      }
      break;

    default:
      return { valid: false, error: '未知的 IP 類型' };
  }

  return { valid: true };
}

module.exports = router;