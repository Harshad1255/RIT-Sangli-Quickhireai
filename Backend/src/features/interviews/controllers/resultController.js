const Interview = require('../models/Interview');
const Candidate = require('../../candidates/models/Candidate');
const InterviewSession = require('../models/InterviewSession');
const geminiService = require('../services/geminiService');
const evaluationEngine = require('../services/evaluationEngine');
const faceAnalysisService = require('../services/faceAnalysisService');
const questionController = require('./questionController');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

// Process answer and analyze
const processAnswer = async (req, res) => {
  try {
    const { interviewCode, answer, question, skipped = false, videoData, code: bodyCode } = req.body;
    
    console.log('--- Incoming answer submission ---');
    console.log('interviewCode:', interviewCode);
    if (videoData) console.log('videoData present');
    
    // Get interview session from DB
    let interview = await InterviewSession.findOne({ interviewCode });
    if (!interview) {
      const explicitBranch = req.body.branch;
      const qText = typeof question === 'object' ? (question?.question || question?.text || '') : String(question || '');
      const isCivil = (explicitBranch && explicitBranch.toLowerCase().includes('civil')) || 
                      /beam|column|truss|frame|soil|foundation|retaining|earthquake|road|railway|traffic|airport|survey|level|theodolite|concrete|civil/i.test(qText);
      const isMech = (explicitBranch && explicitBranch.toLowerCase().includes('mech')) ||
                     /thermo|entropy|fluid|pump|turbine|hydraulic|gear|bearing|shaft|welding|casting|mechanical/i.test(qText);
      const isElec = (explicitBranch && explicitBranch.toLowerCase().includes('elec')) ||
                     /power system|transformer|induction motor|dc machine|electrical/i.test(qText);
      const isEntc = (explicitBranch && explicitBranch.toLowerCase().includes('entc')) ||
                     /analog circuit|op-amp|modulation|antenna|8085|microprocessor|logic gate|entc/i.test(qText);

      const branch = isCivil ? 'Civil' : (isMech ? 'Mechanical' : (isElec ? 'Electrical' : (isEntc ? 'ENTC' : 'CS/IT')));
      const defaultSkills = isCivil ? ['Structural Engineering', 'Soil Mechanics', 'Transportation', 'Surveying'] :
                            (isMech ? ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing'] :
                            (isElec ? ['Power Systems', 'Control Systems', 'Electrical Machines', 'Measurements'] :
                            (isEntc ? ['Digital Electronics', 'Analog Circuits', 'Communication Systems', 'Microprocessors'] :
                            ['JavaScript', 'Python', 'React'])));

      interview = new InterviewSession({
        interviewCode,
        answers: [],
        skills: defaultSkills,
        branch,
        totalQuestions: 5,
        currentScore: 0,
        questions: [],
        status: 'active',
      });
    }
    
    // Track main questions answered (questions that are not follow-ups)
    const mainQuestionsAnswered = interview.answers.filter(a => !a.isFollowUp).length;
    const isCurrentFollowUp = question && question.isFollowUp;
    
    const currentQuestionText = typeof question === 'object' && question !== null 
      ? (question.question || question.text || `Question ${mainQuestionsAnswered + 1}`) 
      : (question || `Question ${mainQuestionsAnswered + 1}`);

    const transcript = (typeof answer === 'string' ? answer : '').trim();
    const codeSnippet = typeof bodyCode === 'string' ? bodyCode.trim() : (typeof req.body.code === 'string' ? req.body.code.trim() : '');
    const combinedContent = transcript || codeSnippet;
    const questionId = question?.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Analyze face if video data provided
    let facialAnalysis = null;
    let confidenceScore = 0;
    
    if (videoData) {
      try {
        facialAnalysis = await faceAnalysisService.analyzeFrame(videoData);
        confidenceScore = facialAnalysis.confidenceScore || 0;
        if (facialAnalysis.warning) {
          console.log('Facial analysis warning:', facialAnalysis.warning);
        }
      } catch (error) {
        console.error('Error analyzing face:', error);
      }
    }

    // Evaluate answer with Gemini or deterministic fallback
    let analysis;
    try {
      if (skipped) {
        analysis = { 
          questionId,
          maxMarks: 10,
          awardedMarks: 0,
          score: 0,
          attempted: false,
          feedback: "Question skipped",
          technicalKnowledge: 0,
          codingAbility: 0,
          communicationSkills: 0,
          problemSolving: 0,
          relevanceScore: 0,
          strengths: [],
          improvements: ["Attempt all questions in future interviews."],
          evaluationSource: 'rubric'
        };
      } else {
        analysis = await geminiService.analyzeAnswer(combinedContent, question || currentQuestionText, codeSnippet);
      }
      console.log('Evaluation result:', { score: analysis.score, source: analysis.evaluationSource });
    } catch (analysisError) {
      console.error("[INTERVIEW AI EVALUATION ERROR - USING DETERMINISTIC FALLBACK]", analysisError.message);
      analysis = evaluationEngine.evaluateAnswer(combinedContent, question || currentQuestionText, { code: codeSnippet });
    }

    // Ensure numeric scores
    analysis.score = typeof analysis.score === 'number' && !Number.isNaN(analysis.score) ? analysis.score : (analysis.awardedMarks || 0);

    // Store answer and analysis with confidence score
    const storedAnswer = {
      question: currentQuestionText,
      answer: transcript,
      code: codeSnippet,
      analysis: analysis,
      confidenceScore: confidenceScore,
      facialAnalysis: facialAnalysis,
      isFollowUp: !!isCurrentFollowUp,
      questionId: questionId
    };
    interview.answers.push(storedAnswer);
    console.log('Answer stored in interview.answers for question:', currentQuestionText.substring(0, 40));

    // Calculate running average
    let totalScore = 0;
    let validScores = 0;
    for (const ans of interview.answers) {
      const s = ans.analysis?.score ?? ans.analysis?.awardedMarks;
      if (typeof s === 'number' && !Number.isNaN(s)) {
        totalScore += s;
        validScores++;
      }
    }
    interview.currentScore = validScores > 0 ? Math.round((totalScore / validScores) * 10) / 10 : 0;

    const newMainQuestionsAnswered = interview.answers.filter(a => !a.isFollowUp).length;

    // Check if we should generate a follow-up question
    let isFollowUp = false;
    let nextQuestion = null;
    
    const canFollowUp = !isCurrentFollowUp && !skipped && analysis.score < 7.5 && newMainQuestionsAnswered < interview.totalQuestions;

    if (canFollowUp) {
      try {
        const followUpQuestion = await geminiService.generateFollowUpQuestion(
          question || { question: currentQuestionText, topic: interview.skills[newMainQuestionsAnswered - 1], id: storedAnswer.questionId },
          combinedContent,
          analysis
        );
        
        if (followUpQuestion) {
          nextQuestion = {
            ...followUpQuestion,
            id: Math.random().toString(36).substr(2, 9),
            skill: followUpQuestion.topic,
            questionNumber: newMainQuestionsAnswered,
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
    
    // Check if interview completed
    if (!isFollowUp && newMainQuestionsAnswered >= interview.totalQuestions) {
      interview.status = 'completed';
      const finalEvaluation = await geminiService.generateFinalEvaluation(interview.answers);
      
      const processedAnswers = interview.answers.map(ans => {
        const evalData = ans.analysis || {};
        const qScore = typeof evalData.score === 'number' ? evalData.score : (evalData.awardedMarks || 0);
        return {
          question: typeof ans.question === 'object' ? (ans.question.question || ans.question.text || '') : String(ans.question || ''),
          answer: ans.answer || '',
          code: ans.code || '',
          score: qScore,
          maxMarks: evalData.maxMarks || 10,
          relevanceScore: typeof evalData.relevanceScore === 'number' ? evalData.relevanceScore : qScore,
          technicalKnowledge: typeof evalData.technicalKnowledge === 'number' ? evalData.technicalKnowledge : (evalData.technicalAccuracy || qScore),
          codingAbility: typeof evalData.codingAbility === 'number' ? evalData.codingAbility : qScore,
          communicationSkills: typeof evalData.communicationSkills === 'number' ? evalData.communicationSkills : (evalData.communication || qScore),
          problemSolving: typeof evalData.problemSolving === 'number' ? evalData.problemSolving : qScore,
          feedback: evalData.feedback || 'Attempt recorded.',
          strengths: Array.isArray(evalData.strengths) ? evalData.strengths : [],
          improvements: Array.isArray(evalData.improvements) ? evalData.improvements : [],
          attempted: evalData.attempted !== false,
          evaluationSource: evalData.evaluationSource || finalEvaluation.evaluationSource || 'ai'
        };
      });

      const totalMarks = processedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      const maxPossibleMarks = processedAnswers.length * 10;
      const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 1000) / 10 : 0;

      // Store mock interview results in database for viewing
      if (interviewCode.startsWith('mock-')) {
        await storeMockInterviewResults(interviewCode, interview, finalEvaluation);
      } else {
        try {
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
                totalMarks,
                maxPossibleMarks,
                percentage,
                evaluationSource: finalEvaluation.evaluationSource || 'ai',
                strengths: finalEvaluation.strengths || [],
                weaknesses: finalEvaluation.weaknesses || [],
                feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
                answers: processedAnswers
              };
              await dbInterview.save();
              console.log('Regular interview results stored in database for candidate code:', interviewCode);
            }
          }
        } catch (err) {
          console.error('Error storing regular interview results:', err);
        }
      }
      
      await interview.save();
      
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

    // Generate next main question if no follow-up was generated
    if (!nextQuestion) {
      const nextSkillIndex = Math.min(newMainQuestionsAnswered, interview.skills.length - 1);
      const nextSkill = interview.skills[nextSkillIndex];
      const branch = interview.branch || req.body.branch;
      
      // Collect full history of asked questions from both questions array and answers array
      const previousQuestions = [
        ...(interview.questions || []).map(q => typeof q === 'string' ? q : (q?.question || q?.text || '')),
        ...(interview.answers || []).map(a => typeof a.question === 'object' ? (a.question?.question || a.question?.text || '') : String(a.question || ''))
      ].filter(Boolean);
      
      const isCSE = branch === 'CS/IT';
      const focuses = isCSE 
        ? ['fundamentals', 'practical application', 'coding', 'debugging', 'trade-offs']
        : ['fundamentals', 'practical application', 'design & calculation', 'troubleshooting & quality', 'standards & trade-offs'];
      const focusArea = focuses[newMainQuestionsAnswered % focuses.length];

      try {
        nextQuestion = await geminiService.generateQuestion(nextSkill, previousQuestions, newMainQuestionsAnswered, focusArea, branch);
        nextQuestion = {
          ...nextQuestion,
          id: Math.random().toString(36).substr(2, 9),
          skill: nextSkill,
          branch: branch,
          questionNumber: newMainQuestionsAnswered + 1,
          isFollowUp: false
        };
        interview.questions.push(nextQuestion);
      } catch (error) {
        console.error('Error generating next question, using fallback:', error.message);
        nextQuestion = geminiService.getFallbackQuestion(nextSkill, previousQuestions, focusArea, branch);
        nextQuestion.id = Math.random().toString(36).substr(2, 9);
        nextQuestion.questionNumber = newMainQuestionsAnswered + 1;
        nextQuestion.isFollowUp = false;
        interview.questions.push(nextQuestion);
      }
    }

    await interview.save();

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
  feedback: "Answer recorded with foundational knowledge.",
  technicalAccuracy: 5,
  completeness: 5,
  clarity: 5
});

// Store mock interview results in database
const storeMockInterviewResults = async (mockCode, interview, finalEvaluation) => {
  try {
    const processedAnswers = interview.answers.map(ans => {
      const evalData = ans.analysis || ans.evaluation || {};
      const qScore = typeof evalData.score === 'number' ? evalData.score : (evalData.awardedMarks || 0);
      return {
        question: typeof ans.question === 'object' ? (ans.question.question || ans.question.text || '') : String(ans.question || ''),
        answer: ans.answer || '',
        code: ans.code || '',
        score: qScore,
        maxMarks: evalData.maxMarks || 10,
        relevanceScore: typeof evalData.relevanceScore === 'number' ? evalData.relevanceScore : qScore,
        technicalKnowledge: typeof evalData.technicalKnowledge === 'number' ? evalData.technicalKnowledge : (evalData.technicalAccuracy || qScore),
        codingAbility: typeof evalData.codingAbility === 'number' ? evalData.codingAbility : qScore,
        communicationSkills: typeof evalData.communicationSkills === 'number' ? evalData.communicationSkills : (evalData.communication || qScore),
        problemSolving: typeof evalData.problemSolving === 'number' ? evalData.problemSolving : qScore,
        feedback: evalData.feedback || 'Relevant response.',
        strengths: Array.isArray(evalData.strengths) ? evalData.strengths : [],
        improvements: Array.isArray(evalData.improvements) ? evalData.improvements : [],
        attempted: evalData.attempted !== false,
        evaluationSource: evalData.evaluationSource || finalEvaluation.evaluationSource || 'ai'
      };
    });

    const totalMarks = processedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
    const maxPossibleMarks = processedAnswers.length * 10;
    const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 1000) / 10 : 0;

    let mockInterview = await Interview.findOne({ interviewCode: mockCode }) || 
                        await Interview.findOne({ 'candidates.code': mockCode });

    const candidateResults = {
      technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge || finalEvaluation.technicalScore || 0,
      communicationScore: finalEvaluation.skillAssessment?.communicationSkills || finalEvaluation.communicationScore || 0,
      problemSolvingScore: finalEvaluation.skillAssessment?.problemSolving || finalEvaluation.skillAssessment?.codingAbility || 0,
      confidenceScore: interview.currentScore || 0,
      overallScore: finalEvaluation.overallScore || 0,
      totalMarks,
      maxPossibleMarks,
      percentage,
      evaluationSource: finalEvaluation.evaluationSource || 'ai',
      strengths: finalEvaluation.strengths || [],
      weaknesses: finalEvaluation.weaknesses || [],
      feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
      answers: processedAnswers
    };

    if (mockInterview) {
      mockInterview.status = 'completed';
      let cand = mockInterview.candidates.find(c => c.code === mockCode) || mockInterview.candidates[0];
      if (cand) {
        cand.status = 'completed';
        cand.completedAt = new Date();
        cand.results = candidateResults;
      } else {
        mockInterview.candidates.push({
          candidate: null,
          code: mockCode,
          status: 'completed',
          results: candidateResults,
          completedAt: new Date()
        });
      }
      await mockInterview.save();
    } else {
      mockInterview = new Interview({
        company: null,
        title: `Mock Interview - ${mockCode}`,
        description: 'Mock interview session',
        skills: interview.skills,
        duration: 30,
        status: 'completed',
        interviewCode: mockCode,
        candidates: [{
          candidate: null,
          code: mockCode,
          status: 'completed',
          results: candidateResults,
          startedAt: interview.startTime,
          completedAt: new Date()
        }]
      });
      await mockInterview.save();
    }
    console.log('Mock interview results stored in database:', mockCode);
  } catch (error) {
    console.error('Error storing mock interview results:', error);
  }
};

