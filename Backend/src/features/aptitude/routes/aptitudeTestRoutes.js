const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeCompany } = require('../../auth/middleware/auth');
const aptitudeTestController = require('../controllers/aptitudeTestController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array().map(e => e.msg).join(', ')
    });
  }
  next();
};

const rateLimit = require('express-rate-limit');

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Increased to support single-question regeneration
  message: { success: false, error: 'Too many generation requests, please try again later.' }
});

// Public/Candidate Routes for Chapters
router.get(
  '/chapters',
  authenticateToken,
  aptitudeTestController.getChapters
);

router.post(
  '/start-chapter',
  authenticateToken,
  aptitudeTestController.startChapterTest
);

// PYQ Candidate Routes
const aptitudeController = require('../controllers/aptitudeController');

router.get(
  '/pyq/companies',
  authenticateToken,
  aptitudeController.getPYQCompanies
);

router.get(
  '/pyq/companies/:company',
  authenticateToken,
  aptitudeController.getPYQForCompany
);

router.post(
  '/start-pyq',
  authenticateToken,
  aptitudeController.startPYQTest
);

// Company Routes
router.post(
  '/generate',
  authenticateToken,
  authorizeCompany,
  generateLimiter,
  aptitudeTestController.generateQuestions
);

router.post(
  '/',
  authenticateToken,
  authorizeCompany,
  [
    body('title').notEmpty().withMessage('Test title is required'),
    body('totalTimeMinutes').optional().isNumeric().withMessage('Time limit must be a number'),
    body('passThreshold').optional().isNumeric().withMessage('Pass threshold must be a number')
  ],
  validate,
  aptitudeTestController.createTest
);

router.get(
  '/company/leaderboard',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.getCompanyLeaderboard
);

router.get(
  '/company/tests/:testId/leaderboard/pdf',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.getLeaderboardPdf
);

router.get(
  '/company',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.getCompanyTests
);

router.put(
  '/company/:id/slots',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.manageSlots
);

router.get(
  '/tests/:id/availability',
  authenticateToken,
  aptitudeTestController.getTestAvailability
);

router.put(
  '/:id',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.editTest
);

router.post(
  '/:id/questions',
  authenticateToken,
  authorizeCompany,
  [
    body('questions').isArray({ min: 1 }).withMessage('Questions array is required and must not be empty')
  ],
  validate,
  aptitudeTestController.addQuestions
);

router.post(
  '/:id/assign',
  authenticateToken,
  authorizeCompany,
  [
    body('candidates').isArray({ min: 1 }).withMessage('Candidates array is required')
  ],
  validate,
  aptitudeTestController.assignCandidates
);

router.get(
  '/:id/results',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.getTestResults
);

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { success: false, error: 'Too many attempts. Please try again later.' }
});

// Student Routes
router.post(
  '/verify-code',
  authenticateToken,
  verifyLimiter,
  aptitudeTestController.verifyEntranceCode
);

router.get(
  '/student',
  authenticateToken,
  aptitudeTestController.getStudentTests
);

router.post(
  '/:id/start',
  authenticateToken,
  aptitudeTestController.startAttempt
);

router.patch(
  '/attempt/:attemptId/answer',
  authenticateToken,
  [
    body('questionIndex').isNumeric().withMessage('questionIndex must be a number')
  ],
  validate,
  aptitudeTestController.answerQuestion
);

router.post(
  '/attempt/:attemptId/answers',
  authenticateToken,
  aptitudeTestController.saveAnswers
);

router.post(
  '/attempt/:attemptId/submit',
  authenticateToken,
  aptitudeTestController.submitAttempt
);

router.get(
  '/attempt/:attemptId/result',
  authenticateToken,
  aptitudeTestController.getScoredResult
);

router.post(
  '/attempt/:attemptId/false-alarm',
  authenticateToken,
  authorizeCompany,
  aptitudeTestController.markFalseAlarm
);

router.get(
  '/attempt/:attemptId/pdf',
  authenticateToken,
  aptitudeTestController.generatePdfReport
);

router.delete(
  '/:id',
  authenticateToken,
  aptitudeTestController.deleteTest
);

router.post(
  '/:id/hide',
  authenticateToken,
  aptitudeTestController.hideTest
);

module.exports = router;
