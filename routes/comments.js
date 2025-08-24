const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Comment = require('../models/Comment');
const PostRating = require('../models/PostRating');
const { authenticate, checkPermission } = require('../middleware/auth');
const { getClientIP, checkIPBlacklist } = require('../middleware/ipCheck');

const router = express.Router();

router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      postId,
      isDeleted: false,
      isHidden: false,
      parentComment: null
    })
    .populate('author', 'nickname avatar createdAt')
    .populate({
      path: 'replies',
      match: { isDeleted: false, isHidden: false },
      populate: {
        path: 'author',
        select: 'nickname avatar createdAt'
      },
      options: { sort: { createdAt: 1 } }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const totalComments = await Comment.countDocuments({
      postId,
      isDeleted: false,
      isHidden: false
    });

    const ratings = await PostRating.aggregate([
      { $match: { postId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratings: {
            $push: {
              rating: '$rating',
              count: 1
            }
          }
        }
      }
    ]);

    const ratingStats = ratings[0] || {
      averageRating: 0,
      totalRatings: 0,
      ratings: []
    };

    res.json({
      comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasNext: page * limit < totalComments,
        hasPrev: page > 1
      },
      ratings: ratingStats
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/post/:postId', [
  checkIPBlacklist,
  authenticate,
  checkPermission('canComment'),
  param('postId').isLength({ min: 1 }),
  body('title').optional().isLength({ max: 200 }).trim(),
  body('content').isLength({ min: 1, max: 2000 }).trim(),
  body('parentComment').optional().isMongoId(),
  body('rating').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { postId } = req.params;
    const { title, content, parentComment, rating } = req.body;
    const clientIP = req.clientIP || getClientIP(req);

    if (rating && !req.user.permissions.canRate) {
      return res.status(403).json({ error: 'Rating permission denied' });
    }

    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.postId !== postId) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }

    const comment = new Comment({
      postId,
      title: title || '',
      author: req.user._id,
      content,
      authorIP: clientIP,
      parentComment: parentComment || null,
      rating: rating || null
    });

    await comment.save();

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id }
      });
    }

    if (rating) {
      await PostRating.findOneAndUpdate(
        { postId, userId: req.user._id },
        { rating },
        { upsert: true, new: true }
      );
    }

    await comment.populate('author', 'nickname avatar createdAt');

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:commentId', [
  authenticate,
  param('commentId').isMongoId(),
  body('content').isLength({ min: 1, max: 2000 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    comment.content = content;
    await comment.save();

    await comment.populate('author', 'nickname avatar createdAt');

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:commentId', [
  authenticate,
  param('commentId').isMongoId()
], async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    comment.isDeleted = true;
    await comment.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rate/:postId', [
  authenticate,
  checkPermission('canRate'),
  param('postId').isLength({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { postId } = req.params;
    const { rating } = req.body;

    const postRating = await PostRating.findOneAndUpdate(
      { postId, userId: req.user._id },
      { rating },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Rating saved successfully',
      rating: postRating
    });
  } catch (error) {
    console.error('Rate post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rating/:postId/user', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;

    const rating = await PostRating.findOne({
      postId,
      userId: req.user._id
    });

    res.json({
      rating: rating ? rating.rating : null
    });
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;