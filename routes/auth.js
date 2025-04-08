const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { isNotAuthenticated } = require('../middleware/auth');

/**
 * GET /auth/login
 * Render login page
 */
router.get('/login', isNotAuthenticated, authController.getLoginPage);

/**
 * POST /auth/login
 * Process login form
 */
router.post('/login', [
  isNotAuthenticated,
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

/**
 * GET /auth/register
 * Render registration page
 */
router.get('/register', isNotAuthenticated, authController.getRegisterPage);

/**
 * POST /auth/register
 * Process registration form
 */
router.post('/register', [
  isNotAuthenticated,
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('fullName').trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('age').isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120')
  // Removed the isArray validation since we'll handle it manually
], authController.register);

/**
 * GET /auth/logout
 * Log out user
 */
router.get('/logout', authController.logout);

module.exports = router;