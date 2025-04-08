const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { isAuthenticated } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

/**
 * GET /settings
 * Show user settings page
 */
router.get('/', isAuthenticated, settingsController.getSettingsPage);

/**
 * POST /settings/update
 * Update user profile information
 */
router.post('/update', [
  isAuthenticated,
  body('fullName').trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters'),
  body('age').isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  body('interests').isArray().withMessage('Interests must be an array')
], settingsController.updateProfile);

/**
 * POST /settings/password
 * Update user password
 */
router.post('/password', [
  isAuthenticated,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match new password');
    }
    return true;
  })
], settingsController.updatePassword);

/**
 * POST /settings/delete-account
 * Delete user account
 */
router.post('/delete-account', isAuthenticated, settingsController.deleteAccount);

module.exports = router;