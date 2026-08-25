const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeCompany } = require('../../auth/middleware/auth');
const codingProblemController = require('../controllers/codingProblemController');

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
  max: 10,
  message: { success: false, error: 'Too many generation requests, please try again later.' }
});

// Company Routes
router.post(
  '/problems/generate',
  authenticateToken,
  authorizeCompany,
  generateLimiter,
  codingProblemController.generateProblem
);
router.post(
  '/problems',
  authenticateToken,
  authorizeCompany,
  [
    body('title').notEmpty().withMessage('Problem title is required'),
    body('difficulty').optional().isIn(['Easy', 'Medium', 'Hard']).withMessage('Difficulty must be Easy, Medium, or Hard')
  ],
  validate,
  codingProblemController.createProblem
);

router.get(
  '/problems/company',
  authenticateToken,
  authorizeCompany,
  codingProblemController.getCompanyProblems
);

router.put(
  '/problems/:id',
  authenticateToken,
  authorizeCompany,
  codingProblemController.editProblem
);

router.get(
  '/problems/:id/submissions',
  authenticateToken,
  authorizeCompany,
  codingProblemController.getProblemStats
);

// Student Routes
router.get(
  '/problems',
  authenticateToken,
  codingProblemController.listProblems
);

router.get(
  '/problems/:id',
  authenticateToken,
  codingProblemController.getProblemDetail
);

router.post(
  '/problems/:id/run',
  authenticateToken,
  [
    body('language').notEmpty().withMessage('Language is required')
  ],
  validate,
  codingProblemController.runProblem
);

router.post(
  '/problems/:id/submit',
  authenticateToken,
  [
    body('language').notEmpty().withMessage('Language is required')
  ],
  validate,
  codingProblemController.submitProblem
);

router.get(
  '/submissions/mine',
  authenticateToken,
  codingProblemController.getMySubmissions
);

module.exports = router;
