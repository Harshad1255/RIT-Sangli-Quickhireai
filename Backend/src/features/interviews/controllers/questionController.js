const geminiService = require('../services/geminiService');
const Interview = require('../models/Interview');

// In-memory storage for interview sessions (in production, use Redis or database)
const activeInterviews = new Map();

// Start new interview
const startInterview = async (req, res) => {
  try {
    const { interviewCode, skills } = req.body;
    console.log('Starting interview:', { interviewCode, skills });
    // Debug log for mock interview detection
    const isMock = interviewCode && interviewCode.startsWith('mock-');
    console.log('MOCK CODE CHECK:', interviewCode, isMock);

    // Allow mock interviews with codes like 'mock-xxxx'
    if (!isMock && (!interviewCode || interviewCode === 'undefined' || interviewCode === '')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing interview code',
        details: 'Interview code is required and must be valid.'
      });
    }

    // If not a mock interview, enforce company skills
    if (!isMock) {
      // Find the interview by code
      const interview = await Interview.findOne({ interviewCode });
      if (!interview) {
        return res.status(404).json({
          success: false,
          error: 'Interview not found for the provided code.'
        });
      }
      // Only allow the company's skills
      if (!Array.isArray(skills) || skills.length === 0 || !skills.every(s => interview.skills.includes(s))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid skills for this interview. Only company-defined skills are allowed.'
        });
      }
    }

    // Clear any existing session
    activeInterviews.delete(interviewCode);

    if (!skills || !Array.isArray(skills)) {
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

    // Initialize interview session
    const interviewSession = {
      id: interviewCode,
      skills: skillsArray,
      status: 'active',
      startTime: new Date(),
      currentQuestionIndex: 0,
      totalQuestions,
      questions: [],
      answers: []
    };

    // Generate first question
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
      fbQ.questionNumber = 1;
      fbQ.isFollowUp = false;
      interviewSession.questions.push(fbQ);
    }

    // Store the session
    activeInterviews.set(interviewCode, interviewSession);
    console.log('Interview session created:', interviewSession);
    console.log('Active sessions:', Array.from(activeInterviews.keys()));

    res.json({
      success: true,
      interview: interviewSession,
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

// Get interview session
const getInterviewSession = (interviewCode) => {
  const session = activeInterviews.get(interviewCode);
  console.log('Getting session for code:', interviewCode);
  console.log('Session found:', session ? 'yes' : 'no');
  console.log('Active sessions:', Array.from(activeInterviews.keys()));
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
    const { interviewId, currentTopic, selectedSkills, questionNumber } = req.body;

    // Convert selectedSkills object to array of skills
    const skillsArray = Object.entries(selectedSkills)
      .reduce((acc, [category, skills]) => {
        return acc.concat(skills);
      }, []);

    // Filter out current topic
    const availableSkills = skillsArray.filter(skill => skill !== currentTopic);
    
    // If no other skills available, reuse current topic
    const nextTopic = availableSkills.length > 0 
      ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
      : currentTopic;

    // Pass focus area based on questionNumber or default
    const focuses = ['fundamentals', 'practical application', 'coding', 'debugging', 'trade-offs'];
    const qIndex = (questionNumber || 1) - 1;
    const focusArea = focuses[qIndex % focuses.length];

    const nextQuestion = await geminiService.generateQuestion(nextTopic, [], qIndex, focusArea);
    
    res.json({
      success: true,
      question: nextQuestion,
      topic: nextTopic
    });
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get next question',
      details: error.message
    });
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