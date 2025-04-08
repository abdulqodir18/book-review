// Feed page specific JavaScript

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  
  // Get current active filter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const activeFilter = urlParams.get('filter') || 'all';
  
  // Direct DOM manipulation to ensure character counter works
  function setupCharCounter() {
    
    // Get references to DOM elements
    const textarea = document.getElementById('contentText');
    const charCount = document.getElementById('charCount');
    const charProgress = document.getElementById('charProgress');
    const postButton = document.getElementById('post-button');
    
    // Exit if any required element is missing
    if (!textarea || !charCount || !charProgress || !postButton) {
      return;
    }
    
    // Define the update function
    function updateCharCount() {
      const length = textarea.value.length;
      
      // Update text counter
      charCount.textContent = `${length}/60 characters`;
      
      // Update progress bar width
      const progress = Math.min((length / 60) * 100, 100);
      charProgress.style.width = `${progress}%`;
      charProgress.setAttribute('aria-valuenow', length);
      
      // Update styles based on character count
      if (length >= 60) {
        charCount.className = 'text-success';
        charProgress.className = 'progress-bar bg-success';
        postButton.disabled = false;
      } else {
        charCount.className = 'text-danger';
        charProgress.className = 'progress-bar bg-danger';
        postButton.disabled = true;
      }
    }
    
    // Multiple approaches to attach event listeners
    
    // 1. Using inline attribute (most reliable)
    textarea.setAttribute('oninput', 'this.dispatchEvent(new CustomEvent("characterInput"))');
    textarea.addEventListener('characterInput', updateCharCount);
    
    // 2. Direct event listeners
    textarea.addEventListener('input', updateCharCount);
    textarea.addEventListener('keyup', updateCharCount);
    textarea.addEventListener('change', updateCharCount);
    
    // 3. Manual polling as a fallback
    const interval = setInterval(updateCharCount, 500);
    
    // Initialize
    updateCharCount();
    
    // Force trigger an update after a delay
    setTimeout(() => {
      updateCharCount();
    }, 100);
    
    // Return the cleanup function to prevent memory leaks
    return function cleanup() {
      clearInterval(interval);
      textarea.removeEventListener('input', updateCharCount);
      textarea.removeEventListener('keyup', updateCharCount);
      textarea.removeEventListener('change', updateCharCount);
      textarea.removeEventListener('characterInput', updateCharCount);
    };
  }
  
  // Setup the character counter
  const cleanup = setupCharCounter();
  
  // New post form handler
  const newPostForm = document.getElementById('new-post-form');
  if (newPostForm) {
    newPostForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const bookName = document.getElementById('bookName').value;
      const contentText = document.getElementById('contentText').value;
      const postButton = document.getElementById('post-button');
      const postButtonText = document.getElementById('post-button-text');
      const postButtonSpinner = document.getElementById('post-button-spinner');
      const postFormFeedback = document.getElementById('post-form-feedback');
      
      // Validate minimum character count
      if (contentText.length < 60) {
        alert('Review must be at least 60 characters long.');
        return false;
      }
      
      // Show loading state
      postButton.disabled = true;
      postButtonText.classList.add('d-none');
      postButtonSpinner.classList.remove('d-none');
      
      // Submit using fetch API
      fetch('/feed/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          bookName: bookName,
          contentText: contentText
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Reset form
          newPostForm.reset();
          setupCharCounter();
          
          // Add post to feed
          addNewPostToFeed(data);
          
          // Emit socket event if socket.io is available
          if (typeof socket !== 'undefined' && socket) {
            socket.emit('new-post', data.post);
          }
          
          // Hide feedback message
          postFormFeedback.classList.add('d-none');
        } else {
          postFormFeedback.textContent = 'Error: ' + (data.errors[0]?.msg || 'Unknown error occurred');
          postFormFeedback.classList.remove('d-none');
        }
      })
      .catch(error => {
        postFormFeedback.textContent = 'Failed to create post. Please try again.';
        postFormFeedback.classList.remove('d-none');
      })
      .finally(() => {
        // Reset loading state
        postButton.disabled = false;
        postButtonText.classList.remove('d-none');
        postButtonSpinner.classList.add('d-none');
      });
    });
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', function() {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  });
  
  // Socket.IO connection
  const socket = io();
  
  // Listen for new posts
  socket.on('feed-update', function(data) {
    // Skip adding the post if we're in following mode and this isn't from a user we follow
    if (activeFilter === 'following') {
      // Check if this is the current user's post (always show those)
      const currentUserId = document.querySelector('.post-card[data-current-user]')?.dataset.currentUser;
      const isCurrentUserPost = data.post.userId === currentUserId;
      
      if (!isCurrentUserPost) {
        // Need to check if this user is followed
        // Since we don't have an easy way to check this client-side,
        // we'll rely on the server not sending us posts we shouldn't see
        // Or we can implement a specific check via a new endpoint if needed
        
        // For now, we'll assume that if we're on the following feed,
        // the server is filtering appropriately
        return;
      }
    }
    
    addNewPostToFeed(data);
  });
  
  // Listen for post likes
  socket.on('post-liked', function(data) {
    updatePostLikes(data);
  });
  
  // Listen for reposts
  socket.on('post-reposted', function(data) {
    updatePostReposts(data);
  });
  
  // For backward compatibility with older 'repost' events
  socket.on('repost', function(data) {
    if (data.post) {
      addNewPostToFeed({post: data.post, user: data.user || {}});
    }
  });
  
  // Like button functionality
  document.addEventListener('click', function(e) {
    if (e.target.closest('.like-btn')) {
      const likeBtn = e.target.closest('.like-btn');
      const postId = likeBtn.dataset.postId;
      
      fetch(`/feed/like/${postId}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Update the like button
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
          
          // Emit socket event
          socket.emit('like-post', {
            postId,
            liked: data.liked,
            likesCount: data.likesCount
          });
        }
      })
      .catch(err => {
        // Error handling
      });
    }
  });
  
  // Repost button functionality
  document.addEventListener('click', function(e) {
    if (e.target.closest('.repost-btn')) {
      const repostBtn = e.target.closest('.repost-btn');
      const postId = repostBtn.dataset.postId;
      
      fetch(`/feed/repost/${postId}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Update the repost button
          if (data.reposted) {
            repostBtn.classList.remove('btn-outline-success');
            repostBtn.classList.add('btn-success');
            
            // Update button text to "Undo repost"
            const textNode = Array.from(repostBtn.childNodes)
              .find(node => node.nodeType === Node.TEXT_NODE || 
                    (node.classList && node.classList.contains('repost-btn-text')));
            
            if (textNode) {
              if (textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' Undo repost ';
              } else {
                textNode.textContent = 'Undo repost';
              }
            } else {
              repostBtn.innerHTML = '<i class="fas fa-retweet"></i> Undo repost <span class="reposts-count">' + data.repostsCount + '</span>';
            }

            // Get current user info from any post card (needed for broadcasting)
            const currentUser = {
              username: '',
              fullName: ''
            };
            
            // Get the current user info from a post card or fallback to session data
            const postWithCurrentUser = document.querySelector('.post-card[data-current-user]');
            if (postWithCurrentUser) {
              const authorLinks = document.querySelectorAll('a[href^="/profile/"]');
              authorLinks.forEach(link => {
                const path = link.getAttribute('href');
                const username = path.replace('/profile/', '');
                if (link.textContent.includes('@' + username)) {
                  currentUser.username = username;
                  // Try to get the full name from nearby elements
                  const parentElement = link.parentElement;
                  const strongElement = parentElement.querySelector('strong');
                  if (strongElement) {
                    currentUser.fullName = strongElement.textContent;
                  }
                }
              });
            }
            
            // Emit socket event with complete information
            socket.emit('post-reposted', {
              postId: data.post.postId,
              originalPostId: data.originalPostId || data.post.postId,
              repost: data.repost, // The newly created repost
              reposted: data.reposted,
              repostsCount: data.repostsCount,
              user: currentUser, // Include user info for display
              action: 'create' // Indicate this is a new repost
            });
            
          } else {
            repostBtn.classList.remove('btn-success');
            repostBtn.classList.add('btn-outline-success');
            
            // Update button text to "Repost"
            const textNode = Array.from(repostBtn.childNodes)
              .find(node => node.nodeType === Node.TEXT_NODE || 
                    (node.classList && node.classList.contains('repost-btn-text')));
            
            if (textNode) {
              if (textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' Repost ';
              } else {
                textNode.textContent = 'Repost';
              }
            } else {
              repostBtn.innerHTML = '<i class="fas fa-retweet"></i> Repost <span class="reposts-count">' + data.repostsCount + '</span>';
            }
            
            // Emit socket event for undo repost
            socket.emit('post-reposted', {
              postId: data.post.postId,
              originalPostId: data.originalPostId || data.post.postId,
              reposted: data.reposted,
              repostsCount: data.repostsCount,
              action: 'delete' // Indicate this is removing a repost
            });
          }
          
          // Update repost count
          const repostsCount = repostBtn.querySelector('.reposts-count');
          if (repostsCount) {
            repostsCount.textContent = data.repostsCount;
          }
        }
      })
      .catch(err => {
        // Error handling
      });
    }
  });
  
  // Delete post functionality
  document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-post-btn')) {
      if (confirm('Are you sure you want to delete this post?')) {
        const deleteBtn = e.target.closest('.delete-post-btn');
        const postId = deleteBtn.dataset.postId;
        const postCard = deleteBtn.closest('.post-card');
        
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
          // Error handling
        });
      }
    }
  });
  
  // Function to add a new post to the feed
  function addNewPostToFeed(data) {
    // Check if we should show this post based on filter
    if (activeFilter === 'following') {
      // For real-time updates, we need to know if this user is followed
      // This is handled by the check in the socket event handler
    }
    
    const postsContainer = document.getElementById('posts-container');
    const template = document.getElementById('post-template');
    
    if (!postsContainer || !template) return;
    
    // Check if there's an empty feed message and remove it
    const emptyFeedMessage = postsContainer.querySelector('.alert-info');
    if (emptyFeedMessage) {
      emptyFeedMessage.remove();
    }
    
    // Clone the template
    const post = template.content.cloneNode(true);
    const postCard = post.querySelector('.post-card');
    
    // Determine if this is a repost
    const isRepost = data.post.originalPostId ? true : false;
    
    // For reposts, we need to reference the original post for likes/reposts
    const postForCounts = isRepost && data.originalPost ? data.originalPost : data.post;
    
    // Set post data
    postCard.dataset.postId = data.post.postId;
    
    // If this is a repost, store the original post ID in the data attribute
    if (isRepost) {
      postCard.dataset.originalPostId = data.post.originalPostId;
    }
    
    // Get current user ID from the page context
    const currentUserId = document.querySelector('.post-card[data-post-id]')?.dataset.currentUser;
    if (currentUserId) {
      postCard.dataset.currentUser = currentUserId;
    }
    
    // Handle author display and repost attribution
    const authorLink = post.querySelector('.post-author-link');
    const authorName = post.querySelector('.post-author-name');
    const authorUsername = post.querySelector('.post-author-username');
    
    if (isRepost) {
      // Get the original post author info (might be data.originalAuthor, data.originalUser, or have to use data.user)
      const originalAuthor = data.originalAuthor || data.originalUser || (data.originalPost ? data.originalPost.user : null);
      
      // This is a repost - show repost indicator
      const repostIndicator = post.querySelector('.repost-indicator');
      if (repostIndicator) {
        repostIndicator.classList.remove('d-none');
      
        // Set links for original author and reposter
        const originalAuthorLink = repostIndicator.querySelector('.original-author-link');
        const originalUsername = repostIndicator.querySelector('.original-username');
        const repostUserLink = repostIndicator.querySelector('.repost-user-link');
        const repostUsername = repostIndicator.querySelector('.repost-username');
      
        // Set original author info
        if (originalAuthorLink && originalUsername && originalAuthor) {
          originalAuthorLink.href = `/profile/${originalAuthor.username || 'unknown'}`;
          originalUsername.textContent = originalAuthor.username || 'unknown';
        }
      
        // Set reposter info (current user info)
        if (repostUserLink && repostUsername) {
          repostUserLink.href = `/profile/${data.user.username}`;
          repostUsername.textContent = data.user.username;
        }
      
        // Set the main display to show the original post author
        if (originalAuthor) {
          authorLink.href = `/profile/${originalAuthor.username || 'unknown'}`;
          authorName.textContent = originalAuthor.fullName || 'Unknown User';
          authorUsername.textContent = '@' + (originalAuthor.username || 'unknown');
        } else {
          // Fallback if original author info isn't available
          authorLink.href = `/profile/${data.user.username}`;
          authorName.textContent = data.user.fullName;
          authorUsername.textContent = '@' + data.user.username;
        }
      }
    } else {
      // Regular post - set author to current user
      authorLink.href = `/profile/${data.user.username}`;
      authorName.textContent = data.user.fullName;
      authorUsername.textContent = '@' + data.user.username;
    }
    
    // Set post content
    post.querySelector('.post-date').textContent = new Date().toLocaleDateString();
    post.querySelector('.post-book-name').textContent = data.post.bookName;
    post.querySelector('.post-content').textContent = data.post.contentText;
    
    // Set up action buttons - always reference the original post ID for actions when it's a repost
    const likeBtn = post.querySelector('.like-btn');
    const repostBtn = post.querySelector('.repost-btn');
    const repostBtnText = post.querySelector('.repost-btn-text');
    const deleteBtn = post.querySelector('.delete-post-btn');
    
    // Always use the original post ID for interactions when this is a repost
    const actionPostId = isRepost ? data.post.originalPostId : data.post.postId;
    
    likeBtn.dataset.postId = actionPostId;
    repostBtn.dataset.postId = actionPostId;
    
    // Set initial like state if the current user already liked it
    // Use postForCounts which references the original post for reposts
    if (postForCounts.likes && currentUserId && postForCounts.likes.includes(currentUserId)) {
      const heartIcon = likeBtn.querySelector('i');
      heartIcon.classList.remove('far');
      heartIcon.classList.add('fas');
    }
    
    // Update like count
    if (postForCounts.likes) {
      likeBtn.querySelector('.likes-count').textContent = postForCounts.likes.length;
    }
    
    // Set repost state if the current user already reposted it
    if (postForCounts.reposts && currentUserId && postForCounts.reposts.includes(currentUserId)) {
      repostBtn.classList.remove('btn-outline-success');
      repostBtn.classList.add('btn-success');
      
      // Update button text
      repostBtnText.textContent = 'Undo repost';
    }
    
    // Update repost count
    if (postForCounts.reposts) {
      repostBtn.querySelector('.reposts-count').textContent = postForCounts.reposts.length;
    }
    
    // If this is the current user's post, show delete button
    if (currentUserId && data.post.userId === currentUserId) {
      deleteBtn.classList.remove('d-none');
      deleteBtn.dataset.postId = data.post.postId;
    }
    
    // Add the post to the top of the feed
    postsContainer.prepend(postCard);
  }
  
  // Function to update post likes
  function updatePostLikes(data) {
    // Find all related posts - both the original and any reposts of it
    const originalPostSelector = data.originalPostId ? 
      `.post-card[data-post-id="${data.originalPostId}"]` :
      `.post-card[data-post-id="${data.postId}"]`;
    
    const repostSelector = `.post-card[data-original-post-id="${data.postId}"], .post-card[data-original-post-id="${data.originalPostId || data.postId}"]`;
    
    // Combined selector to get all related posts at once
    const allRelatedPosts = document.querySelectorAll(`${originalPostSelector}, ${repostSelector}`);
    
    console.log(`Updating ${allRelatedPosts.length} related posts for like action on post ${data.postId}`);
    
    // Update all related posts with the new like count
    allRelatedPosts.forEach(postCard => {
      const likeBtn = postCard.querySelector('.like-btn');
      if (!likeBtn) return;
      
      const heartIcon = likeBtn.querySelector('i');
      const likesCount = likeBtn.querySelector('.likes-count');
      
      // Update like count
      if (likesCount) {
        likesCount.textContent = data.likesCount;
      }
      
      // We don't update the like icon state here, as that would depend on whether 
      // the current user is the one who liked the post, which is handled directly
      // in the response to the like action for that specific user
    });
    
    console.log(`Post ${data.postId} like count updated to ${data.likesCount} across all related posts`);
  }
  
  // Function to update post reposts
  function updatePostReposts(data) {
    console.log('Received repost update:', data);
    
    // For 'create' actions with repost data, add the repost to the feed
    if (data.action === 'create' && data.repost) {
      console.log('Adding new repost to feed');
      
      // Format data for addNewPostToFeed
      const repostData = {
        post: data.repost,
        user: data.user
      };
      
      // Add the repost to the feed
      addNewPostToFeed(repostData);
    }
    
    // Find all related posts - both the original and any reposts of it
    const originalPostSelector = data.originalPostId ? 
      `.post-card[data-post-id="${data.originalPostId}"]` :
      `.post-card[data-post-id="${data.postId}"]`;
    
    const repostSelector = `.post-card[data-original-post-id="${data.postId}"], .post-card[data-original-post-id="${data.originalPostId || data.postId}"]`;
    
    // Combined selector to get all related posts at once
    const allRelatedPosts = document.querySelectorAll(`${originalPostSelector}, ${repostSelector}`);
    
    console.log(`Updating ${allRelatedPosts.length} related posts for repost action on post ID: ${data.postId}`);
    
    if (allRelatedPosts.length === 0) {
      console.log('No related posts found in DOM with selectors:', {
        originalPostSelector,
        repostSelector
      });
      return;
    }
    
    // Update all related posts with the new count
    allRelatedPosts.forEach(postCard => {
      const repostBtn = postCard.querySelector('.repost-btn');
      if (!repostBtn) return;
      
      const repostsCount = repostBtn.querySelector('.reposts-count');
      
      // Update repost count
      if (repostsCount) {
        repostsCount.textContent = data.repostsCount;
        console.log(`Updated repost count to ${data.repostsCount} for post card:`, postCard.dataset.postId);
      } else {
        // If the reposts-count element doesn't exist, update the whole button
        const repostCountSpan = document.createElement('span');
        repostCountSpan.className = 'reposts-count';
        repostCountSpan.textContent = data.repostsCount;
        repostBtn.appendChild(repostCountSpan);
        console.log('Created new repost count element for post:', postCard.dataset.postId);
      }
    });
  }
});
// End of feed.js