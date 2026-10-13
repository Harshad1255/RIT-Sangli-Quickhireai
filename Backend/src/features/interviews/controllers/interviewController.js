const { serializeAnswer } = require('../services/evaluationUtils');
// Import separated controllers
const createInterviewController = require('./createInterviewController');
const candidateController = require('./candidateController');
const questionController = require('./questionController');
const resultController = require('./resultController');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const { completedSession } = require('../services/sessionCompletion');

// Re-export all functions from separated controllers
module.exports = {
  // Interview creation and management
  createInterview: createInterviewController.createInterview,
  getCompanyInterviews: createInterviewController.getCompanyInterviews,
  getInterview: createInterviewController.getInterview,
  
  // Candidate management
  uploadCandidates: candidateController.uploadCandidates,
  updateCandidateStatus: candidateController.updateCandidateStatus,
  validateInterviewCode: candidateController.validateInterviewCode,
  
  // Question management
  startInterview: questionController.startInterview,
  getInterviewSession: questionController.getInterviewSession,
  generateQuestions: questionController.generateQuestions,
  getNextQuestion: questionController.getNextQuestion,
  
  // Results and analysis
  processAnswer: resultController.processAnswer,
  getInterviewResults: resultController.getInterviewResults,
  getMockInterviewResults: resultController.getMockInterviewResults,
  submitInterviewResults: resultController.submitInterviewResults,
  submitAllAnswers: resultController.submitAllAnswers,
  analyzeFace: resultController.analyzeFace,
  reportActivity: resultController.reportActivity,
  generatePdfReport: resultController.generatePdfReport,
  
  // Test endpoint for authentication
  testAuth: (req, res) => {
    res.json({
      success: true,
      user: req.user,
      message: 'Authentication working correctly'
    });
  },

  endInterview: async (req, res) => {
    const interviewId = req.params.interviewId || req.body.interviewId;
    const candidateCode = req.params.candidateCode || req.body.candidateCode;
    if (!interviewId || !candidateCode) {
      return res.status(400).json({ success: false, error: 'Missing interviewId or candidateCode' });
    }
    try {
      const session = await InterviewSession.findOne({interviewCode:candidateCode});
      if (!completedSession(session)) return res.status(409).json({success:false,error:'Interview evaluation is not complete.'});
      const finalEvaluation = session.finalEvaluation;
      const answers = session.answers;
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({ success: false, error: 'Interview not found' });
      }
      const candidate = interview.candidates.find(c => c.code === candidateCode);
      if (!candidate) {
        return res.status(404).json({ success: false, error: 'Candidate not found' });
      }
      
      // Update candidate status and store results
      candidate.status = 'completed';
      candidate.completedAt = new Date();
      
      // Store evaluation results if provided
      if (finalEvaluation) {
        
        // Process answers to extract question text from question objects
        const processedAnswers = (answers || []).map(serializeAnswer);
        candidate.results = {
          ...require('../services/fallbackEvaluation').reportTotals(answers),
          technicalKnowledge: finalEvaluation.skillAssessment?.technicalKnowledge ?? null,
          codingAbility: finalEvaluation.skillAssessment?.codingAbility ?? null,
          communicationSkills: finalEvaluation.skillAssessment?.communicationSkills ?? null,
          problemSolving: finalEvaluation.skillAssessment?.problemSolving ?? null,
          technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge ?? finalEvaluation.technicalScore ?? null,
          communicationScore: finalEvaluation.skillAssessment?.communicationSkills ?? finalEvaluation.communicationScore ?? null,
          problemSolvingScore: finalEvaluation.skillAssessment?.problemSolving ?? finalEvaluation.problemSolvingScore ?? null,
          confidenceScore: finalEvaluation.confidenceScore ?? null,
          overallScore: finalEvaluation.overallScore ?? null,
          strengths: finalEvaluation.strengths || [],
          weaknesses: finalEvaluation.weaknesses || [],
          feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
          answers: processedAnswers
        };
      }
      await interview.save();
      return res.json({success:true});
    } catch (error) {
      console.error('Error ending interview:',error);
      return res.status(500).json({success:false,error:'Server error'});
    }
  }
};
