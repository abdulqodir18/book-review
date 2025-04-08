const { validationResult } = require('express-validator');
const userService = require('../services/userService');
const bcrypt = require('bcrypt');

/**
 * Settings Controller
 * Handles user settings-related requests
 */
module.exports = {
  /**
   * Show user settings page
   */
  getSettingsPage: async (req, res) => {
    try {
      // Get current user information
      const user = await userService.getUserById(req.session.userId);
      
      res.render('settings', {
        title: 'Account Settings | XReader',
        user,
        error: null,
        success: null,
        currentUser: req.session.user
      });
    } catch (error) {
      console.error('Settings error:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load settings',
        error: error.message
      });
    }
  },

  /**
   * Update user profile information
   */
  updateProfile: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const user = await userService.getUserById(req.session.userId);
        return res.render('settings', {
          title: 'Account Settings | XReader',
          user,
          error: errors.array()[0].msg,
          success: null,
          currentUser: req.session.user
        });
      }
      
      // Update user information
      const updateData = {
        fullName: req.body.fullName,
        age: req.body.age,
        interests: req.body.interests || []
      };
      
      const updatedUser = await userService.updateUser(req.session.userId, updateData);
      
      // Update session info
      req.session.user.fullName = updatedUser.fullName;
      
      // Get updated user for rendering
      const user = await userService.getUserById(req.session.userId);
      
      res.render('settings', {
        title: 'Account Settings | XReader',
        user,
        error: null,
        success: 'Your profile has been updated successfully',
        currentUser: req.session.user
      });
      
    } catch (error) {
      console.error('Update settings error:', error);
      
      // Get user for rendering
      const user = await userService.getUserById(req.session.userId);
      
      res.render('settings', {
        title: 'Account Settings | XReader',
        user,
        error: error.message,
        success: null,
        currentUser: req.session.user
      });
    }
  },

  /**
   * Update user password
   */
  updatePassword: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const user = await userService.getUserById(req.session.userId);
        return res.render('settings', {
          title: 'Account Settings | XReader',
          user,
          error: errors.array()[0].msg,
          success: null,
          currentUser: req.session.user
        });
      }
      
      // Get current user
      const user = await userService.getUserById(req.session.userId);
      
      // Verify current password
      const passwordMatch = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
      
      if (!passwordMatch) {
        return res.render('settings', {
          title: 'Account Settings | XReader',
          user,
          error: 'Current password is incorrect',
          success: null,
          currentUser: req.session.user
        });
      }
      
      // Update password
      await userService.updateUser(req.session.userId, {
        password: req.body.newPassword
      });
      
      res.render('settings', {
        title: 'Account Settings | XReader',
        user,
        error: null,
        success: 'Your password has been updated successfully',
        currentUser: req.session.user
      });
      
    } catch (error) {
      console.error('Update password error:', error);
      
      // Get user for rendering
      const user = await userService.getUserById(req.session.userId);
      
      res.render('settings', {
        title: 'Account Settings | XReader',
        user,
        error: error.message,
        success: null,
        currentUser: req.session.user
      });
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async (req, res) => {
    try {
      // Delete the account
      await userService.deleteUser(req.session.userId);
      
      // Destroy the session
      req.session.destroy();
      
      // Redirect to register page
      res.redirect('/auth/register');
      
    } catch (error) {
      console.error('Delete account error:', error);
      
      // Get user for rendering
      const user = await userService.getUserById(req.session.userId);
      
      res.render('settings', {
        title: 'Account Settings | XReader',
        user,
        error: 'Failed to delete account: ' + error.message,
        success: null,
        currentUser: req.session.user
      });
    }
  }
};