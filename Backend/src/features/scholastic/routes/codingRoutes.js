const express = require('express');
const router = express.Router();
const { codingController } = require('../controllers');
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

router.get('/questions', codingController.getQuestions);
router.get('/questions/:id', codingController.getQuestionById);
router.post('/run', codingController.runCode);
router.post('/submit', optionalAuth, codingController.submitCode);
router.get('/submissions/:questionId', optionalAuth, codingController.getSubmissions);

module.exports = router;
