const Interview = require('../models/Interview');
const Candidate = require('../../candidates/models/Candidate');
const geminiService = require('../services/geminiService');
const faceAnalysisService = require('../services/faceAnalysisService');
const questionController = require('./questionController');
const activeInterviews = require('./questionController').activeInterviews;

// Process answer and analyze
const processAnswer = async (req, res) => {
  try {
    const { interviewCode, answer, question, skipped = false, videoData } = req.body;
    
    console.log('--- Incoming answer submission ---');
    console.log('interviewCode:', interviewCode);
    if (videoData) console.log('videoData present');
    
    // Get interview session from activeInterviews
    let interview = activeInterviews.get(interviewCode);
    if (!interview) {
      // Fallback: create a new session if not found (should not happen in normal flow)
      interview = {
        answers: [],
        skills: ['JavaScript', 'Python', 'React'],
        totalQuestions: 5,
        currentScore: 0,
        questions: [],
        status: 'active',
      };
      activeInterviews.set(interviewCode, interview);
    }
    
    // Use answers.length to track all answers, but we need to track main questions answered.
    // A main question is one that does not have isFollowUp true.
    const mainQuestionsAnswered = interview.answers.filter(a => !a.isFollowUp).length;
    const isCurrentFollowUp = question && question.isFollowUp;
    
    // The current main index is either the count of main questions answered (if this was a main question)
    // or the same (if this was a follow-up answer). But wait, we just received an answer.
    // We can infer if this answer is for a follow-up by looking at `question.isFollowUp`.
    
    const currentQuestionText = question ? question.question : `Question ${mainQuestionsAnswered + 1}`;
    const transcript = answer || '';
    const code = interviewCode;
    
    // Analyze face if video data provided
    let facialAnalysis = null;
    let confidenceScore = 0;
    
    if (videoData) {
      try {
        facialAnalysis = await faceAnalysisService.analyzeFrame(videoData);
        confidenceScore = facialAnalysis.confidenceScore;
        
        if (facialAnalysis.warning) {
          console.log('Facial analysis warning:', facialAnalysis.warning);
        }
      } catch (error) {
        console.error('Error analyzing face:', error);
        // Continue without facial analysis
      }
    }

    // Analyze answer using Gemini
    let analysis;
    try {
      analysis = skipped ? 
        { 
          score: 0, 
          feedback: "Question skipped",
          technicalAccuracy: 0,
          completeness: 0,
          clarity: 0
        } :
        await geminiService.analyzeAnswer(transcript, currentQuestionText, code);
      console.log('Gemini evaluation result:', analysis);
    } catch (analysisError) {
      console.error('Error analyzing answer:', analysisError);
      analysis = { evaluationFailed: true, score: null };
    }

    // Store answer and analysis with confidence score
    const storedAnswer = {
      question: currentQuestionText,
      answer: transcript,
      code: code,
      analysis: analysis,
      confidenceScore: confidenceScore,
      facialAnalysis: facialAnalysis,
      isFollowUp: !!isCurrentFollowUp,
      questionId: question?.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    interview.answers.push(storedAnswer);
    console.log('Answer stored in interview.answers:', storedAnswer);

    // Calculate running average (excluding null scores)
    let totalScore = 0;
    let validScores = 0;
    for (const ans of interview.answers) {
      if (ans.analysis && ans.analysis.score !== null && ans.analysis.score !== undefined) {
        const technicalScore = ans.analysis.score;
        const confScore = ans.confidenceScore || 0;
        totalScore += (technicalScore * 0.7 + confScore * 0.3);
        validScores++;
      }
    }
    interview.currentScore = validScores > 0 ? totalScore / validScores : 0;

    const newMainQuestionsAnswered = interview.answers.filter(a => !a.isFollowUp).length;

    // Check if we should generate a follow-up question based on answer quality
    let isFollowUp = false;
    let nextQuestion = null;
    
    // Only generate follow-up if answer quality is poor (score < 8), we haven't reached total questions,
    // this wasn't a skipped question, evaluation didn't fail, and the current question is not already a follow-up.
    const canFollowUp = !isCurrentFollowUp && !skipped && !analysis.evaluationFailed && analysis.score < 8 && newMainQuestionsAnswered < interview.totalQuestions;

    if (canFollowUp) {
      try {
        const followUpQuestion = await geminiService.generateFollowUpQuestion(
          question || { question: currentQuestionText, topic: interview.skills[newMainQuestionsAnswered - 1], id: storedAnswer.questionId },
          transcript,
          analysis
        );
        
        if (followUpQuestion) {
          nextQuestion = {
            ...followUpQuestion,
            id: Math.random().toString(36).substr(2, 9),
            skill: followUpQuestion.topic,
            questionNumber: newMainQuestionsAnswered, // Same main question number
            isFollowUp: true
          };
          interview.questions.push(nextQuestion);
          isFollowUp = true;
          console.log('Generated follow-up question:', nextQuestion);
        }
      } catch (error) {
        console.error('Error generating follow-up question:', error);
      }
    }
    
    // If no follow-up was generated, check if we've reached total main questions
    if (!isFollowUp) {
      if (newMainQuestionsAnswered >= interview.totalQuestions) {
        interview.status = 'completed';
        const finalEvaluation = await geminiService.generateFinalEvaluation(interview.answers);
        
        // Store mock interview results in database for company viewing
        if (interviewCode.startsWith('mock-')) {
          await storeMockInterviewResults(interviewCode, interview, finalEvaluation);
        } else {
          try {
            // Find the interview containing this candidate code
            const dbInterview = await Interview.findOne({ 'candidates.code': interviewCode });
            if (dbInterview) {
              const candidate = dbInterview.candidates.find(c => c.code === interviewCode);
              if (candidate) {
                candidate.status = 'completed';
                candidate.completedAt = new Date();
                candidate.results = {
                  technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge || finalEvaluation.technicalScore || 0,
                  communicationScore: finalEvaluation.skillAssessment?.communicationSkills || finalEvaluation.communicationScore || 0,
                  problemSolvingScore: finalEvaluation.skillAssessment?.problemSolving || finalEvaluation.problemSolvingScore || 0,
                  confidenceScore: interview.currentScore || 0,
                  overallScore: finalEvaluation.overallScore || 0,
                  strengths: finalEvaluation.strengths || [],
                  weaknesses: finalEvaluation.weaknesses || [],
                  feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
                  answers: interview.answers.map(ans => ({
                    question: ans.question,
                    answer: ans.answer,
                    score: ans.analysis?.score || 0,
                    feedback: ans.analysis?.feedback || ''
                  }))
                };
                await dbInterview.save();
                console.log('Regular interview results stored in database for candidate code:', interviewCode);
              }
            } else {
              console.log('No interview found for candidate code:', interviewCode);
            }
          } catch (err) {
            console.error('Error storing regular interview results:', err);
          }
        }
        
        return res.json({
          success: true,
          evaluation: finalEvaluation,
          lastAnswerEvaluation: {
            ...analysis,
            confidenceScore: confidenceScore,
            facialAnalysis: facialAnalysis
          },
          isComplete: true,
          finalScore: interview.currentScore
        });
      }
    }

    // Generate next main question if no follow-up was generated
    if (!nextQuestion) {
      const nextSkillIndex = Math.min(newMainQuestionsAnswered, interview.skills.length - 1);
      const nextSkill = interview.skills[nextSkillIndex];
      const previousQuestions = interview.questions || [];
      
      const focuses = ['fundamentals', 'practical application', 'coding', 'debugging', 'trade-offs'];
      const focusArea = focuses[newMainQuestionsAnswered % focuses.length];

      try {
        nextQuestion = await geminiService.generateQuestion(nextSkill, previousQuestions, newMainQuestionsAnswered, focusArea);
        nextQuestion = {
          ...nextQuestion,
          id: Math.random().toString(36).substr(2, 9),
          skill: nextSkill,
          questionNumber: newMainQuestionsAnswered + 1,
          isFollowUp: false
        };
        interview.questions.push(nextQuestion);
      } catch (error) {
        console.error('Error generating next question:', error);
        nextQuestion = geminiService.getFallbackQuestion(nextSkill, previousQuestions, focusArea);
        nextQuestion.id = Math.random().toString(36).substr(2, 9);
        nextQuestion.questionNumber = newMainQuestionsAnswered + 1;
        nextQuestion.isFollowUp = false;
        interview.questions.push(nextQuestion);
      }
    }

    res.json({
      success: true,
      evaluation: {
        ...analysis,
        confidenceScore: confidenceScore,
        facialAnalysis: facialAnalysis
      },
      nextQuestion,
      isFollowUp,
      progress: {
        current: newMainQuestionsAnswered + (isFollowUp ? 0 : 1),
        total: interview.totalQuestions
      }
    });
    console.log('--- Answer processing complete ---');

  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing answer',
      details: error.message 
    });
  }
};

