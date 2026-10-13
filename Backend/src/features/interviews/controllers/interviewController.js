// Import separated controllers
const createInterviewController = require('./createInterviewController');
const candidateController = require('./candidateController');
const questionController = require('./questionController');
const resultController = require('./resultController');
const Interview = require('../models/Interview');

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
    console.log('=== END INTERVIEW CALLED ===');
    console.log('Request body:', req.body);
    const { interviewId, candidateCode, finalEvaluation, answers } = req.body;
    if (!interviewId || !candidateCode) {
      console.log('Missing interviewId or candidateCode:', { interviewId, candidateCode });
      return res.status(400).json({ success: false, error: 'Missing interviewId or candidateCode' });
    }
    try {
      console.log('Looking for interview:', interviewId);
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        console.log('Interview not found:', interviewId);
        return res.status(404).json({ success: false, error: 'Interview not found' });
      }
      console.log('Interview found, looking for candidate:', candidateCode);
      const candidate = interview.candidates.find(c => c.code === candidateCode);
      if (!candidate) {
        console.log('Candidate not found:', candidateCode);
        console.log('Available candidates:', interview.candidates.map(c => ({ code: c.code, status: c.status })));
        return res.status(404).json({ success: false, error: 'Candidate not found' });
      }
      
      console.log('Candidate found, current status:', candidate.status);
      console.log('Updating status to completed...');
      
      // Update candidate status and store results
      candidate.status = 'completed';
      candidate.completedAt = new Date();
      
      // Store evaluation results if provided
      if (finalEvaluation) {
        console.log('Storing final evaluation results:', finalEvaluation);
        
        // Process answers to extract question text from question objects
        const processedAnswers = answers ? answers.map(answer => ({
          question: typeof answer.question === 'object' ? answer.question.question : answer.question,
          answer: answer.answer || '',
          score: answer.evaluation?.score || 0,
          feedback: answer.evaluation?.feedback || ''
        })) : [];
        
        candidate.results = {
          technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge || finalEvaluation.technicalScore || 0,
          communicationScore: finalEvaluation.skillAssessment?.communicationSkills || finalEvaluation.communicationScore || 0,
          problemSolvingScore: finalEvaluation.skillAssessment?.problemSolving || finalEvaluation.problemSolvingScore || 0,
          confidenceScore: finalEvaluation.confidenceScore || 0,
          overallScore: finalEvaluation.overallScore || 0,
          strengths: finalEvaluation.strengths || [],
          weaknesses: finalEvaluation.weaknesses || [],
          feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
          answers: processedAnswers
        };
        console.log('Stored candidate results:', candidate.results);
      }
      
      console.log('Saving interview...');
      await interview.save();
      console.log('Interview saved successfully');
      console.log('Final candidate status:', candidate.status);
      return res.json({ success: true });
    } catch (err) {
      console.error('Error ending interview:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}; 