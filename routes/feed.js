const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { isAuthenticated } = require('../middleware/auth');
const feedController = require('../controllers/feedController');

/**
 * GET /feed
 * Display the feed with posts based on filter (all/following)
 */
router.get('/', isAuthenticated, feedController.getFeed);

/**
 * POST /feed/post
 * Create a new post
 */
router.post('/post', [
  isAuthenticated,
  body('bookName').trim().notEmpty().withMessage('Book name is required'),
  body('contentText').trim().isLength({ min: 60 }).withMessage('Content must be at least 60 characters')
], feedController.createPost);

/**
 * POST /feed/repost/:postId
 * Toggle repost for an existing post
 */
router.post('/repost/:postId', isAuthenticated, feedController.repostPost);

/**
 * POST /feed/like/:postId
 * Like or unlike a post
 */
router.post('/like/:postId', isAuthenticated, feedController.likePost);

/**
 * DELETE /feed/post/:postId
 * Delete a post
 */
router.delete('/post/:postId', isAuthenticated, feedController.deletePost);

module.exports = router;