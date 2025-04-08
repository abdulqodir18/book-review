/**
 * XReader - Main Client-Side JavaScript
 * Handles real-time functionality with Socket.IO
 */

// Initialize Socket.IO connection when document is ready
document.addEventListener('DOMContentLoaded', function() {
  // Connect to Socket.IO server
  const socket = io();
  
  // Socket connection event handlers
  socket.on('connect', function() {
    console.log('Connected to XReader real-time service');
  });
  
  socket.on('disconnect', function() {
    console.log('Disconnected from XReader real-time service');
  });
  
  // Listen for new posts
  socket.on('feed-update', function(data) {
    console.log('New post received:', data);
    
    // Only update feed if we're on the feed page
    if (window.location.pathname === '/feed') {
      // Check if the addNewPostToFeed function exists (defined in feed.ejs)
      if (typeof addNewPostToFeed === 'function') {
        addNewPostToFeed(data);
      } else {
        // If the function doesn't exist, reload the page
        window.location.reload();
      }
    }
  });
  
  // Listen for post likes
  socket.on('post-liked', function(data) {
    console.log('Post like update:', data);
    
    // Update the like count and icon for the post
    const postCard = document.querySelector(`.post-card[data-post-id="${data.postId}"]`);
    if (postCard) {
      const likeBtn = postCard.querySelector('.like-btn');
      const likesCount = likeBtn.querySelector('.likes-count');
      const heartIcon = likeBtn.querySelector('i');
      
      if (likesCount) {
        likesCount.textContent = data.likesCount;
      }
      
      // Update the heart icon if the current user liked/unliked the post
      // This will be handled in page-specific scripts
    }
  });
  
  // Listen for reposts
  socket.on('post-reposted', function(data) {
    console.log('Post reposted:', data);
    
    // Only update feed if we're on the feed page
    if (window.location.pathname === '/feed') {
      // The feed page will have its own handler for adding the repost
    }
  });
});

/**
 * Toggle post like functionality - can be called from any page
 * @param {string} postId - ID of the post to like/unlike
 * @param {Element} likeBtn - The button element that was clicked
 */
function togglePostLike(postId, likeBtn) {
  fetch(`/feed/like/${postId}`, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const heartIcon = likeBtn.querySelector('i');
      const likesCount = likeBtn.querySelector('.likes-count');
      
      if (data.liked) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
      } else {
        heartIcon.classList.remove('fas');
        heartIcon.classList.add('far');
      }
      
      likesCount.textContent = data.likesCount;
      
      // Get Socket.IO instance and emit event
      const socket = io();
      socket.emit('like-post', {
        postId,
        liked: data.liked,
        likesCount: data.likesCount
      });
    }
  })
  .catch(err => {
    console.error('Error liking post:', err);
  });
}

/**
 * Repost a post - can be called from any page
 * @param {string} postId - ID of the post to repost
 */
function repostPost(postId) {
  fetch(`/feed/repost/${postId}`, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Show success message
      alert('Post has been reposted to your feed!');
      
      // Get Socket.IO instance and emit event
      const socket = io();
      socket.emit('repost', data.post);
    }
  })
  .catch(err => {
    console.error('Error reposting:', err);
  });
}

/**
 * Delete a post - can be called from any page
 * @param {string} postId - ID of the post to delete
 * @param {Element} postCard - The post card element to remove from DOM
 */
function deletePost(postId, postCard) {
  if (confirm('Are you sure you want to delete this post?')) {
    fetch(`/feed/post/${postId}`, {
      method: 'DELETE',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Remove the post from the DOM
        postCard.remove();
      }
    })
    .catch(err => {
      console.error('Error deleting post:', err);
    });
  }
}