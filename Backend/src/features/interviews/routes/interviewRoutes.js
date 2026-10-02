const express = require('express');
const router = express.Router();
const multer = require('multer');
const interviewController = require('../controllers/interviewController');
const { authenticateToken, authorizeCompany } = require('../../auth/middleware/auth');
const { MAX_CANDIDATE_FILE_BYTES } = require('../utils/candidateSpreadsheet');

const receiveCandidateFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CANDIDATE_FILE_BYTES },
}).single('file');

const uploadCandidateFile = (req, res, next) => {
  receiveCandidateFile(req, res, (error) => {
    if (!error) return next();
    const isSizeLimit = error.code === 'LIMIT_FILE_SIZE';
    return res.status(isSizeLimit ? 413 : 400).json({
      success: false,
      error: isSizeLimit ? 'Excel file exceeds the 10 MB limit' : 'Unable to read uploaded file',
    });
  });
};

// Test endpoints
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Interview routes are working!',
    timestamp: new Date().toISOString()
  });
});

router.get('/test-auth', authenticateToken, interviewController.testAuth);

// Interview management routes
router.post('/', authenticateToken, authorizeCompany, interviewController.createInterview);
router.get('/company', authenticateToken, authorizeCompany, interviewController.getCompanyInterviews);
router.get('/:id', authenticateToken, interviewController.getInterview);

// Candidate management routes
router.post('/:interviewId/upload-candidates', 
  authenticateToken, 
  authorizeCompany, 
  uploadCandidateFile,
  interviewController.uploadCandidates
);
router.put('/:interviewId/candidates/:candidateId/status', 
  authenticateToken, 
  authorizeCompany, 
  interviewController.updateCandidateStatus
);
router.post('/validate-code', interviewController.validateInterviewCode);

// Interview session routes
router.post('/start', interviewController.startInterview);
router.get('/:id/questions', (req, res) => {
  try {
    const interviewCode = req.params.id;
    const session = interviewController.getInterviewSession(interviewCode);
    
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    console.log('Sending questions for session:', session.id);
    res.json(session.questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Error fetching questions' });
  }
});

// Results and analysis routes
router.post('/process-answer', interviewController.processAnswer);
router.post('/evaluate-answer', async (req, res) => {
  try {
    const { answer, question, interviewCode, questionNumber, skipped } = req.body;
    
    console.log('Received answer evaluation request:', {
      interviewCode,
      questionNumber,
      hasAnswer: !!answer,
      hasQuestion: !!question,
      skipped: !!skipped,
      answer: answer ? answer.substring(0, 50) + '...' : 'empty' // Log first 50 chars of answer
    });

    // Allow empty answer if question is being skipped
    if (!question) {
      return res.status(400).json({ 
        success: false,
        error: 'Question is required'
      });
    }

    // Allow empty answer for skipped questions
    if (!answer && !skipped) {
      return res.status(400).json({ 
        success: false,
        error: 'Answer is required unless question is being skipped'
      });
    }

    // Get interview session
    const session = interviewController.getInterviewSession(interviewCode);
    if (!session) {
      console.error('Session not found for code:', interviewCode);
      return res.status(404).json({ 
        success: false,
        error: 'Interview session not found'
      });
    }

    // Use the processAnswer controller method
    // Do not overwrite req.body, just pass the existing properties
    req.body = { 
      ...req.body,
      questionNumber: questionNumber ? questionNumber - 1 : undefined
    };
    return interviewController.processAnswer(req, res);

  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error evaluating answer',
      details: error.message
    });
  }
});

router.post('/final-evaluation', async (req, res) => {
  try {
    const { answers } = req.body;
    const geminiService = require('../services/geminiService');
    const finalEvaluation = await geminiService.generateFinalEvaluation(answers);
    res.json(finalEvaluation);
  } catch (error) {
    console.error('Error generating final evaluation:', error);
    res.status(500).json({ error: 'Error generating final evaluation' });
  }
});

// End interview route - must come before parameterized routes
router.post('/end', interviewController.endInterview);

router.post('/:interviewId/candidates/:candidateCode/end', interviewController.endInterview);
router.get('/:id/results', authenticateToken, interviewController.getInterviewResults);
router.get('/mock-results', authenticateToken, interviewController.getMockInterviewResults);
router.post('/submit-results', authenticateToken, interviewController.submitInterviewResults);
router.post('/submit-all-answers', interviewController.submitAllAnswers);
router.get('/report/:interviewId/:candidateId', authenticateToken, interviewController.generatePdfReport);
router.post('/analyze-face', interviewController.analyzeFace);
router.post('/report-activity', interviewController.reportActivity);

module.exports = router; 