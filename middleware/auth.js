/**
 * Authentication middleware
 * Verifies if a user is logged in for protected routes
 */

module.exports = {
  // Middleware to check if user is authenticated
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.userId) {
      return next();
    }
    
    // Store the requested URL to redirect after login
    req.session.returnTo = req.originalUrl;
    
    // Redirect to login page
    res.redirect('/auth/login');
  },
  
  // Middleware to check if user is NOT authenticated (for login/register pages)
  isNotAuthenticated: (req, res, next) => {
    if (req.session && req.session.userId) {
      return res.redirect('/feed');
    }
    next();
  },
  
  // Make user data available to all templates
  populateUserData: (req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.isAuthenticated = !!(req.session && req.session.userId);
    next();
  }
};