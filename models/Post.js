const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  originalPostId: {
    type: String,
    ref: 'Post',
    default: null
  },
  bookName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1
  },
  contentText: {
    type: String,
    required: true,
    trim: true,
    minlength: 60
  },
  likes: [{
    type: String,
    ref: 'User'
  }],
  reposts: [{
    type: String,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Virtual field to count likes
PostSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual field to count reposts
PostSchema.virtual('repostsCount').get(function() {
  return this.reposts.length;
});

// Method to check if post is a repost
PostSchema.virtual('isRepost').get(function() {
  return !!this.originalPostId;
});

// Set toJSON option to include virtuals
PostSchema.set('toJSON', { virtuals: true });
PostSchema.set('toObject', { virtuals: true });

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;