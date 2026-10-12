const preparation = require('../services/questionPreparation');
const completion = require('../services/sessionCompletion');
const diagnostics = require('../../../shared/services/evaluationDiagnostics');
const persistSession = async (session, stage) => {
  try {
    await session.save();
    diagnostics.log(stage,{sessionId:String(session._id),savedAnswers:session.answers.length,status:session.status,evaluationStatus:session.evaluationStatus});
  } catch(error) {
    error.errorCode = diagnostics.databaseCode(error);
    diagnostics.log(stage,{sessionId:String(session._id),errorCode:error.errorCode,valid:false});
    throw error;
  }
};
const evaluationUtils = require('../services/evaluationUtils');
const Interview = require('../models/Interview');
const Candidate = require('../../candidates/models/Candidate');
const InterviewSession = require('../models/InterviewSession');
const geminiService = require('../services/geminiService');
const faceAnalysisService = require('../services/faceAnalysisService');
const questionController = require('./questionController');

// Process answer and analyze
const processAnswerCore = async (req, res) => {
  const requestStarted = Date.now();
  let interview;
  try {
    const { interviewCode, answer, skipped = false, videoData } = req.body;
    let question = req.body.question;
    if ((answer != null && typeof answer !== 'string') || (req.body.code != null && typeof req.body.code !== 'string')) return res.status(400).json({ success: false, error: 'Answer and code must be text' });
    const speechConfidence = typeof req.body.speechConfidence === 'number' && Number.isFinite(req.body.speechConfidence) && req.body.speechConfidence > 0 && req.body.speechConfidence <= 1 ? req.body.speechConfidence : null;
    if (videoData) console.log('videoData present');
    
    // Get interview session from DB
    interview = await InterviewSession.findOne({ interviewCode });
    if (!interview) return res.status(404).json({success:false,error:'Interview session not found. Start or restore the interview first.'});
    diagnostics.log('session_loaded',{requestId:req.requestId,sessionId:String(interview._id),savedAnswers:interview.answers.length,status:interview.status,evaluationStatus:interview.evaluationStatus});
    if (!question || typeof question.id !== 'string') return res.status(400).json({success:false,error:'A stable question ID is required.'});
    const authoritativeQuestion = interview.questions.find(q => q.id === question.id);
    if (!authoritativeQuestion) return res.status(409).json({success:false,error:'Unknown interview question.'});
    question = authoritativeQuestion;
    if (completion.completedSession(interview)) return res.json(interview.lastResponse?.isComplete ? interview.lastResponse : {success:true,isComplete:true,status:'completed',evaluationStatus:'completed',sessionId:interview._id,interviewCode,evaluation:interview.finalEvaluation,lastAnswerEvaluation:interview.answers[interview.answers.length-1]?.analysis,finalScore:interview.currentScore});
    if (interview.status === 'completed') return res.status(409).json({success:false,status:'failed',error:'This saved session has an incomplete evaluation. Start a new mock attempt or contact the interviewer.'});

    // Use answers.length to track all answers, but we need to track main questions answered.
    // A main question is one that does not have isFollowUp true.
    const existingAnswer = question?.id && interview.answers.find(a=>a.questionId === question.id);
    if (existingAnswer && existingAnswer.analysis?.status !== 'pending') {
      if (interview.lastAnsweredQuestionId === question.id && interview.lastResponse) return res.json(interview.lastResponse);
      if (question.id !== interview.questions[interview.questions.length - 1]?.id) return res.status(409).json({success:false,error:'This question has already been submitted. Reload to restore the current session.'});
    }
    const latestQuestion = interview.questions[interview.questions.length - 1];
    if (question.id !== latestQuestion?.id) return res.status(409).json({success:false,error:'Question does not match the active interview question.'});
    const mainQuestionsAnswered = interview.answers.filter(a => !a.isFollowUp && a.questionId !== question.id).length;
    const preparedQuestion = preparation.nextPrepared(interview, mainQuestionsAnswered + (question?.isFollowUp ? 1 : 2)).catch(()=>null);
    const isCurrentFollowUp = question && question.isFollowUp;
    
    const currentQuestionText = typeof question === 'string' ? question : question ? question.question : `Question ${mainQuestionsAnswered + 1}`;
    const transcript = existingAnswer?.answer ?? answer ?? '';
    const code = existingAnswer?.code ?? req.body.code ?? '';
    const isSkipped = skipped || !transcript.trim() && !code.trim();
    
    // Analyze face if video data provided
    let facialAnalysis = null;
    let confidenceScore = 0;
    
    if (videoData) {
      try {
        facialAnalysis = await faceAnalysisService.analyzeFrame(videoData);
        confidenceScore = facialAnalysis.confidenceScore;
        
        if (facialAnalysis.warning) {
        }
      } catch (error) {
        console.error('Error analyzing face:', error);
        // Continue without facial analysis
      }
    }

    const pendingIndex = existingAnswer ? interview.answers.indexOf(existingAnswer) : interview.answers.length;
    if (!existingAnswer) {
      interview.answers.push({question:currentQuestionText, questionId:question.id, answer:transcript, code, isFollowUp:!!isCurrentFollowUp, analysis:{status:'pending',score:null,feedback:'Evaluation in progress'}});
      await persistSession(interview, 'session_persisted');
    }
    const evaluationStarted = Date.now();
    // Analyze answer using Gemini
    let analysis;
    try {
      analysis = existingAnswer?.analysis?.status !== "pending" && existingAnswer?.analysis ? existingAnswer.analysis : isSkipped ? evaluationUtils.skipped() : await geminiService.analyzeAnswer(transcript || code, question || currentQuestionText, { code, speechConfidence,sessionId:String(interview._id),requestId:req.requestId });
    } catch (analysisError) {
      console.error("[INTERVIEW AI EVALUATION ERROR]", {
         interviewId: interview._id,
         questionId: question?.id,
         errorName: analysisError?.name,

         status: analysisError?.response?.status,

      });
      analysis = evaluationUtils.unavailable();
    }

    // Store answer and analysis with confidence score
    const storedAnswer = {
      question: currentQuestionText,
      answer: transcript,
      rawTranscript: transcript,
      normalizedTranscript: analysis.normalizedTranscript ?? evaluationUtils.normalizeTranscript(transcript),
      speechConfidence,
      status: analysis.status,
      code: code,
      analysis: analysis,
      confidenceScore: confidenceScore,
      facialAnalysis: facialAnalysis,
      isFollowUp: !!isCurrentFollowUp,
      questionId: question?.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    interview.answers[pendingIndex] = storedAnswer;
    interview.markModified?.("answers");
    await persistSession(interview, 'session_persisted');
    console.info("[interview timing]", {stage:"answer_evaluation", questionId:storedAnswer.questionId, durationMs:Date.now()-evaluationStarted});

    // Calculate running average (excluding null scores)
    let totalScore = 0;
    let validScores = 0;
    for (const ans of interview.answers) {
      if (ans.analysis && ans.analysis.score !== null && ans.analysis.score !== undefined) {
        const technicalScore = ans.analysis.score;
        totalScore += technicalScore;
        validScores++;
      }
    }
    interview.currentScore = validScores > 0 ? totalScore / validScores : null;

    const newMainQuestionsAnswered = interview.answers.filter(a => !a.isFollowUp).length;

    // Check if we should generate a follow-up question based on answer quality
    let isFollowUp = false;
    let nextQuestion = null;
    
    // Only generate follow-up if answer quality is poor (score < 8), we haven't reached total questions,
    // this wasn't a skipped question, evaluation didn't fail, and the current question is not already a follow-up.
    const canFollowUp = !isCurrentFollowUp && !isSkipped && !analysis.evaluationFailed && analysis.score < 8 && newMainQuestionsAnswered < interview.totalQuestions;

    if (canFollowUp) {
      try {
        const followUpQuestion = await geminiService.generateFollowUpQuestion(
          question || { question: currentQuestionText, topic: interview.skills[newMainQuestionsAnswered - 1], id: storedAnswer.questionId },
          transcript,
          analysis,
          interview.questions
        );
        
        if (followUpQuestion && !geminiService.isDuplicateQuestion(followUpQuestion, interview.questions)) {
          nextQuestion = {
            ...followUpQuestion,
            id: Math.random().toString(36).substr(2, 9),
            skill: followUpQuestion.topic,
            questionNumber: newMainQuestionsAnswered, // Same main question number
            isFollowUp: true
          };
          interview.questions.push(nextQuestion);
          isFollowUp = true;
        }
      } catch (error) {
        console.error('Error generating follow-up question:', error);
      }
    }
    
    // If no follow-up was generated, check if we've reached total main questions
    if (!isFollowUp) {
      if (newMainQuestionsAnswered >= interview.totalQuestions) {
        if (interview.evaluationStatus === 'failed') {
          for (const saved of interview.answers.filter(saved=>saved.analysis?.status === 'unavailable').slice(0,2)) {
            if (saved.analysis?.status === 'unavailable') {
              const savedQuestion = interview.questions.find(q=>q.id === saved.questionId);
              saved.analysis = await geminiService.analyzeAnswer(saved.answer || saved.code, savedQuestion, {code:saved.code || '',maxAttempts:1,sessionId:String(interview._id),requestId:req.requestId});
              saved.status = saved.analysis.status;
            }
          }
          interview.markModified?.('answers');
          analysis = interview.answers.find(saved=>saved.questionId === question.id)?.analysis || analysis;
          const scores = interview.answers.map(saved=>saved.analysis?.score).filter(score=>typeof score === 'number' && Number.isFinite(score));
          interview.currentScore = scores.length ? scores.reduce((sum,score)=>sum+score,0)/scores.length : null;
          await persistSession(interview, 'session_persisted');
        }
        if (!completion.answersComplete(interview)) {
          interview.evaluationStatus = 'failed';
          await persistSession(interview, 'session_persisted');
          const failed = interview.answers.find(saved=>saved.analysis?.status === 'unavailable')?.analysis;
          const errorCode = failed?.errorCode || 'INCOMPLETE_ANSWERS';
          diagnostics.log('completion_validation_failed',{sessionId:String(interview._id),errorCode,savedAnswers:interview.answers.length,valid:false});
          return res.status(503).json({success:false,status:'failed',evaluationStatus:'failed',errorCode,error:failed?.errorMessage || 'Some answers could not be evaluated. Retry to recover the saved interview.'});
        }
        interview.evaluationStatus = 'running';
        interview.evaluationJobId ||= `${interview._id || interviewCode}:final`;
        await persistSession(interview, 'session_persisted');
        const finalEvaluation = completion.validReport(interview.finalEvaluation) ? interview.finalEvaluation : await geminiService.generateFinalEvaluation(interview.answers,{sessionId:String(interview._id),requestId:req.requestId});
        diagnostics.log('final_scores_validated',{sessionId:String(interview._id),valid:completion.validReport(finalEvaluation)});
        if (!completion.validReport(finalEvaluation)) {
          interview.evaluationStatus = 'failed';
          await persistSession(interview, 'session_persisted');
          return res.status(503).json({success:false,status:'failed',errorCode:'FINAL_REPORT_INVALID',error:'Final evaluation is unavailable. Your answers are saved; please retry.'});
        }
        interview.finalEvaluation = finalEvaluation;
        interview.evaluationStatus = 'completed';
        await persistSession(interview, 'session_persisted');
        
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
                  codingAbility: finalEvaluation.skillAssessment?.codingAbility ?? null,
                  technicalKnowledge: finalEvaluation.skillAssessment?.technicalKnowledge ?? null,
                  communicationSkills: finalEvaluation.skillAssessment?.communicationSkills ?? null,
                  problemSolving: finalEvaluation.skillAssessment?.problemSolving ?? null,
                  technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge ?? finalEvaluation.technicalScore ?? null,
                  communicationScore: finalEvaluation.skillAssessment?.communicationSkills ?? finalEvaluation.communicationScore ?? null,
                  problemSolvingScore: finalEvaluation.skillAssessment?.problemSolving ?? finalEvaluation.problemSolvingScore ?? null,
                  confidenceScore: interview.currentScore || 0,
                  overallScore: finalEvaluation.overallScore ?? null,
                  strengths: finalEvaluation.strengths || [],
                  weaknesses: finalEvaluation.weaknesses || [],
                  feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
                  answers: interview.answers.map(evaluationUtils.serializeAnswer)
                };
                await dbInterview.save();
                diagnostics.log('company_report_persisted',{sessionId:String(interview._id),valid:true});
              } else {
                throw Object.assign(new Error('Report owner not found'),{errorCode:'REPORT_OWNER_NOT_FOUND'});
              }
            } else {
              throw Object.assign(new Error('Report owner not found'),{errorCode:'REPORT_OWNER_NOT_FOUND'});
            }
          } catch (err) {
            err.errorCode ||= diagnostics.databaseCode(err);
            diagnostics.log('company_report_failed',{sessionId:String(interview._id),errorCode:err.errorCode,valid:false});
            throw err;
          }
        }
        
        const responseBody = {
          success: true,
          status: 'completed',
          evaluationStatus: 'completed',
          sessionId: interview._id,
          interviewCode,
          answers: interview.answers,
          questions: interview.questions,
          evaluation: finalEvaluation,
          lastAnswerEvaluation: {
            ...analysis,
            confidenceScore: confidenceScore,
            facialAnalysis: facialAnalysis
          },
          isComplete: true,
          finalScore: interview.currentScore
        };
        interview.lastAnsweredQuestionId = question?.id;
        interview.lastResponse = responseBody;
        interview.status = 'completed';
        await persistSession(interview, 'session_persisted');
        return res.json(responseBody);
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
        nextQuestion = await preparedQuestion || await geminiService.generateQuestion(nextSkill, previousQuestions, newMainQuestionsAnswered, focusArea);
        if (geminiService.isDuplicateQuestion(nextQuestion, previousQuestions)) nextQuestion = await geminiService.generateQuestion(nextSkill, previousQuestions, newMainQuestionsAnswered, focusArea);
        if (geminiService.isDuplicateQuestion(nextQuestion, previousQuestions)) nextQuestion = geminiService.getFallbackQuestion(nextSkill, previousQuestions, focusArea);
        nextQuestion = {
          ...nextQuestion,
          id: nextQuestion.id || Math.random().toString(36).substr(2, 9),
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

    const responseBody = {
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
    };
    interview.lastAnsweredQuestionId = question?.id;
    interview.lastResponse = responseBody;
    interview.currentQuestionIndex = nextQuestion.questionNumber - 1;
    await persistSession(interview, 'session_persisted');
    res.json(responseBody);
    console.info('[interview timing]',{stage:'answer_request',durationMs:Date.now()-requestStarted});

  } catch (error) {
    diagnostics.log('request_failed',{requestId:req.requestId,errorCode:error.errorCode || diagnostics.databaseCode(error)});
    if (interview) {
      try {await InterviewSession.updateOne({interviewCode:interview.interviewCode,processingToken:req.processingToken},{$set:{evaluationStatus:'failed'}});}
      catch {diagnostics.log('failure_status_persistence_failed',{sessionId:String(interview._id),errorCode:'DATABASE_WRITE_FAILED'});}
    }
    res.status(500).json({ 
      success: false,
      errorCode: error.errorCode || diagnostics.databaseCode(error),
      evaluationStatus: 'failed',
      error: 'Interview persistence failed. Your saved answers can be recovered; please retry.'
    });
  }
};

