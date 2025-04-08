const Post = require('../models/Post');
const User = require('../models/User');

/**
 * Service layer for post-related operations
 */
module.exports = {
  /**
   * Create a new post
   * @param {Object} postData - Post data including userId, bookName, contentText
   * @returns {Promise<Post>} Created post object
   */
  createPost: async (postData) => {
    try {
      // Validate content length
      if (postData.contentText.length < 60) {
        throw new Error('Post content must be at least 60 characters');
      }
      
      // Validate required fields
      if (!postData.bookName || !postData.userId) {
        throw new Error('Book name and user ID are required');
      }
      
      // Create and save the post
      const post = new Post({
        userId: postData.userId,
        bookName: postData.bookName,
        contentText: postData.contentText
      });
      
      await post.save();
      return post;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Find the original post (trace back through repost chain)
   * @param {string} postId - ID of post to trace back
   * @returns {Promise<Object>} Object containing original post and existing repost if any
   */
  findOriginalPost: async (postId) => {
    try {
      // Get the post
      const post = await Post.findOne({ postId });
      if (!post) {
        throw new Error('Post not found');
      }
      
      // If this is already an original post (not a repost), return it
      if (!post.originalPostId) {
        return { originalPost: post, existingRepost: null };
      }
      
      // If this is a repost, find the original
      const originalPost = await Post.findOne({ postId: post.originalPostId });
      if (!originalPost) {
        // If original is deleted, treat this as an original
        post.originalPostId = null; // Clear the reference to deleted post
        await post.save(); // Save the change
        return { originalPost: post, existingRepost: null };
      }
      
      // Check if the "original" is actually itself a repost (handle chain)
      if (originalPost.originalPostId) {
        try {
          // Recursive case: get the true original
          const result = await module.exports.findOriginalPost(originalPost.originalPostId);
          return { originalPost: result.originalPost, existingRepost: post };
        } catch (err) {
          // If we can't find the true original in the chain, treat this as original
          originalPost.originalPostId = null;
          await originalPost.save();
          return { originalPost, existingRepost: post };
        }
      }
      
      // Base case: found the original post
      return { originalPost, existingRepost: post };
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Toggle repost for a post
   * @param {string} userId - User ID creating/removing the repost
   * @param {string} postId - ID of post being reposted
   * @returns {Promise<Object>} Result with post and repost status
   */
  toggleRepost: async (userId, postId) => {
    try {
      // Verify the post exists before proceeding
      const postExists = await Post.exists({ postId });
      if (!postExists) {
        throw new Error('Post not found');
      }

      // Find the original post (trace through any repost chain)
      const { originalPost } = await module.exports.findOriginalPost(postId);
      
      // Check if user has already reposted this post
      const existingRepost = await Post.findOne({ 
        userId: userId,
        originalPostId: originalPost.postId
      });
      
      // If the user already reposted, remove the repost
      if (existingRepost) {
        await existingRepost.deleteOne();
        
        // Remove user from reposts array of original post
        if (originalPost.reposts.includes(userId)) {
          originalPost.reposts = originalPost.reposts.filter(id => id !== userId);
          await originalPost.save();
        }
        
        return {
          post: originalPost,
          reposted: false,
          repostsCount: originalPost.reposts.length,
          originalPostId: originalPost.postId
        };
      }
      
      // If not reposted yet, create a new repost
      const repost = new Post({
        userId,
        originalPostId: originalPost.postId, // Always reference the true original
        bookName: originalPost.bookName,
        contentText: originalPost.contentText
      });
      
      await repost.save();
      
      // Add user to reposts array of original post if not already there
      if (!originalPost.reposts.includes(userId)) {
        originalPost.reposts.push(userId);
        await originalPost.save();
      }
      
      return {
        post: originalPost,
        repost: repost,
        reposted: true,
        repostsCount: originalPost.reposts.length,
        originalPostId: originalPost.postId
      };
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get post by ID
   * @param {string} postId - Post ID
   * @returns {Promise<Post>} Post object
   */
  getPostById: async (postId) => {
    try {
      const post = await Post.findOne({ postId });
      if (!post) {
        throw new Error('Post not found');
      }
      return post;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Like or unlike a post (always affects the original post)
   * @param {string} postId - Post ID
   * @param {string} userId - User ID liking the post
   * @returns {Promise<Object>} Updated post and like status
   */
  likePost: async (postId, userId) => {
    try {
      // First check if the post exists at all
      const postExists = await Post.exists({ postId });
      if (!postExists) {
        throw new Error('Post not found');
      }

      // Find the original post (trace through any repost chain)
      const { originalPost } = await module.exports.findOriginalPost(postId);
      
      // Toggle like (add if not present, remove if present)
      if (originalPost.likes.includes(userId)) {
        originalPost.likes = originalPost.likes.filter(id => id !== userId);
      } else {
        originalPost.likes.push(userId);
      }
      
      await originalPost.save();
      
      return {
        post: originalPost,
        liked: originalPost.likes.includes(userId),
        likesCount: originalPost.likes.length,
        originalPostId: originalPost.postId
      };
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Delete a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  deletePost: async (postId, userId) => {
    try {
      // Find post and check ownership
      const post = await Post.findOne({ postId });
      if (!post) {
        throw new Error('Post not found');
      }
      
      if (post.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own posts');
      }
      
      // If this is an original post with reposts, handle the orphaned reposts
      const repostsToUpdate = await Post.find({ originalPostId: postId });
      if (repostsToUpdate.length > 0) {
        // For all reposts of this post, remove the originalPostId reference
        await Promise.all(repostsToUpdate.map(async (repost) => {
          repost.originalPostId = null;
          return repost.save();
        }));
      }
      
      // Delete the post
      const result = await Post.deleteOne({ postId });
      return result.deletedCount > 0;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get all posts for global feed
   * @param {number} limit - Maximum number of posts to retrieve
   * @param {number} skip - Number of posts to skip (for pagination)
   * @returns {Promise<Array>} Array of all posts for global feed
   */
  getAllPosts: async (limit = 20, skip = 0) => {
    try {
      // Get all posts sorted by creation time
      const posts = await Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return posts;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get feed for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of posts to retrieve
   * @param {number} skip - Number of posts to skip (for pagination)
   * @returns {Promise<Array>} Array of posts for feed
   */
  getFeed: async (userId, limit = 20, skip = 0) => {
    try {
      // Get user's following list
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Include user's own posts and posts from users they follow
      const feedUserIds = [...user.following, userId];
      
      // Get posts from followed users and own posts, sorted by creation time
      const posts = await Post.find({ userId: { $in: feedUserIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return posts;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get posts by a specific user
   * @param {string} targetUserId - User ID whose posts to retrieve
   * @param {number} limit - Maximum number of posts to retrieve
   * @param {number} skip - Number of posts to skip (for pagination)
   * @returns {Promise<Array>} Array of user's posts
   */
  getUserPosts: async (targetUserId, limit = 20, skip = 0) => {
    try {
      const posts = await Post.find({ userId: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return posts;
    } catch (error) {
      throw error;
    }
  }
};