const getDefaultAnalysis = () => ({
  score: 5,
  feedback: "Error analyzing answer. Please try again.",
  technicalAccuracy: 5,
  completeness: 5,
  clarity: 5
});

const getFallbackQuestion = (skill) => ({
  question: `Tell me about your experience with ${skill}`,
  topic: skill,
  difficulty: "medium",
  expectedDuration: "2-3 minutes",
  category: "experience",
  expectedKeyPoints: ["Technical knowledge", "Practical experience", "Challenges faced"]
});

// Store mock interview results in database
const storeMockInterviewResults = async (mockCode, interview, finalEvaluation) => {
  try {
    // Create a mock interview entry in the database
    const mockInterview = new Interview({
      company: null, // Mock interviews don't belong to a company
      title: `Mock Interview - ${mockCode}`,
      description: 'Mock interview session',
      skills: interview.skills,
      duration: 30, // Default duration
      status: 'completed',
      interviewCode: mockCode,
      candidates: [{
        candidate: null, // No specific candidate for mock interviews
        code: mockCode,
        status: 'completed',
        results: {
          technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge || 0,
          communicationScore: finalEvaluation.skillAssessment?.communicationSkills || 0,
          problemSolvingScore: finalEvaluation.skillAssessment?.codingAbility || 0,
          confidenceScore: interview.answers.reduce((sum, ans) => sum + (ans.confidenceScore || 0), 0) / interview.answers.length,
          overallScore: finalEvaluation.overallScore || 0,
          strengths: finalEvaluation.strengths || [],
          weaknesses: finalEvaluation.weaknesses || [],
          feedback: finalEvaluation.feedback || '',
          answers: interview.answers.map(ans => ({
            question: ans.question,
            answer: ans.answer,
            score: ans.analysis?.score || 0,
            feedback: ans.analysis?.feedback || ''
          }))
        },
        startedAt: interview.startTime,
        completedAt: new Date()
      }]
    });
    
    await mockInterview.save();
    console.log('Mock interview results stored in database:', mockCode);
  } catch (error) {
    console.error('Error storing mock interview results:', error);
  }
};