const answerRequests = new Map();
const processAnswer = async (req,res) => {
  diagnostics.log('request_received',{requestId:req.requestId});
  const key = req.body.interviewCode;
  if (typeof key !== 'string' || !key.trim()) return res.status(400).json({success:false,error:'Interview code is required.'});
  if (answerRequests.has(key)) return res.status(409).json({success:false,errorCode:'EVALUATION_IN_PROGRESS',error:'An answer is already being evaluated. Please wait.'});
  answerRequests.set(key,true);
  const token = require('node:crypto').randomUUID();
  try {
    const claimed = await InterviewSession.findOneAndUpdate({interviewCode:key,$or:[{processingUntil:{$exists:false}},{processingUntil:{$lte:new Date()}}]},{$set:{processingToken:token,processingUntil:new Date(Date.now()+300000)},$inc:{__v:1}},{new:true});
    if (!claimed) {
      const session = await InterviewSession.findOne({interviewCode:key});
      if (!session) return res.status(404).json({success:false,error:'Interview session not found.'});
      return res.status(409).json({success:false,status:'processing',errorCode:'EVALUATION_IN_PROGRESS',evaluationStatus:session.evaluationStatus,error:'An answer is already being evaluated. Please wait.'});
    }
    const response = {statusCode:200,status(value){this.statusCode=value;return this;},json(body){
      diagnostics.log('response_returned',{requestId:req.requestId,httpStatus:this.statusCode,status:body.status || (body.isComplete?'completed':'active'),evaluationStatus:body.evaluationStatus,errorCode:body.errorCode});
      return (typeof res.status==='function'?res.status(this.statusCode):res).json(body);
    }};
    req.processingToken = token;
    return await processAnswerCore(req,response);
  } catch (error) {
    diagnostics.log('request_failed',{requestId:req.requestId,errorCode:error.errorCode || diagnostics.databaseCode(error)});
    return res.status(500).json({success:false,errorCode:error.errorCode || diagnostics.databaseCode(error),error:'Unable to save the interview. Please retry.'});
  } finally {
    answerRequests.delete(key);
    try {await InterviewSession.updateOne({interviewCode:key,processingToken:token},{$unset:{processingToken:1,processingUntil:1}});}
    catch(error) {diagnostics.log('claim_release_failed',{requestId:req.requestId,errorCode:diagnostics.databaseCode(error)});}
  }
};

