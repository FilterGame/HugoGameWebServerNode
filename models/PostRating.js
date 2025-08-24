const mongoose = require('mongoose');

const postRatingSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

postRatingSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PostRating', postRatingSchema);