// End interview and generate final evaluation
const endInterview = async (req, res) => {
  try {
    const { interviewId, candidateCode } = req.params;
    const { answers, finalEvaluation } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid answers format',
        details: 'Answers must be provided as an array'
      });
    }

    // Generate final evaluation if not provided
    let evaluation = finalEvaluation;
    if (!evaluation) {
      evaluation = await geminiService.generateFinalEvaluation(answers);
    }

    // Calculate average confidence score
    const avgConfidenceScore = answers.length
      ? answers.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / answers.length
      : 0;

    // Save scores to Interview.candidates and Candidate.interviews
    if (interviewId && candidateCode) {
      const interview = await Interview.findById(interviewId);
      if (interview) {
        const candidateEntry = interview.candidates.find(c => c.code === candidateCode);
        if (candidateEntry) {
          candidateEntry.status = 'completed';
          candidateEntry.scores = {
            total: evaluation.overallScore ?? null,
            technical: evaluation.skillAssessment?.technicalKnowledge ?? null,
            coding: evaluation.skillAssessment?.codingAbility ?? null,
            communication: evaluation.skillAssessment?.communicationSkills ?? null,
            confidence: avgConfidenceScore ?? null
          };
          await interview.save();
        }
        // Also update Candidate.interviews
        if (candidateEntry.candidateId) {
          const candidate = await Candidate.findById(candidateEntry.candidateId);
          if (candidate) {
            const interviewEntry = candidate.interviews.find(i => i.interviewId.toString() === interviewId);
            if (interviewEntry) {
              interviewEntry.status = 'completed';
              interviewEntry.scores = candidateEntry.scores;
              await candidate.save();
            }
          }
        }
      }
    }

    res.json({
      success: true,
      evaluation,
      avgConfidenceScore
    });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate final evaluation',
      details: error.message 
    });
  }
};

