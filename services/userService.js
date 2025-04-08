const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Service layer for user-related operations
 */
module.exports = {
  /**
   * Create a new user account
   * @param {Object} userData - User data including username, fullName, password, age, interests
   * @returns {Promise<User>} Created user object
   */
  createUser: async (userData) => {
    try {
      // Check if username already exists
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        throw new Error('Username already taken');
      }
      
      // Create new user with hashed password
      const user = new User({
        username: userData.username,
        fullName: userData.fullName,
        passwordHash: userData.password, // Will be hashed by pre-save hook
        age: userData.age,
        interests: userData.interests || [],
        following: []
      });
      
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Authenticate a user by username and password
   * @param {string} username - User's username
   * @param {string} password - User's plain text password
   * @returns {Promise<User>} User if authentication succeeds
   */
  authenticateUser: async (username, password) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error('User not found');
      }
      
      const isMatch = await user.verifyPassword(password);
      if (!isMatch) {
        throw new Error('Invalid password');
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<User>} User object or null if not found
   */
  getUserById: async (userId) => {
    try {
      const user = await User.findOne({ userId });
      return user; // Return null if user not found instead of throwing an error
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<User>} User object
   */
  getUserByUsername: async (username) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Update user information
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>} Updated user object
   */
  updateUser: async (userId, updateData) => {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update allowed fields
      if (updateData.fullName) user.fullName = updateData.fullName;
      if (updateData.age) user.age = updateData.age;
      if (updateData.interests) user.interests = updateData.interests;
      
      // Special handling for password
      if (updateData.password) {
        user.passwordHash = updateData.password;
      }
      
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Delete user account
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  deleteUser: async (userId) => {
    try {
      const result = await User.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Follow another user
   * @param {string} userId - User ID of follower
   * @param {string} targetUserId - User ID to follow
   * @returns {Promise<User>} Updated user object
   */
  followUser: async (userId, targetUserId) => {
    try {
      // Check if users exist
      const [user, targetUser] = await Promise.all([
        User.findOne({ userId }),
        User.findOne({ userId: targetUserId })
      ]);
      
      if (!user) {
        throw new Error('Follower user not found');
      }
      
      if (!targetUser) {
        throw new Error('Target user not found');
      }
      
      // Check if already following
      if (user.following.includes(targetUserId)) {
        return user;
      }
      
      // Add to following list
      user.following.push(targetUserId);
      
      await user.save();
      
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Unfollow a user
   * @param {string} userId - User ID of follower
   * @param {string} targetUserId - User ID to unfollow
   * @returns {Promise<User>} Updated user object
   */
  unfollowUser: async (userId, targetUserId) => {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if the targetUserId exists in following array
      const followingIndex = user.following.indexOf(targetUserId);
      if (followingIndex === -1) {
        return user;
      }
      
      // Remove from following list
      user.following.splice(followingIndex, 1);
      
      await user.save();
      
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get list of users that a user is following
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of followed users
   */
  getFollowing: async (userId) => {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get all users being followed
      const following = await User.find({ userId: { $in: user.following } });
      return following;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get list of users that follow a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of followers
   */
  getFollowers: async (userId) => {
    try {
      // Find all users that have this userId in their following array
      const followers = await User.find({ following: userId });
      return followers;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user by username with populated following and followers
   * @param {string} username - Username
   * @returns {Promise<Object>} User object with populated following and followers
   */
  getUserWithFollowData: async (username) => {
    try {
      const user = await User.findOne({ username });
      
      if (!user) {
        throw new Error(`User not found with username: ${username}`);
      }
      
      // Get users that this user follows
      const following = await User.find({ userId: { $in: user.following } })
        .select('userId username fullName');
      
      // Get users that follow this user
      const followers = await User.find({ following: user.userId })
        .select('userId username fullName');
      
      // Return user with populated follow data
      return {
        ...user.toObject(),
        followingUsers: following,
        followerUsers: followers
      };
    } catch (error) {
      throw error;
    }
  }
};