const express = require('express');
const router = express.Router();
const { aptitudeController } = require('../controllers');
const auth = require('../../../middleware/auth');

// Optional auth middleware so req.user is populated if token is present
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

router.get('/categories', aptitudeController.getCategories);
router.get('/questions', aptitudeController.getQuestions);
router.get('/questions/random', aptitudeController.getRandomQuestion);
router.get('/questions/:id', aptitudeController.getQuestionById);
router.post('/submit', optionalAuth, aptitudeController.submitAnswer);

module.exports = router;