// Get interview results
const getInterviewResults = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidates.candidate', 'name email');
    
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    // Filter out pending candidates
    const results = interview.candidates.filter(c => c.status !== 'pending');

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get mock interview results
const getMockInterviewResults = async (req, res) => {
  try {
    // Find all interviews that start with 'mock-'
    const mockInterviews = await Interview.find({ 
      interviewCode: { $regex: '^mock-' } 
    }).sort({ createdAt: -1 });

    // Extract candidate results from mock interviews
    const mockResults = mockInterviews.flatMap(interview => 
      interview.candidates.map(candidate => ({
        id: candidate._id,
        name: `Mock Candidate - ${interview.interviewCode}`,
        email: `mock-${interview.interviewCode}@example.com`,
        status: candidate.status,
        completedAt: candidate.completedAt,
        duration: 30, // Default duration for mock interviews
        results: {
          technicalScore: candidate.results?.technicalScore || 0,
          communicationScore: candidate.results?.communicationScore || 0,
          problemSolvingScore: candidate.results?.problemSolvingScore || 0,
          overallScore: candidate.results?.overallScore || 0,
          strengths: candidate.results?.strengths || [],
          weaknesses: candidate.results?.weaknesses || [],
          feedback: candidate.results?.feedback || ''
        },
        interviewCode: interview.interviewCode,
        skills: interview.skills
      }))
    );

    res.json({ success: true, results: mockResults });
  } catch (error) {
    console.error('Error fetching mock interview results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Submit interview results
const submitInterviewResults = async (req, res) => {
  try {
    const { interviewId, candidateId } = req.user;
    const results = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    const candidate = interview.candidates.find(c => c.candidate.toString() === candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Calculate overall score
    const overallScore = interview.calculateOverallScore(
      results.technicalScore,
      results.communicationScore,
      results.problemSolvingScore,
      results.confidenceScore
    );

    // Update candidate results
    candidate.results = {
      ...results,
      overallScore
    };
    candidate.status = 'completed';
    candidate.completedAt = new Date();
    
    await interview.save();

    res.json({ success: true, message: 'Interview results submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Submit all answers at once
const submitAllAnswers = async (req, res) => {
  try {
    const { interviewCode, answers } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid answers format'
      });
    }

    // Process all answers
    const processedAnswers = [];
    for (const answer of answers) {
      try {
        const analysis = await geminiService.analyzeAnswer(
          answer.answer, 
          answer.question
        );
        processedAnswers.push({
          ...answer,
          analysis
        });
      } catch (error) {
        console.error('Error processing answer:', error);
        processedAnswers.push({
          ...answer,
          analysis: getDefaultAnalysis()
        });
      }
    }

    // Generate final evaluation
    const finalEvaluation = await geminiService.generateFinalEvaluation(processedAnswers);

    res.json({
      success: true,
      answers: processedAnswers,
      finalEvaluation
    });
  } catch (error) {
    console.error('Error submitting all answers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process answers',
      details: error.message
    });
  }
};

// Analyze face
const analyzeFace = async (req, res) => {
  try {
    const { faceBox, frameSize } = req.body;
    
    if (!faceBox || !frameSize) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing face detection data' 
      });
    }

    const analysis = await faceAnalysisService.analyzeFrame({ faceBox, frameSize });
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Face analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error analyzing face data',
      details: error.message
    });
  }
};

// Report suspicious activity during interview
const reportActivity = async (req, res) => {
  try {
    const { interviewCode, reportData } = req.body;
    
    console.log('=== SUSPICIOUS ACTIVITY REPORT ===');
    console.log('Interview Code:', interviewCode);
    console.log('Report Data:', reportData);
    
    // Get interview session
    const interview = activeInterviews.get(interviewCode);
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }
    
    // Store suspicious activity in interview session
    if (!interview.suspiciousActivities) {
      interview.suspiciousActivities = [];
    }
    
    interview.suspiciousActivities.push({
      ...reportData,
      timestamp: Date.now()
    });
    
    // Calculate activity risk level
    const activityCount = interview.suspiciousActivities.length;
    const tabSwitchCount = reportData.tabSwitchCount || 0;
    
    let riskLevel = 'low';
    if (activityCount > 5 || tabSwitchCount > 3) {
      riskLevel = 'high';
    } else if (activityCount > 2 || tabSwitchCount > 1) {
      riskLevel = 'medium';
    }
    
    // Update interview with risk assessment
    interview.activityRiskLevel = riskLevel;
    interview.lastActivityReport = Date.now();
    
    console.log('Activity risk level:', riskLevel);
    console.log('Total suspicious activities:', activityCount);
    
    // Store in database for company review
    if (interviewCode && !interviewCode.startsWith('mock-')) {
      try {
        const dbInterview = await Interview.findOne({ interviewCode });
        if (dbInterview) {
          const candidate = dbInterview.candidates.find(c => c.code === interviewCode);
          if (candidate) {
            if (!candidate.activityReports) {
              candidate.activityReports = [];
            }
            candidate.activityReports.push({
              riskLevel,
              suspiciousActivities: interview.suspiciousActivities,
              tabSwitchCount,
              timestamp: Date.now()
            });
            await dbInterview.save();
          }
        }
      } catch (dbError) {
        console.error('Error saving activity report to database:', dbError);
      }
    }
    
    res.json({
      success: true,
      riskLevel,
      message: 'Activity report recorded successfully'
    });
    
  } catch (error) {
    console.error('Error reporting activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report activity',
      details: error.message
    });
  }
};