const getDefaultAnalysis = evaluationUtils.unavailable;

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
    const mockInterview = {
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
          codingAbility: finalEvaluation.skillAssessment?.codingAbility ?? null,
                  technicalKnowledge: finalEvaluation.skillAssessment?.technicalKnowledge ?? null,
                  communicationSkills: finalEvaluation.skillAssessment?.communicationSkills ?? null,
                  problemSolving: finalEvaluation.skillAssessment?.problemSolving ?? null,
                  technicalScore: finalEvaluation.skillAssessment?.technicalKnowledge ?? null,
          communicationScore: finalEvaluation.skillAssessment?.communicationSkills ?? null,
          problemSolvingScore: finalEvaluation.skillAssessment?.problemSolving ?? null,
          confidenceScore: interview.answers.reduce((sum, ans) => sum + (ans.confidenceScore || 0), 0) / Math.max(1, interview.answers.length) / 10,
          overallScore: finalEvaluation.overallScore ?? null,
          strengths: finalEvaluation.strengths || [],
          weaknesses: finalEvaluation.weaknesses || [],
          feedback: finalEvaluation.overallFeedback || finalEvaluation.feedback || '',
          answers: interview.answers.map(evaluationUtils.serializeAnswer)
        },
        startedAt: interview.startTime,
        completedAt: new Date()
      }]
    };

    await Interview.updateOne({'candidates.code':mockCode},{$set:mockInterview},{upsert:true,runValidators:true});
    diagnostics.log('mock_report_persisted',{sessionId:String(interview._id),valid:true});
    console.log('Mock interview results stored in database:', mockCode);
  } catch (error) {
    error.errorCode ||= diagnostics.databaseCode(error);
    diagnostics.log('mock_report_failed',{sessionId:String(interview._id),errorCode:error.errorCode,valid:false});
    throw error;
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
          ...candidate.results?.toObject?.(),
          technicalScore: candidate.results?.technicalScore || 0,
          communicationScore: candidate.results?.communicationScore || 0,
          problemSolvingScore: candidate.results?.problemSolvingScore || 0,
          overallScore: candidate.results?.overallScore ?? null,
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
    const session = await InterviewSession.findOne({interviewCode:req.body.interviewCode});
    if (!session) return res.status(404).json({success:false,error:"Interview session not found"});
    if (!completion.completedSession(session)) return res.status(409).json({success:false,status:session.evaluationStatus || "not_started",error:"Submit answers through the active question endpoint first."});
    return res.json({success:true,answers:session.answers,finalEvaluation:session.finalEvaluation});
  } catch (error) {
    return res.status(500).json({success:false,error:"Unable to load interview results"});
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
    const interview = await InterviewSession.findOne({ interviewCode });
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
    await interview.save();
    
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
       const mongoose = require('mongoose');
       if (mongoose.Types.ObjectId.isValid(interviewId)) {
         interview = await Interview.findById(interviewId).populate('candidates.candidate', 'name email');
       } else {
         interview = await Interview.findOne({ interviewCode: interviewId }).populate('candidates.candidate', 'name email');
       }
       
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
      doc.fontSize(12).text(`Technical Knowledge: ${candidate.results.technicalKnowledge ?? candidate.results.technicalScore ?? "N/A"}/10`);
      doc.text(`Communication Skills: ${candidate.results.communicationSkills ?? candidate.results.communicationScore ?? "N/A"}/10`);
      doc.text(`Problem Solving: ${candidate.results.problemSolving ?? candidate.results.problemSolvingScore ?? "N/A"}/10`);
      doc.text(`Coding Ability: ${candidate.results.codingAbility ?? "N/A"}/10`);
      doc.text(candidate.results.overallScore == null ? "Evaluation service temporarily unavailable" : `Overall: ${candidate.results.overallScore.toFixed(1)}/10`);
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

      if (candidate.results.answers && candidate.results.answers.length > 0) {
        doc.addPage();
        doc.fontSize(18).text('Question-by-Question Analysis', { align: 'center' });
        doc.moveDown();

        candidate.results.answers.forEach((ans, index) => {
          doc.fontSize(14).text(`Question ${index + 1}: ${ans.question}`, { underline: true });
          doc.fontSize(12).text(`Answer: ${ans.answer || 'No answer provided'}`);
          
          if (ans.status === 'unavailable' || ans.score === null || ans.feedback === 'Evaluation failed') {
            doc.text(`Evaluation service temporarily unavailable`);
          } else if (ans.status === 'skipped' || ans.feedback === 'Question skipped') {
            doc.text(`Technical Knowledge: N/A`);
            doc.text(`Coding Ability: N/A`);
            doc.text(`Communication Skills: N/A`);
            doc.text(`Problem Solving: N/A`);
            doc.text(`Feedback: Question skipped`);
          } else {
            doc.text(`Technical Knowledge: ${ans.technicalKnowledge !== undefined ? ans.technicalKnowledge : (ans.technicalAccuracy ?? ans.score ?? 0)}/10`);
            doc.text(`Coding Ability: ${ans.codingAbility !== undefined ? ans.codingAbility : 0}/10`);
            doc.text(`Communication Skills: ${ans.communicationSkills !== undefined ? ans.communicationSkills : (ans.communication ?? ans.score ?? 0)}/10`);
            doc.text(`Problem Solving: ${ans.problemSolving !== undefined ? ans.problemSolving : 0}/10`);
            doc.text(`Feedback: ${ans.feedback || 'None'}`);
            if (ans.improvements && ans.improvements.length > 0) {
              doc.text(`Areas for Improvement: ${ans.improvements.join(', ')}`);
            }
          }
          doc.moveDown();
        });
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
