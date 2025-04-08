const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

/**
 * GET /profile/:username
 * Display a user's profile
 */
router.get('/:username', isAuthenticated, profileController.getUserProfile);

/**
 * POST /profile/:username/follow
 * Follow a user
 */
router.post('/:username/follow', isAuthenticated, profileController.followUser);

/**
 * POST /profile/:username/unfollow
 * Unfollow a user
 */
router.post('/:username/unfollow', isAuthenticated, profileController.unfollowUser);

module.exports = router;