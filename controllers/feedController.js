const { validationResult } = require('express-validator');
const postService = require('../services/postService');
const userService = require('../services/userService');

/**
 * Feed Controller
 * Handles feed-related requests
 */
module.exports = {
  /**
   * Display the feed with posts based on filter (all/following)
   */
  getFeed: async (req, res) => {
    try {
      const filter = req.query.filter || 'all'; // Default to 'all' if no filter specified
      
      // Get posts based on filter
      let posts;
      if (filter === 'following') {
        posts = await postService.getFeed(req.session.userId);
      } else {
        // Default to global feed for any other value
        posts = await postService.getAllPosts();
      }
      
      // Collect original post IDs for reposts
      const originalPostIds = [];
      const repostMap = new Map();
      
      posts.forEach(post => {
        if (post.originalPostId) {
          originalPostIds.push(post.originalPostId);
          repostMap.set(post.originalPostId, post.postId);
        }
      });
      
      // Create a map of original posts for easy access
      const originalPostMap = {};
      if (originalPostIds.length > 0) {
        const originalPosts = await Promise.all(
          [...new Set(originalPostIds)].map(id => postService.getPostById(id))
        );
        
        originalPosts.forEach(post => {
          if (post) {
            originalPostMap[post.postId] = post;
          }
        });
      }
      
      // Get post authors for display
      const userIds = [...new Set([
        ...posts.map(post => post.userId),
        ...Object.values(originalPostMap).map(post => post.userId)
      ])];
      
      // Get user data and handle potential null users (if user was deleted)
      const users = await Promise.all(
        userIds.map(id => userService.getUserById(id))
      );
      
      // Create a map of userId to username for easy lookup
      const userMap = {};
      users.forEach((user, index) => {
        if (user) {
          userMap[user.userId] = {
            username: user.username,
            fullName: user.fullName
          };
        } else {
          // Handle deleted users - use the corresponding userId from the userIds array
          userMap[userIds[index]] = {
            username: 'Deleted User',
            fullName: 'User no longer exists'
          };
        }
      });
      
      res.render('feed', {
        title: filter === 'following' ? 'Following Feed | XReader' : 'Live Feed | XReader',
        posts,
        originalPostMap,
        userMap,
        currentUser: req.session.user,
        activeFilter: filter,
        script: '<script src="/js/feed.js"></script>'
      });
    } catch (error) {
      console.error('Feed error:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load feed',
        error: error.message
      });
    }
  },

  /**
   * Create a new post
   */
  createPost: async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      // Create post
      const post = await postService.createPost({
        userId: req.session.userId,
        bookName: req.body.bookName,
        contentText: req.body.contentText
      });
      
      // Include user info with the post response
      const user = req.session.user;
      
      // If this is an AJAX request, return JSON
      if (req.xhr) {
        return res.json({
          success: true,
          post,
          user: {
            username: user.username,
            fullName: user.fullName
          }
        });
      }
      
      // Otherwise redirect to feed
      res.redirect('/feed');
      
    } catch (error) {
      console.error('Create post error:', error);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to create post',
        error: error.message
      });
    }
  },

  /**
   * Toggle repost for an existing post
   */
  repostPost: async (req, res) => {
    try {
      const { postId } = req.params;
      
      // Toggle the repost
      const result = await postService.toggleRepost(req.session.userId, postId);
      
      // If this is an AJAX request, return JSON
      if (req.xhr) {
        return res.json({
          success: true,
          post: result.post,
          repost: result.repost,
          reposted: result.reposted,
          repostsCount: result.repostsCount,
          originalPostId: result.post.postId // Always return the original post ID
        });
      }
      
      // Otherwise redirect to feed
      res.redirect('/feed');
      
    } catch (error) {
      console.error('Repost error:', error);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to repost',
        error: error.message
      });
    }
  },

  /**
   * Like or unlike a post
   */
  likePost: async (req, res) => {
    try {
      const { postId } = req.params;
      
      // Toggle like status (this will now trace to original post)
      const result = await postService.likePost(postId, req.session.userId);
      
      // If this is an AJAX request, return JSON
      if (req.xhr) {
        return res.json({
          success: true,
          post: result.post,
          originalPostId: result.post.postId, // Always return the original post ID
          liked: result.liked,
          likesCount: result.likesCount
        });
      }
      
      // Otherwise redirect back
      res.redirect(req.headers.referer || '/feed');
      
    } catch (error) {
      console.error('Like post error:', error);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to like post',
        error: error.message
      });
    }
  },

  /**
   * Delete a post
   */
  deletePost: async (req, res) => {
    try {
      const { postId } = req.params;
      
      // Delete the post
      const deleted = await postService.deletePost(postId, req.session.userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Post not found or already deleted'
        });
      }
      
      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete post error:', error);
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};