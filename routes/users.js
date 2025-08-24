const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_AVATAR_SIZE) || 100000
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    let avatarUrl = null;
    if (user.avatar && user.avatar.data) {
      avatarUrl = `data:${user.avatar.contentType};base64,${user.avatar.data.toString('base64')}`;
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        permissions: user.permissions,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', [
  authenticate,
  body('nickname').optional().isLength({ min: 1, max: 50 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nickname } = req.body;
    const user = await User.findById(req.user._id);

    if (nickname) {
      user.nickname = nickname;
    }

    await user.save();

    let avatarUrl = null;
    if (user.avatar && user.avatar.data) {
      avatarUrl = `data:${user.avatar.contentType};base64,${user.avatar.data.toString('base64')}`;
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        permissions: user.permissions,
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(64, 64, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: parseInt(process.env.AVATAR_QUALITY) || 80,
        progressive: true
      })
      .toBuffer();

    const user = await User.findById(req.user._id);
    user.avatar = {
      data: processedImageBuffer,
      contentType: 'image/jpeg'
    };

    await user.save();

    const avatarUrl = `data:image/jpeg;base64,${processedImageBuffer.toString('base64')}`;

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/avatar', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.avatar = undefined;
    await user.save();

    res.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/avatar/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('avatar');
    
    if (!user || !user.avatar || !user.avatar.data) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    res.set('Content-Type', user.avatar.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(user.avatar.data);
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/password', [
  authenticate,
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;