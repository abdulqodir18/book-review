const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feed');
const profileRoutes = require('./routes/profile');
const settingsRoutes = require('./routes/settings');

// Import middleware
const { populateUserData } = require('./middleware/auth');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Set the port
const PORT = process.env.PORT || 3000;

// Create session store
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'xreader-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/xreader',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14 // 14 days
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xreader', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  // Database connected successfully
}).catch(err => {
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(morgan('dev'));

// Set up express-ejs-layouts
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, 'public')));
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Session configuration
app.use(sessionMiddleware);

// Add populate user data middleware
app.use(populateUserData);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', authRoutes);
app.use('/feed', feedRoutes);
app.use('/profile', profileRoutes);
app.use('/settings', settingsRoutes);

// Redirect root to feed page
app.get('/', (req, res) => {
  res.redirect('/feed');
});

// 404 error handler - must come after all routes
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {}
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(500).render('error', { 
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Socket.IO connection
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

io.on('connection', (socket) => {
  
  // Handle new post event
  socket.on('new-post', (post) => {
    // Broadcast to all clients except the sender
    socket.broadcast.emit('feed-update', {
      post,
      user: socket.request.session?.user || { username: 'anonymous', fullName: 'Anonymous User' }
    });
  });
  
  // Handle like event
  socket.on('like-post', (data) => {
    // Broadcast to all clients except the sender
    socket.broadcast.emit('post-liked', data);
  });
  
  // Handle repost event (new format)
  socket.on('post-reposted', async (data) => {
    
    // Include user info from the session if available and not provided
    if (!data.user || !data.user.username) {
      data.user = socket.request.session?.user || { 
        username: 'anonymous', 
        fullName: 'Anonymous User' 
      };
    }
    
    // For create action, we need to create a post-like structure to show in feeds
    if (data.action === 'create' && data.repost) {
      try {
        // Try to get the original post's author information for proper attribution
        const { postService, userService } = require('./services');
        const originalPost = await postService.getPostById(data.originalPostId || data.postId);
        
        if (originalPost && originalPost.userId) {
          const originalAuthor = await userService.getUserById(originalPost.userId);
          
          // Create a standardized post structure for the repost for display
          const repostData = {
            post: data.repost,
            user: data.user,
            originalPost: originalPost,
            originalAuthor: originalAuthor ? {
              username: originalAuthor.username,
              fullName: originalAuthor.fullName,
              userId: originalAuthor.userId
            } : undefined,
            originalPostId: data.originalPostId || data.postId
          };
          
          // Broadcast both a repost update and a new post
          socket.broadcast.emit('post-reposted', data);
          socket.broadcast.emit('feed-update', repostData);
          
          return;
        }
      } catch (error) {
        // Continue with regular broadcasting if there was an error
      }
      
      // Fallback if we couldn't get the original author
      const repostData = {
        post: data.repost,
        user: data.user,
        originalPostId: data.originalPostId || data.postId
      };
      
      // Broadcast both a repost update and a new post
      socket.broadcast.emit('post-reposted', data);
      socket.broadcast.emit('feed-update', repostData);
      
    } else {
      // For delete action or simple count updates, just broadcast the repost event
      socket.broadcast.emit('post-reposted', data);
    }
  });
  
  // Handle old repost event format for backward compatibility
  socket.on('repost', (data) => {
    // Broadcast to all clients except the sender
    socket.broadcast.emit('repost', data);
    
    // Also emit in the new format if possible
    if (data.post) {
      socket.broadcast.emit('post-reposted', {
        postId: data.post.postId,
        reposted: true,
        repostsCount: data.post.reposts ? data.post.reposts.length : 0
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    // User disconnected
  });
});

// Start server
server.listen(PORT, () => {
  // Server is running
});

module.exports = { app, server, io };