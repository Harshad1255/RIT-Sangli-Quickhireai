// Import separated controllers
const createInterviewController = require('./createInterviewController');
const candidateController = require('./candidateController');
const questionController = require('./questionController');
const resultController = require('./resultController');
const Interview = require('../models/Interview');
const mongoose = require('mongoose');
const geminiService = require('../services/geminiService');

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
    const interviewId = req.body.interviewId || req.params.interviewId;
    const candidateCode = req.body.candidateCode || req.params.candidateCode;
    const { finalEvaluation, answers } = req.body;

    if (!interviewId && !candidateCode) {
      console.log('Missing both interviewId and candidateCode');
      return res.status(400).json({ success: false, error: 'Missing interviewId or candidateCode' });
    }

    try {
      console.log('Looking for interview with ID or Code:', interviewId, 'Candidate:', candidateCode);
      let interview = null;

      if (interviewId && mongoose.Types.ObjectId.isValid(interviewId)) {
        interview = await Interview.findById(interviewId);
      }
      if (!interview && interviewId) {
        interview = await Interview.findOne({ interviewCode: interviewId });
      }
      if (!interview && candidateCode) {
        interview = await Interview.findOne({ 'candidates.code': candidateCode });
      }

      if (!interview) {
        console.log('Interview not found for:', { interviewId, candidateCode });
        return res.status(404).json({ success: false, error: 'Interview not found' });
      }

      console.log('Interview found:', interview.interviewCode || interview._id);
      const candidate = interview.candidates.find(c => c.code === candidateCode || (candidateCode && c._id.toString() === candidateCode)) || interview.candidates[0];
      if (!candidate) {
        console.log('Candidate not found:', candidateCode);
        return res.status(404).json({ success: false, error: 'Candidate not found' });
      }
      
      console.log('Candidate found, current status:', candidate.status);
      candidate.status = 'completed';
      candidate.completedAt = candidate.completedAt || new Date();
      
      // Process answers if provided
      const processedAnswers = Array.isArray(answers) && answers.length > 0 ? answers.map(answer => {
        const evalObj = answer.evaluation || answer.analysis || {};
        const qScore = typeof evalObj.score === 'number' ? evalObj.score : (evalObj.awardedMarks || 0);
        return {
          question: typeof answer.question === 'object' ? (answer.question.question || answer.question.text || '') : String(answer.question || ''),
          answer: answer.answer || '',
          code: answer.code || '',
          score: qScore,
          maxMarks: evalObj.maxMarks || 10,
          relevanceScore: typeof evalObj.relevanceScore === 'number' ? evalObj.relevanceScore : qScore,
          technicalKnowledge: typeof evalObj.technicalKnowledge === 'number' ? evalObj.technicalKnowledge : (evalObj.technicalAccuracy || qScore),
          codingAbility: typeof evalObj.codingAbility === 'number' ? evalObj.codingAbility : qScore,
          communicationSkills: typeof evalObj.communicationSkills === 'number' ? evalObj.communicationSkills : (evalObj.communication || qScore),
          problemSolving: typeof evalObj.problemSolving === 'number' ? evalObj.problemSolving : qScore,
          feedback: evalObj.feedback || '',
          strengths: Array.isArray(evalObj.strengths) ? evalObj.strengths : [],
          improvements: Array.isArray(evalObj.improvements) ? evalObj.improvements : [],
          attempted: evalObj.attempted !== false,
          evaluationSource: evalObj.evaluationSource || finalEvaluation?.evaluationSource || 'ai'
        };
      }) : (candidate.results?.answers || []);

      // If finalEvaluation is missing, generate one
      let evaluation = finalEvaluation;
      if (!evaluation && processedAnswers.length > 0) {
        evaluation = await geminiService.generateFinalEvaluation(processedAnswers);
      }

      if (evaluation) {
        const totalMarks = processedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
        const maxPossibleMarks = processedAnswers.length * 10;
        const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 1000) / 10 : 0;

        // Idempotency: Don't overwrite existing higher score with 0
        const existingScore = candidate.results?.overallScore || 0;
        const newOverall = evaluation.overallScore ?? evaluation.score ?? 0;
        const finalOverall = (newOverall === 0 && existingScore > 0) ? existingScore : newOverall;

        candidate.results = {
          technicalScore: evaluation.skillAssessment?.technicalKnowledge || evaluation.technicalScore || (candidate.results?.technicalScore || 0),
          communicationScore: evaluation.skillAssessment?.communicationSkills || evaluation.communicationScore || (candidate.results?.communicationScore || 0),
          problemSolvingScore: evaluation.skillAssessment?.problemSolving || evaluation.problemSolvingScore || (candidate.results?.problemSolvingScore || 0),
          confidenceScore: evaluation.confidenceScore || (candidate.results?.confidenceScore || 0),
          overallScore: finalOverall,
          totalMarks: totalMarks || (candidate.results?.totalMarks || 0),
          maxPossibleMarks: maxPossibleMarks || (candidate.results?.maxPossibleMarks || 0),
          percentage: percentage || (candidate.results?.percentage || (finalOverall * 10)),
          evaluationSource: evaluation.evaluationSource || candidate.results?.evaluationSource || 'ai',
          strengths: evaluation.strengths || candidate.results?.strengths || [],
          weaknesses: evaluation.weaknesses || candidate.results?.weaknesses || [],
          feedback: evaluation.overallFeedback || evaluation.feedback || candidate.results?.feedback || '',
          answers: processedAnswers
        };
        console.log('Stored candidate results:', candidate.results);
      }
      
      console.log('Saving interview...');
      await interview.save();
      console.log('Interview saved successfully. Final candidate status:', candidate.status);
      return res.json({ success: true, results: candidate.results });
    } catch (err) {
      console.error('Error ending interview:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}; 