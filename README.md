# Book Review Web Application

A comprehensive platform for readers to discover, review, and share their thoughts on books.

## About the App

This Book Review Web Application allows users to browse books, create and read reviews, and maintain a personal reading list. Users can register accounts, manage their profiles, interact with other readers, and discover new books based on community recommendations.

**Disclaimer:** This web application was created to fulfill Web Technology module's requirements (4BUIS011C) and does not represent an actual company or service.

## Getting Started

Follow these steps to run the application locally on your machine.

### Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abdulqodir18/book-review-app.git
   cd book-review-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

4. **Access the application**
   
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Dependencies

The project relies on the following key packages:

- **express** - Web application framework
- **ejs** - Template engine
- **body-parser** - Request body parsing middleware
- **express-validator** - Validation middleware
- **morgan** - HTTP request logger
- **mongoose** - MongoDB object modeling
- **nodemon** - Development utility for auto-restarting server (dev dependency)

## Project Structure

```
book-review-app/
├── app.js                  # Application entry point
├── package.json            # Project metadata and dependencies
├── config/                 # Configuration files
├── controllers/            # Route controllers
│   ├── authController.js
│   ├── feedController.js
│   ├── profileController.js
│   └── settingsController.js
├── middleware/             # Custom middleware
│   └── auth.js
├── models/                 # Database models
│   ├── Post.js
│   └── User.js
├── public/                 # Static assets
│   ├── js/
│   │   ├── feed.js
│   │   └── main.js
│   └── styles/
│       └── style.css
├── routes/                 # Route definitions
│   ├── auth.js
│   ├── feed.js
│   ├── profile.js
│   └── settings.js
├── services/               # Business logic
│   ├── index.js
│   ├── postService.js
│   └── userService.js
└── views/                  # Templates
    ├── error.ejs
    ├── feed.ejs
    ├── login.ejs
    ├── profile.ejs
    ├── register.ejs
    ├── settings.ejs
    ├── layouts/
    │   └── main.ejs
    └── partials/
```

## Links

- [GitHub Repository](https://github.com/abdulqodir18/book-review-app)
- [Live Demo](https://book-review-7yjt.onrender.com)

## License

This project is part of academic coursework and is not licensed for commercial use.

## Author

- Abdulqodir Turgunov - WIUT Student ID: 00021945
