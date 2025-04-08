/**
 * Services index file
 * Central export point for all service modules
 */

const postService = require('./postService');
const userService = require('./userService');

module.exports = {
  postService,
  userService
};