const PDFDocument = require('pdfkit');

const generatePdfReport = async (req, res) => {
  try {
    const { interviewId, candidateId } = req.params;
    let interview, candidate, candidateName, candidateEmail;

    if (interviewId.startsWith('mock-')) {
       interview = await Interview.findOne({ interviewCode: interviewId });
       if (interview) {
         candidate = interview.candidates.find(c => c.code === interviewId);
         candidateName = `Mock Candidate - ${interviewId}`;
         candidateEmail = `mock-${interviewId}@example.com`;
       }
    } else {
       // Search by candidate code/id within interview
       interview = await Interview.findById(interviewId).populate('candidates.candidate', 'name email');
       if (interview) {
         candidate = interview.candidates.find(c => c._id.toString() === candidateId || c.code === candidateId || (c.candidate && c.candidate._id.toString() === candidateId));
         candidateName = candidate?.candidate?.name || candidate?.name || candidate?.candidateName || 'Unknown';
         candidateEmail = candidate?.candidate?.email || candidate?.email || candidate?.candidateEmail || 'Unknown';
       }
    }

    if (!interview || !candidate) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Report-${candidateName.replace(/\\s+/g, '-')}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Candidate Interview Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Candidate Name: ${candidateName}`);
    doc.text(`Email: ${candidateEmail}`);
    doc.text(`Interview: ${interview.title || interview.interviewName || 'Untitled'}`);
    doc.text(`Date: ${new Date(candidate.completedAt || candidate.startedAt || Date.now()).toLocaleDateString()}`);
    doc.moveDown();

    if (candidate.results) {
      doc.fontSize(16).text('Scores', { underline: true });
      doc.fontSize(12).text(`Technical: ${Math.round((candidate.results.technicalScore || 0)*10)/10}/10`);
      doc.text(`Communication: ${Math.round((candidate.results.communicationScore || 0)*10)/10}/10`);
      doc.text(`Problem Solving: ${Math.round((candidate.results.problemSolvingScore || 0)*10)/10}/10`);
      doc.text(`Overall: ${Math.round((candidate.results.overallScore || 0)*10)/10}/10`);
      doc.moveDown();

      if (candidate.results.feedback) {
        doc.fontSize(16).text('Feedback', { underline: true });
        doc.fontSize(12).text(candidate.results.feedback);
        doc.moveDown();
      }

      if (candidate.results.strengths && candidate.results.strengths.length > 0) {
        doc.fontSize(16).text('Strengths', { underline: true });
        candidate.results.strengths.forEach(s => doc.fontSize(12).text(`• ${s}`));
        doc.moveDown();
      }

      if (candidate.results.weaknesses && candidate.results.weaknesses.length > 0) {
        doc.fontSize(16).text('Areas for Improvement', { underline: true });
        candidate.results.weaknesses.forEach(w => doc.fontSize(12).text(`• ${w}`));
        doc.moveDown();
      }
    } else {
      doc.fontSize(12).text('No detailed results available for this candidate.');
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to generate PDF' });
    }
  }
};

module.exports = {
  processAnswer,
  endInterview,
  getInterviewResults,
  getMockInterviewResults,
  submitInterviewResults,
  submitAllAnswers,
  analyzeFace,
  reportActivity,
  generatePdfReport
}; 