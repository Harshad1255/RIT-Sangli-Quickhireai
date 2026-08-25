const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// Test route to check database connection and list all users
router.get('/test', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Check if database is connected using global flag
    if (!global.isDatabaseConnected) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'MongoDB connection is not available',
        status: 'offline'
      });
    }
    
    const users = await User.find({});
    console.log(`Found ${users.length} users in database`);
    res.json({ 
      message: 'Database connection successful',
      database: process.env.MONGODB_URI.split('/').pop(),
      users,
      status: 'online'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      error: error.message,
      status: 'error'
    });
  }
});

// Register a new user
router.post('/register', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userType').isIn(['student', 'company']).withMessage('Invalid user type'),
  // Add more validation as needed
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
  }

  try {
    console.log('Received registration request:', req.body);

    if (!global.isDatabaseConnected) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'MongoDB connection is not available. Please configure the Atlas URI and whitelist your IP.'
      });
    }

    const { email, password, userType, ...userData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      userType,
      ...userData,
    });

    console.log('Saving new user:', { email, userType });
    await user.save();
    console.log('User saved successfully');

    // Send back user data without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ 
      message: 'User registered successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userType').isIn(['student', 'company']).withMessage('Invalid user type'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
  }

  try {
    if (!global.isDatabaseConnected) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'MongoDB connection is not available. Please configure the Atlas URI and whitelist your IP.'
      });
    }

    const { email, password, userType } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify user type matches
    if (user.userType !== userType) {
      return res.status(401).json({ error: `Please login as a ${user.userType}` });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { _id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate a refresh token (longer lifespan). Note: this is stateless and for dev only.
    const refreshToken = jwt.sign(
      { _id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Convert user to object and remove password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      message: 'Login successful',
      user: userResponse,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh endpoint: exchange a refresh token for a new access token
router.post('/refresh', async (req, res) => {
  try {
    // Support either { refreshToken } or { token } payloads (frontend may send { token })
    const refreshToken = req.body.refreshToken || req.body.token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      console.warn('Invalid refresh token:', err.message);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Optional: verify user still exists
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Issue new access token (and optionally a new refresh token)
    const newToken = jwt.sign({ _id: user._id, userType: user.userType }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const newRefresh = jwt.sign({ _id: user._id, userType: user.userType }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({ token: newToken, refreshToken: newRefresh });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    if (!global.isDatabaseConnected) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'MongoDB connection is not available. Please configure the Atlas URI and whitelist your IP.'
      });
    }

    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 