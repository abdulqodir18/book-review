const { validationResult } = require('express-validator');
const userService = require('../services/userService');

/**
 * Auth Controller
 * Handles authentication-related requests
 */
module.exports = {
  /**
   * Render login page
   */
  getLoginPage: (req, res) => {
    res.render('login', {
      title: 'Login | XReader',
      error: null
    });
  },

  /**
   * Process login form
   */
  login: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('login', {
          title: 'Login | XReader',
          error: errors.array()[0].msg
        });
      }
      
      // Authenticate user
      const { username, password } = req.body;
      const user = await userService.authenticateUser(username, password);
      
      // Set session data
      req.session.userId = user.userId;
      req.session.user = {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName
      };
      
      // Redirect to saved URL or feed
      const redirectUrl = req.session.returnTo || '/feed';
      delete req.session.returnTo;
      res.redirect(redirectUrl);
      
    } catch (error) {
      res.render('login', {
        title: 'Login | XReader',
        error: error.message
      });
    }
  },

  /**
   * Render registration page
   */
  getRegisterPage: (req, res) => {
    res.render('register', {
      title: 'Register | XReader',
      error: null,
      values: {}
    });
  },

  /**
   * Process registration form
   */
  register: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('register', {
          title: 'Register | XReader',
          error: errors.array()[0].msg,
          values: req.body
        });
      }
      
      // Handle interests - ensure it's always an array
      const interests = req.body['interests[]'] || [];
      
      // Create new user
      const userData = {
        username: req.body.username,
        fullName: req.body.fullName,
        password: req.body.password,
        age: req.body.age,
        interests: Array.isArray(interests) ? interests : [interests] // Ensure it's an array even if only one item is selected
      };
      
      const user = await userService.createUser(userData);
      
      // Set session data
      req.session.userId = user.userId;
      req.session.user = {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName
      };
      
      // Redirect to feed
      res.redirect('/feed');
      
    } catch (error) {
      res.render('register', {
        title: 'Register | XReader',
        error: error.message,
        values: req.body
      });
    }
  },

  /**
   * Log out user
   */
  logout: (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.redirect('/auth/login');
    });
  }
};