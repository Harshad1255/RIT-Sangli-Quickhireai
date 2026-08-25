const express = require('express');
const router = express.Router();
const { scholasticController } = require('../controllers');
const auth = require('../../../middleware/auth');

const optionalAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return next();
  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (token && process.env.JWT_SECRET) {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch (err) {
    // Ignore invalid token in optionalAuth
  }
  next();
};

// Companies
router.get('/companies', scholasticController.getCompanies);

// Leaderboard
router.get('/leaderboard', scholasticController.getLeaderboard);

// User Progress & Analytics
router.get('/progress', optionalAuth, scholasticController.getProgress);
router.get('/analytics', optionalAuth, scholasticController.getProgress);

// Bookmarks
router.get('/bookmarks', optionalAuth, scholasticController.getBookmarks);
router.post('/bookmark', optionalAuth, scholasticController.toggleBookmark);
router.post('/bookmarks', optionalAuth, scholasticController.toggleBookmark);

// Mock Tests
router.get('/mocktests', scholasticController.getMockTests);
router.get('/mocktests/:id', scholasticController.getMockTestById);
router.post('/mocktests/:id/submit', optionalAuth, scholasticController.submitMockTest);
router.get('/mocktests/attempts/:id/analysis', optionalAuth, scholasticController.getMockTestAnalysis);

// Contests
router.get('/contests', scholasticController.getContests);
router.post('/contests/:id/register', optionalAuth, scholasticController.registerForContest);

// Daily Challenge
router.get('/daily-challenge', scholasticController.getDailyChallenge);

module.exports = router;