// End interview and generate final evaluation
const endInterview = async (req, res) => {
  try {
    const interviewId = req.params.interviewId || req.body.interviewId;
    const candidateCode = req.params.candidateCode || req.body.candidateCode;
    const { answers, finalEvaluation } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid answers format',
        details: 'Answers must be provided as an array'
      });
    }

    let evaluation = finalEvaluation;
    if (!evaluation) {
      evaluation = await geminiService.generateFinalEvaluation(answers);
    }

    const avgConfidenceScore = answers.length
      ? answers.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / answers.length
      : 0;

    if (interviewId || candidateCode) {
      let interview = null;
      if (interviewId && mongoose.Types.ObjectId.isValid(interviewId)) {
        interview = await Interview.findById(interviewId);
      } else if (interviewId) {
        interview = await Interview.findOne({ interviewCode: interviewId });
      }
      if (!interview && candidateCode) {
        interview = await Interview.findOne({ 'candidates.code': candidateCode });
      }

      if (interview) {
        const candidateEntry = interview.candidates.find(c => c.code === candidateCode) || interview.candidates[0];
        if (candidateEntry) {
          candidateEntry.status = 'completed';
          candidateEntry.completedAt = candidateEntry.completedAt || new Date();
          candidateEntry.scores = {
            total: evaluation.overallScore ?? null,
            technical: evaluation.skillAssessment?.technicalKnowledge ?? null,
            coding: evaluation.skillAssessment?.codingAbility ?? null,
            communication: evaluation.skillAssessment?.communicationSkills ?? null,
            confidence: avgConfidenceScore ?? null
          };
          await interview.save();
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
    const mockInterviews = await Interview.find({ 
      $or: [
        { interviewCode: { $regex: '^mock-' } },
        { 'candidates.code': { $regex: '^mock-' } },
        { title: { $regex: 'Mock Interview', $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    const mockResults = mockInterviews.flatMap(interview => 
      interview.candidates.map(candidate => ({
        id: candidate._id,
        name: `Mock Candidate - ${candidate.code || interview.interviewCode}`,
        email: `mock-${candidate.code || interview.interviewCode}@example.com`,
        status: candidate.status,
        completedAt: candidate.completedAt,
        duration: 30,
        results: {
          technicalScore: candidate.results?.technicalScore || 0,
          communicationScore: candidate.results?.communicationScore || 0,
          problemSolvingScore: candidate.results?.problemSolvingScore || 0,
          overallScore: candidate.results?.overallScore || 0,
          totalMarks: candidate.results?.totalMarks || 0,
          maxPossibleMarks: candidate.results?.maxPossibleMarks || 0,
          percentage: candidate.results?.percentage || (candidate.results?.overallScore ? candidate.results.overallScore * 10 : 0),
          evaluationSource: candidate.results?.evaluationSource || 'ai',
          strengths: candidate.results?.strengths || [],
          weaknesses: candidate.results?.weaknesses || [],
          feedback: candidate.results?.feedback || '',
          answers: candidate.results?.answers || []
        },
        interviewCode: candidate.code || interview.interviewCode,
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

    const candidate = interview.candidates.find(c => c.candidate?.toString() === candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const overallScore = interview.calculateOverallScore(
      results.technicalScore,
      results.communicationScore,
      results.problemSolvingScore,
      results.confidenceScore
    );

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

    const processedAnswers = [];
    for (const answer of answers) {
      try {
        const analysis = await geminiService.analyzeAnswer(
          answer.answer, 
          answer.question,
          answer.code
        );
        processedAnswers.push({
          ...answer,
          analysis
        });
      } catch (error) {
        console.error('Error processing answer in submitAllAnswers:', error);
        const fallback = evaluationEngine.evaluateAnswer(answer.answer, answer.question, { code: answer.code });
        processedAnswers.push({
          ...answer,
          analysis: fallback
        });
      }
    }

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
    
    const interview = await InterviewSession.findOne({ interviewCode });
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }
    
    if (!interview.suspiciousActivities) {
      interview.suspiciousActivities = [];
    }
    
    interview.suspiciousActivities.push({
      ...reportData,
      timestamp: Date.now()
    });
    
    const activityCount = interview.suspiciousActivities.length;
    const tabSwitchCount = reportData.tabSwitchCount || 0;
    
    let riskLevel = 'low';
    if (activityCount > 5 || tabSwitchCount > 3) {
      riskLevel = 'high';
    } else if (activityCount > 2 || tabSwitchCount > 1) {
      riskLevel = 'medium';
    }
    
    interview.activityRiskLevel = riskLevel;
    interview.lastActivityReport = Date.now();
    await interview.save();
    
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

// Generate comprehensive PDF Report
const generatePdfReport = async (req, res) => {
  try {
    const { interviewId, candidateId } = req.params;
    let interview = null;
    let candidate = null;
    let candidateName = 'Candidate';
    let candidateEmail = 'candidate@example.com';

    // 1. Mock interview handling
    if (interviewId.startsWith('mock-') || (candidateId && candidateId.startsWith('mock-'))) {
      const codeToSearch = interviewId.startsWith('mock-') ? interviewId : candidateId;
      interview = await Interview.findOne({
        $or: [
          { interviewCode: codeToSearch },
          { 'candidates.code': codeToSearch },
          { interviewCode: { $regex: `^${codeToSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}` } }
        ]
      });

      if (interview) {
        candidate = interview.candidates.find(c => 
          c.code === codeToSearch || 
          c.code === candidateId ||
          c._id.toString() === candidateId
        ) || interview.candidates[0];
      }

      // If not in Interview collection, check InterviewSession directly
      if (!candidate || !candidate.results) {
        const session = await InterviewSession.findOne({ 
          $or: [{ interviewCode: interviewId }, { interviewCode: candidateId }] 
        });
        if (session && session.answers && session.answers.length > 0) {
          const finalEval = await geminiService.generateFinalEvaluation(session.answers);
          interview = {
            title: `Mock Interview - ${codeToSearch}`,
            skills: session.skills || ['Technical Interview'],
            createdAt: session.startTime
          };
          const totalMarks = session.answers.reduce((sum, a) => sum + (a.analysis?.score || 0), 0);
          candidate = {
            code: codeToSearch,
            status: 'completed',
            completedAt: new Date(),
            results: {
              technicalScore: finalEval.skillAssessment?.technicalKnowledge || 0,
              communicationScore: finalEval.skillAssessment?.communicationSkills || 0,
              problemSolvingScore: finalEval.skillAssessment?.problemSolving || 0,
              overallScore: finalEval.overallScore || 0,
              totalMarks,
              maxPossibleMarks: session.answers.length * 10,
              percentage: (finalEval.overallScore || 0) * 10,
              evaluationSource: finalEval.evaluationSource || 'rubric',
              strengths: finalEval.strengths || [],
              weaknesses: finalEval.weaknesses || [],
              feedback: finalEval.overallFeedback || '',
              answers: session.answers.map(ans => ({
                question: typeof ans.question === 'object' ? (ans.question.question || ans.question.text || '') : String(ans.question || ''),
                answer: ans.answer || '',
                code: ans.code || '',
                score: ans.analysis?.score ?? 0,
                technicalKnowledge: ans.analysis?.technicalKnowledge ?? (ans.analysis?.score ?? 0),
                communicationSkills: ans.analysis?.communicationSkills ?? (ans.analysis?.score ?? 0),
                problemSolving: ans.analysis?.problemSolving ?? (ans.analysis?.score ?? 0),
                codingAbility: ans.analysis?.codingAbility ?? 0,
                feedback: ans.analysis?.feedback || 'Attempt recorded.',
                improvements: ans.analysis?.improvements || []
              }))
            }
          };
        }
      }

      candidateName = `Mock Candidate - ${codeToSearch}`;
      candidateEmail = `mock-${codeToSearch}@example.com`;

    } else {
      // 2. Company interview handling
      if (mongoose.Types.ObjectId.isValid(interviewId)) {
        interview = await Interview.findById(interviewId).populate('candidates.candidate', 'name email');
      } else {
        interview = await Interview.findOne({ interviewCode: interviewId }).populate('candidates.candidate', 'name email');
      }

      if (interview) {
        candidate = interview.candidates.find(c => 
          c._id.toString() === candidateId || 
          c.code === candidateId || 
          (c.candidate && c.candidate._id.toString() === candidateId)
        );
        candidateName = candidate?.candidate?.name || candidate?.name || candidate?.candidateName || 'Candidate';
        candidateEmail = candidate?.candidate?.email || candidate?.email || candidate?.candidateEmail || 'No email';
      }
    }

    if (!interview || !candidate || !candidate.results) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Report-${candidateName.replace(/\s+/g, '-')}.pdf`);
    doc.pipe(res);

    // Title & Header
    doc.fontSize(22).fillColor('#1e293b').text('Candidate Interview Evaluation Report', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#64748b').text('QuickHire AI - Intelligent Candidate Assessment Platform', { align: 'center' });
    doc.moveDown(0.8);

    doc.rect(50, doc.y, 500, 2).fill('#2563eb');
    doc.moveDown(1);

    // Candidate details
    doc.fontSize(12).fillColor('#1e293b');
    doc.text(`Candidate Name: ${candidateName}`);
    doc.text(`Email: ${candidateEmail}`);
    doc.text(`Interview: ${interview.title || interview.interviewName || 'Interview Session'}`);
    doc.text(`Date: ${new Date(candidate.completedAt || candidate.startedAt || Date.now()).toLocaleDateString()}`);
    const sourceLabel = candidate.results.evaluationSource === 'fallback' || candidate.results.evaluationSource === 'rubric' 
      ? 'Deterministic Rubric Evaluator (Verified Fallback)' 
      : 'Gemini AI Evaluator';
    doc.text(`Evaluation Source: ${sourceLabel}`);
    doc.moveDown(1);

    // Scores
    doc.fontSize(16).fillColor('#2563eb').text('Overall Scores', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#1e293b');
    doc.text(`Overall Score: ${Math.round((candidate.results.overallScore || 0) * 10) / 10} / 10`);
    if (candidate.results.totalMarks !== undefined && candidate.results.maxPossibleMarks) {
      doc.text(`Total Marks: ${candidate.results.totalMarks} / ${candidate.results.maxPossibleMarks} (${candidate.results.percentage || Math.round((candidate.results.totalMarks/candidate.results.maxPossibleMarks)*100)}%)`);
    } else {
      doc.text(`Percentage: ${Math.round((candidate.results.overallScore || 0) * 10)}%`);
    }
    doc.text(`Technical Knowledge: ${Math.round((candidate.results.technicalScore || 0) * 10) / 10} / 10`);
    doc.text(`Communication Skills: ${Math.round((candidate.results.communicationScore || 0) * 10) / 10} / 10`);
    doc.text(`Problem Solving: ${Math.round((candidate.results.problemSolvingScore || 0) * 10) / 10} / 10`);
    doc.moveDown(1);

    // Executive Feedback
    if (candidate.results.feedback) {
      doc.fontSize(14).fillColor('#2563eb').text('Executive Feedback');
      doc.fontSize(11).fillColor('#334155').text(candidate.results.feedback);
      doc.moveDown(1);
    }

    // Strengths
    if (candidate.results.strengths && candidate.results.strengths.length > 0) {
      doc.fontSize(14).fillColor('#166534').text('Key Strengths');
      candidate.results.strengths.forEach(s => doc.fontSize(11).fillColor('#334155').text(`• ${s}`));
      doc.moveDown(1);
    }

    // Areas for Improvement
    if (candidate.results.weaknesses && candidate.results.weaknesses.length > 0) {
      doc.fontSize(14).fillColor('#b91c1c').text('Areas for Improvement');
      candidate.results.weaknesses.forEach(w => doc.fontSize(11).fillColor('#334155').text(`• ${w}`));
      doc.moveDown(1);
    }

    // Question-by-Question Analysis
    if (candidate.results.answers && candidate.results.answers.length > 0) {
      doc.addPage();
      doc.fontSize(18).fillColor('#1e293b').text('Question-by-Question Analysis', { align: 'center' });
      doc.moveDown(1);

      candidate.results.answers.forEach((ans, index) => {
        doc.fontSize(13).fillColor('#2563eb').text(`Question ${index + 1}: ${ans.question}`);
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor('#475569').text(`Answer: ${ans.answer || (ans.code ? '[Code submitted]' : 'No answer provided')}`);
        if (ans.code) {
          doc.fontSize(9).fillColor('#0f172a').text(`Code:\n${ans.code}`);
        }
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor('#1e293b').text(`Score Awarded: ${ans.score !== undefined ? ans.score : 0} / 10`);
        doc.text(`Technical Knowledge: ${ans.technicalKnowledge ?? ans.score ?? 0} / 10  |  Communication: ${ans.communicationSkills ?? ans.score ?? 0} / 10  |  Problem Solving: ${ans.problemSolving ?? ans.score ?? 0} / 10`);
        doc.text(`Feedback: ${ans.feedback || 'Relevant response.'}`);
        if (ans.improvements && ans.improvements.length > 0) {
          doc.text(`Improvement Suggestion: ${ans.improvements.join(', ')}`);
        }
        doc.moveDown(1);
      });
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