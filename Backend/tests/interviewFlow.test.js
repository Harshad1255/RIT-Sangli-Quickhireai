jest.mock('../src/features/interviews/models/InterviewSession', () => require('./helpers/interviewSessionMock')());
jest.mock('../src/features/interviews/models/Interview', () => ({ findOne: jest.fn(async query => query['candidates.code'] ? {skills:['JavaScript','React','Node','SQL','Python'],candidates:[{code:query['candidates.code']}],save:async()=>{}} : null), updateOne: jest.fn(async()=>({acknowledged:true})) }));
const resultController = require('../src/features/interviews/controllers/resultController');
const questionController = require('../src/features/interviews/controllers/questionController');
const geminiService = require('../src/features/interviews/services/geminiService');

jest.mock('../src/features/interviews/services/geminiService');

describe('Interview Flow Rules', () => {
  beforeEach(() => {
    questionController.activeInterviews.clear();
    jest.resetAllMocks();
    require("../src/features/interviews/models/Interview").findOne.mockImplementation(async query => query['candidates.code'] ? {skills:["JavaScript","React","Node","SQL","Python"],candidates:[{code:query["candidates.code"]}],save:async()=>{}} : null);
    geminiService.generateFinalEvaluation.mockResolvedValue({overallScore:9,skillAssessment:{technicalKnowledge:9,codingAbility:9,communicationSkills:9,problemSolving:9}});
  });

  it('handles successful Gemini with 5 distinct questions and exactly one coding focus at index 2', async () => {
    geminiService.generateQuestion.mockImplementation(async (skill, prev, idx, focus) => {
      return { question: `Q about ${skill} focusing on ${focus}`, topic: skill, difficulty: 'medium' };
    });
    geminiService.analyzeAnswer.mockResolvedValue({ status: 'evaluated', score: 9, feedback: 'Great', technicalAccuracy: 9, completeness: 9, clarity: 9 });

    // Mock start interview (sets up session)
    // Actually, calling the controller functions with mocked req/res is easier.
    const reqStart = { body: { interviewCode: 'test-code', skills: ['JavaScript'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    
    await questionController.startInterview(reqStart, resStart);
    
    const session = await questionController.getInterviewSession('test-code');
    expect(session.questions.length).toBe(1);
    expect(session.questions[0].question).toContain('fundamentals'); // first focus
    
    // Simulate answering 5 times
    for (let i = 0; i < 5; i++) {
      const qIndex = session.questions.length - 1;
      const currentQuestion = session.questions[qIndex];
      const reqAns = { body: { interviewCode: 'test-code', answer: 'My answer', question: currentQuestion } };
      const resAns = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      
      await resultController.processAnswer(reqAns, resAns);
      
      const responseData = resAns.json.mock.calls[0][0];
      if (i < 4) {
        expect(responseData.nextQuestion).toBeDefined();
        if (i === 1) { // Next is index 2, which is coding focus
           expect(responseData.nextQuestion.question).toContain('coding');
        }
      } else {
        expect(responseData.isComplete).toBe(true);
      }
    }
  });

  it('handles Gemini always failing by serving fallbacks without follow-ups', async () => {
    geminiService.generateQuestion.mockRejectedValue(new Error('API Error'));
    geminiService.getFallbackQuestion.mockImplementation((skill, prev, focus) => ({
      question: `Fallback for ${skill} on ${focus}`, topic: skill
    }));
    geminiService.analyzeAnswer.mockRejectedValue(new Error('API Error'));
    geminiService.generateFinalEvaluation.mockResolvedValue({ overallScore: 5, skillAssessment: { technicalKnowledge: 5, codingAbility: 5, communicationSkills: 5, problemSolving: 5 } });

    const reqStart = { body: { interviewCode: 'fail-code', skills: ['React'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    
    await questionController.startInterview(reqStart, resStart);
    const session = await questionController.getInterviewSession('fail-code');
    expect(session.questions[0].question).toContain('Fallback');

    for (let i = 0; i < 5; i++) {
      const qIndex = session.questions.length - 1;
      const currentQuestion = session.questions[qIndex];
      const reqAns = { body: { interviewCode: 'fail-code', answer: 'Some answer', question: currentQuestion } };
      const resAns = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      
      await resultController.processAnswer(reqAns, resAns);
      
      const responseData = resAns.json.mock.calls[0][0];
      if (i < 4) {
        expect(responseData.nextQuestion.question).toContain('Fallback');
        expect(responseData.isFollowUp).toBe(false);
      }
    }
  });

  it('persists question totals and provisional state in mock interview reports', async () => {
    const Interview = require('../src/features/interviews/models/Interview');
    geminiService.generateQuestion.mockImplementation(async (skill, previous) => ({
      question:`Question ${previous.length + 1}`,topic:skill,difficulty:'medium',category:'fundamentals'
    }));
    geminiService.analyzeAnswer.mockResolvedValueOnce({
      status:'provisional',evaluationSource:'fallback',score:4,overallScore:4,technicalKnowledge:4,codingAbility:4,
      communicationSkills:4,problemSolving:4,feedback:'Provisional related concepts',strengths:[],improvements:[]
    }).mockResolvedValue({
      status:'evaluated',score:8,overallScore:8,technicalKnowledge:8,codingAbility:8,
      communicationSkills:8,problemSolving:8,feedback:'Relevant answer',strengths:[],improvements:[]
    });
    geminiService.generateFinalEvaluation.mockResolvedValue({
      overallScore:8,skillAssessment:{technicalKnowledge:8,codingAbility:8,communicationSkills:8,problemSolving:8},
      strengths:['Relevant knowledge'],weaknesses:[],overallFeedback:'Provisional report summary',
      evaluationStatus:'provisional'
    });

    const startResponse={json:jest.fn(),status:jest.fn().mockReturnThis()};
    await questionController.startInterview({body:{interviewCode:'mock-report',skills:['JavaScript']}},startResponse);
    const session=await questionController.getInterviewSession('mock-report');

    for(let i=0;i<5;i++){
      const question=session.questions[session.questions.length-1];
      const answerResponse={json:jest.fn(),status:jest.fn().mockReturnThis()};
      await resultController.processAnswer({body:{interviewCode:'mock-report',answer:'A relevant answer',question}},answerResponse);
      if(i===4) expect(answerResponse.json.mock.calls[0][0].isComplete).toBe(true);
    }

    const saved=Interview.updateOne.mock.calls.find(([query])=>query['candidates.code']==='mock-report');
    const results=saved[1].$set.candidates[0].results;
    expect(results).toMatchObject({
      evaluationStatus:'provisional',totalQuestions:5,attemptedQuestions:5,totalMarks:50,
      marksObtained:36,percentage:72
    });
    expect(results.fallbackQuestions).toHaveLength(1);
    expect(results.answers).toHaveLength(5);
  });

  it('weak answer triggers at most one follow-up per main question', async () => {
    geminiService.generateQuestion.mockResolvedValue({ question: 'Main Q', topic: 'JS' });
    // First answer is weak (score 5)
    geminiService.analyzeAnswer.mockResolvedValueOnce({ status: 'evaluated', score: 5, feedback: 'Weak' })
      // Follow-up answer is also weak
      .mockResolvedValueOnce({ status: 'evaluated', score: 5, feedback: 'Still weak' })
      // Next answers are good
      .mockResolvedValue({ status: 'evaluated', score: 9, feedback: 'Good' });
      
    geminiService.generateFollowUpQuestion.mockResolvedValue({ question: 'Follow up Q', topic: 'JS' });
    geminiService.generateFinalEvaluation.mockResolvedValue({ overallScore: 7, skillAssessment: { technicalKnowledge: 7, codingAbility: 7, communicationSkills: 7, problemSolving: 7 } });

    const reqStart = { body: { interviewCode: 'weak-code', skills: ['Node'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await questionController.startInterview(reqStart, resStart);
    
    const session = await questionController.getInterviewSession('weak-code');
    
    // Answer 1 (Main)
    const reqAns1 = { body: { interviewCode: 'weak-code', answer: 'Weak answer', question: session.questions[0] } };
    const resAns1 = { json: jest.fn() };
    await resultController.processAnswer(reqAns1, resAns1);
    
    const resp1 = resAns1.json.mock.calls[0][0];
    expect(resp1.isFollowUp).toBe(true);
    expect(resp1.nextQuestion.question).toBe('Follow up Q');
    
    // Answer 2 (Follow-up) -> Should not trigger another follow-up even if weak
    const reqAns2 = { body: { interviewCode: 'weak-code', answer: 'Still weak', question: resp1.nextQuestion } };
    const resAns2 = { json: jest.fn() };
    await resultController.processAnswer(reqAns2, resAns2);
    
    const resp2 = resAns2.json.mock.calls[0][0];
    expect(resp2.isFollowUp).toBe(false); // Move to next main question
    expect(resp2.nextQuestion.question).toBe('Main Q');
  });

  it('evaluation failure produces provisional partial credit and does not generate follow-up', async () => {
    geminiService.generateQuestion.mockResolvedValue({ question: 'Main Q', topic: 'JS' });
    // Analyze fails -> { evaluationFailed: true, score: null }
    geminiService.analyzeAnswer.mockRejectedValue(new Error('Fail'));
    geminiService.generateFinalEvaluation.mockResolvedValue({ overallScore: 8, skillAssessment: { technicalKnowledge: 8, codingAbility: 8, communicationSkills: 8, problemSolving: 8 } });

    const reqStart = { body: { interviewCode: 'eval-fail', skills: ['SQL'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await questionController.startInterview(reqStart, resStart);
    
    const session = await questionController.getInterviewSession('eval-fail');
    const reqAns = { body: { interviewCode: 'eval-fail', answer: 'Ans', question: session.questions[0] } };
    const resAns = { json: jest.fn() };
    await resultController.processAnswer(reqAns, resAns);
    
    const resp = resAns.json.mock.calls[0][0];
    expect(resp.evaluation.status).toBe('provisional');expect(resp.evaluation.evaluationSource).toBe('fallback');
    expect(resp.evaluation.score).toBe(0);
    expect(resp.isFollowUp).toBe(false); // No follow-up on failure
  });

  it('skipped answer has score 0 and no follow-up', async () => {
    geminiService.generateQuestion.mockResolvedValue({ question: 'Main Q', topic: 'JS' });
    
    const reqStart = { body: { interviewCode: 'skip-code', skills: ['Python'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await questionController.startInterview(reqStart, resStart);
    
    const session = await questionController.getInterviewSession('skip-code');
    const reqAns = { body: { interviewCode: 'skip-code', answer: '', skipped: true, question: session.questions[0] } };
    const resAns = { json: jest.fn() };
    await resultController.processAnswer(reqAns, resAns);
    
    const resp = resAns.json.mock.calls[0][0];
    expect(resp.evaluation.score).toBe(0);
    expect(resp.evaluation.feedback).toBe("Question skipped");
    expect(resp.isFollowUp).toBe(false);
  });
});
