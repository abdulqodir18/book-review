const userService = require('../services/userService');
const postService = require('../services/postService');

/**
 * Profile Controller
 * Handles user profile-related requests
 */
module.exports = {
  /**
   * Display a user's profile
   */
  getUserProfile: async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`Profile requested for username: "${username}"`);
      
      // Get user data with populated following and followers
      console.log(`Fetching user data for ${username}`);
      const profileUserData = await userService.getUserWithFollowData(username);
      
      if (!profileUserData) {
        console.error(`Profile user data not found for username: ${username}`);
        return res.status(404).render('error', {
          title: 'User Not Found',
          message: 'The requested user profile could not be found.',
          error: { status: 404 }
        });
      }
      
      console.log(`Successfully found profile user: ${profileUserData.username} (${profileUserData.userId})`);
      
      // Get user's posts
      const posts = await postService.getUserPosts(profileUserData.userId);
      console.log(`Retrieved ${posts.length} posts for user ${profileUserData.username}`);
      
      // Get current user with following data to check relationships
      console.log(`Retrieving current user data for userId: ${req.session.userId}`);
      const currentUser = await userService.getUserById(req.session.userId);
      
      // Ensure currentUser has following property
      if (!currentUser.following) {
        console.warn(`Current user ${currentUser.username} has no following array, initializing empty array`);
        currentUser.following = [];
      }
      
      // Check if the current user is following this user
      const isFollowing = currentUser.following.includes(profileUserData.userId);
      console.log(`Current user ${isFollowing ? 'is' : 'is not'} following profile user`);
      
      // Check if this is the current user's profile
      const isOwnProfile = profileUserData.userId === req.session.userId;
      console.log(`This is ${isOwnProfile ? '' : 'not '} the current user's own profile`);
      
      // Check for mutual follows (users from followers who are also in following)
      const mutualFollows = {};
      if (!isOwnProfile) {
        // Check if profile user follows current user (meaning "Follows you")
        const profileUserFollowsCurrentUser = profileUserData.following.includes(req.session.userId);
        console.log(`Profile user ${profileUserFollowsCurrentUser ? 'follows' : 'does not follow'} current user`);
        
        // For each follower, check if current user follows them too
        profileUserData.followerUsers.forEach(follower => {
          mutualFollows[follower.userId] = currentUser.following.includes(follower.userId);
        });
      }
      
      // Add this log to debug what's going to the template
      console.log(`Rendering profile with currentUser:`, {
        id: currentUser._id,
        userId: currentUser.userId,
        username: currentUser.username,
        following: currentUser.following ? currentUser.following.length : 'undefined',
      });
      
      res.render('profile', {
        title: `${profileUserData.fullName} (@${profileUserData.username}) | XReader`,
        profileUser: profileUserData,
        posts,
        isFollowing,
        isOwnProfile,
        following: profileUserData.followingUsers || [],
        followers: profileUserData.followerUsers || [],
        followsYou: !isOwnProfile && profileUserData.following.includes(req.session.userId),
        mutualFollows,
        currentUser: currentUser
      });
      
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load profile',
        error: error.message || error
      });
    }
  },

  /**
   * Follow a user
   */
  followUser: async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`User ${req.session.userId} attempting to follow ${username}`);
      
      // Get the target user
      const targetUser = await userService.getUserByUsername(username);
      console.log(`Found target user: ${targetUser.username} with userId: ${targetUser.userId}`);
      
      // Can't follow yourself
      if (targetUser.userId === req.session.userId) {
        console.log('User attempted to follow themselves');
        return res.status(400).json({
          success: false,
          error: 'You cannot follow yourself'
        });
      }
      
      // Follow the user
      console.log(`Following user ${targetUser.username} (${targetUser.userId})`);
      await userService.followUser(req.session.userId, targetUser.userId);
      console.log(`Successfully followed user ${targetUser.username}`);
      
      // If this is an AJAX request, return JSON
      if (req.xhr) {
        return res.json({
          success: true
        });
      }
      
      // Otherwise redirect back to profile
      res.redirect(`/profile/${username}`);
      
    } catch (error) {
      console.error('Follow user error:', error);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to follow user',
        error: error.message
      });
    }
  },

  /**
   * Unfollow a user
   */
  unfollowUser: async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`User ${req.session.userId} attempting to unfollow ${username}`);
      
      // Get the target user
      const targetUser = await userService.getUserByUsername(username);
      console.log(`Found target user: ${targetUser.username} with userId: ${targetUser.userId}`);
      
      // Unfollow the user
      console.log(`Unfollowing user ${targetUser.username} (${targetUser.userId})`);
      await userService.unfollowUser(req.session.userId, targetUser.userId);
      console.log(`Successfully unfollowed user ${targetUser.username}`);
      
      // If this is an AJAX request, return JSON
      if (req.xhr) {
        return res.json({
          success: true
        });
      }
      
      // Otherwise redirect back to profile
      res.redirect(`/profile/${username}`);
      
    } catch (error) {
      console.error('Unfollow user error:', error);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to unfollow user',
        error: error.message
      });
    }
  }
};