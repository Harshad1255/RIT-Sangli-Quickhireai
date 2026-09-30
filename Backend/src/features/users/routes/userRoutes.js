const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const OTPVerification = require('../models/OTPVerification');
const { sendOTPEmail } = require('../../../utils/emailService');
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
    console.log('Received registration request');

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
      console.log('Registration rejected: account already exists');
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

    console.log('Saving new user account');
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

// Generate a random 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP
router.post('/send-otp', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('role').isIn(['student', 'company']).withMessage('Invalid role'),
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

    const { email, role } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please sign up first.' });
    }

    // Check if role matches
    if (user.userType !== role) {
      return res.status(403).json({ error: `This email is registered as a ${user.userType}, not a ${role}.` });
    }

    // Invalidate any existing unused OTPs for this email and role
    await OTPVerification.deleteMany({ email, role });

    // Generate new OTP
    const otp = generateOTP();
    
    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Save OTP to database (expires in 5 minutes via TTL)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await OTPVerification.create({
      email,
      role,
      otpHash,
      expiresAt
    });

    // Send email
    await sendOTPEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to ' + email
    });
  } catch (error) {
    console.error('Send OTP error:', {
      email: req.body?.email,
      role: req.body?.role,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error.message && /SMTP|email.*config|credentials|Missing credentials|gmail/i.test(error.message)) {
      return res.status(500).json({
        error: 'Email service is not configured. Please contact the administrator.'
      });
    }

    if (error.message && /invalid email|recipient|address/i.test(error.message)) {
      return res.status(400).json({
        error: 'Unable to send OTP. Please check your email address and try again.'
      });
    }

    res.status(500).json({ error: 'Unable to send OTP. Please check your email address and try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('role').isIn(['student', 'company']).withMessage('Invalid role'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
  }

  try {
    if (!global.isDatabaseConnected) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'MongoDB connection is not available.'
      });
    }

    const { email, role, otp } = req.body;

    // Find the OTP record
    const otpRecord = await OTPVerification.findOne({ email, role, used: false });
    
    if (!otpRecord) {
      return res.status(400).json({ error: 'No active OTP found. Please request a new one.' });
    }

    // Check expiration manually as a fallback (TTL index handles background deletion)
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      // Invalidate it
      otpRecord.used = true;
      await otpRecord.save();
      return res.status(400).json({ error: 'Too many verification attempts. Please request a new OTP.' });
    }

    // Increment attempts
    otpRecord.attempts += 1;
    
    // Verify OTP
    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    
    if (!isMatch) {
      await otpRecord.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP is valid - mark as used
    otpRecord.used = true;
    await otpRecord.save();

    // Find user to generate JWT
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify role matches
    if (user.userType !== role) {
      return res.status(403).json({ error: `This email is registered as a ${user.userType}.` });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const userPayload = {
      _id: user._id,
      id: user._id.toString(),
      userType: user.userType,
      email: user.email,
      name: user.name || user.companyName || ''
    };

    // Generate JWT token
    const token = jwt.sign(
      userPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate a refresh token
    const refreshToken = jwt.sign(
      userPayload,
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
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Login user (Legacy - kept for backward compatibility if needed)
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

    const userPayload = {
      _id: user._id,
      id: user._id.toString(),
      userType: user.userType,
      email: user.email,
      name: user.name || user.companyName || ''
    };

    // Generate JWT token
    const token = jwt.sign(
      userPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate a refresh token (longer lifespan). Note: this is stateless and for dev only.
    const refreshToken = jwt.sign(
      userPayload,
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

    const userPayload = {
      _id: user._id,
      id: user._id.toString(),
      userType: user.userType,
      email: user.email,
      name: user.name || user.companyName || ''
    };

    // Issue new access token (and optionally a new refresh token)
    const newToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    const newRefresh = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

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