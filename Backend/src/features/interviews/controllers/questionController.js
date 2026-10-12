const preparation = require('../services/questionPreparation');
const geminiService = require('../services/geminiService');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const { completedSession } = require('../services/sessionCompletion');

// Export an empty map for backward compatibility during migration, though we shouldn't need it
const activeInterviews = new Map();

const publicSession = session => ({sessionId:session._id,interviewCode:session.interviewCode,questions:session.questions,answers:session.answers,skills:session.skills,totalQuestions:session.totalQuestions,status:session.status === 'completed' && !completedSession(session) ? 'failed' : session.status,startTime:session.startTime,finalEvaluation:completedSession(session) ? session.finalEvaluation : null,evaluationStatus:session.status === 'completed' && !completedSession(session) ? 'failed' : session.evaluationStatus,processing:!!session.processingUntil && session.processingUntil > new Date()});
// Start new interview
const startInterviewCore = async (req, res) => {
  try {
    const { interviewCode, skills } = req.body;
    console.log('Starting interview:', { interviewCode, skills });
    const isMock = interviewCode && interviewCode.startsWith('mock-');
    console.log('MOCK CODE CHECK:', interviewCode, isMock);

    if (!isMock && (!interviewCode || interviewCode === 'undefined' || interviewCode === '')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing interview code',
        details: 'Interview code is required and must be valid.'
      });
    }

    if (!isMock) {
      const interview = await Interview.findOne({ 'candidates.code': interviewCode }, {skills:1});
      if (!interview) {
        return res.status(404).json({
          success: false,
          error: 'Interview not found for the provided code.'
        });
      }
      if (!Array.isArray(skills) || skills.length === 0 || !skills.every(s => interview.skills.includes(s))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid skills for this interview. Only company-defined skills are allowed.'
        });
      }
    }

    const existing = await InterviewSession.findOne({interviewCode});
    if (existing) {
      preparation.prepare(existing);
      return res.json({success:true, interview:publicSession(existing), resumed:true});
    }

    if (!skills || !Array.isArray(skills) || !skills.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interview parameters',
        details: 'Skills array is required.'
      });
    }

    const totalQuestions = 5;
    const skillsArray = skills.length >= totalQuestions
      ? skills.slice(0, totalQuestions)
      : [...skills, ...Array(totalQuestions - skills.length).fill(skills[0])];

    const interviewSession = new InterviewSession({
      interviewCode,
      skills: skillsArray,
      status: 'active',
      startTime: new Date(),
      currentQuestionIndex: 0,
      totalQuestions,
      questions: [],
      answers: []
    });

    try {
      const firstQuestion = await geminiService.generateQuestion(skillsArray[0], [], 0, 'fundamentals');
      const formattedQ = {
        ...firstQuestion,
        id: Math.random().toString(36).substr(2, 9),
        skill: skillsArray[0],
        questionNumber: 1,
        isFollowUp: false
      };
      interviewSession.questions.push(formattedQ);
    } catch (error) {
      console.error('Error generating first question:', error);
      const fbQ = geminiService.getFallbackQuestion(skillsArray[0], [], 'fundamentals');
      fbQ.id ||= require('node:crypto').randomUUID();
      fbQ.questionNumber = 1;
      fbQ.isFollowUp = false;
      interviewSession.questions.push(fbQ);
    }

    try {
      await interviewSession.save();
      preparation.prepare(interviewSession);
      console.log('Interview session created in DB for code:', interviewCode);
    } catch (saveError) {
      if (saveError.code === 11000) {
        console.log('Duplicate session found due to race condition. Using existing session.');
        const existingSession = await InterviewSession.findOne({ interviewCode });
        return res.json({
          success: true,
          interview: publicSession(existingSession),
          message: 'Interview started successfully (reused session)'
        });
      }
      throw saveError;
    }

    res.json({
      success: true,
      interview: publicSession(interviewSession),
      message: 'Interview started successfully'
    });
  } catch (error) {
    console.error('Error in startInterview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview',
      details: error.message
    });
  }
};

// Coalesce duplicate initialization requests (including React Strict Mode).
const startInterview = async (req,res) => {
  const code = req.body.interviewCode;
  if (preparation.starts.has(code)) {
    const result = await preparation.starts.get(code);
    return res.status(result.status).json(result.body);
  }
  let resolve;
  const task = new Promise(done=>{resolve=done;});
  preparation.starts.set(code,task);
  const started = Date.now();
  const proxy = {statusCode:200,status(value){this.statusCode=value;return this;},json(body){resolve({status:this.statusCode,body});return res.status(this.statusCode).json(body);}};
  try { await startInterviewCore(req,proxy); }
  finally { preparation.starts.delete(code); console.info('[interview timing]',{stage:'initialization',durationMs:Date.now()-started}); }
};

// Get interview session
const getInterviewSession = async (interviewCode) => {
  console.log('Getting session for code:', interviewCode);
  const started = Date.now();
  const session = await InterviewSession.findOne({ interviewCode });
  console.info("[interview timing]",{stage:"session_query",durationMs:Date.now()-started});
  console.log('Session found in DB:', session ? 'yes' : 'no');
  return session;
};

// Add a helper function for fallback questions
const getFallbackQuestion = (skill) => ({
  question: `Tell me about your experience with ${skill}`,
  topic: skill,
  difficulty: "medium",
  expectedDuration: "2-3 minutes",
  category: "experience",
  expectedKeyPoints: ["Technical knowledge", "Practical experience", "Challenges faced"]
});

// Generate questions
const generateQuestions = (req, res) => {
  try {
    const { skills } = req.body;
    const questions = skills.map(skill => getFallbackQuestion(skill));
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get next question
const getNextQuestion = async (req, res) => {
  try {
    const session = await InterviewSession.findOne({interviewCode:req.body.interviewCode});
    if (!session) return res.status(404).json({success:false,error:"Interview session not found"});
    if (session.status === "completed") return res.json({success:true,isComplete:true,evaluation:session.finalEvaluation});
    const question = session.questions[session.questions.length - 1];
    return res.json({success:true,question,topic:question?.topic});
  } catch (error) {
    return res.status(500).json({success:false,error:"Unable to restore current question"});
  }
};

module.exports = {
  startInterview,
  getInterviewSession,
  generateQuestions,
  getNextQuestion,
  getFallbackQuestion,
  activeInterviews
};
