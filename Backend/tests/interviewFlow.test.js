const resultController = require('../src/features/interviews/controllers/resultController');
const questionController = require('../src/features/interviews/controllers/questionController');
const geminiService = require('../src/features/interviews/services/geminiService');

jest.mock('../src/features/interviews/services/geminiService');

describe('Interview Flow Rules', () => {
  beforeEach(() => {
    questionController.activeInterviews.clear();
    jest.clearAllMocks();
  });

  it('handles successful Gemini with 5 distinct questions and exactly one coding focus at index 2', async () => {
    geminiService.generateQuestion.mockImplementation(async (skill, prev, idx, focus) => {
      return { question: `Q about ${skill} focusing on ${focus}`, topic: skill, difficulty: 'medium' };
    });
    geminiService.analyzeAnswer.mockResolvedValue({ score: 9, feedback: 'Great', technicalAccuracy: 9, completeness: 9, clarity: 9 });

    // Mock start interview (sets up session)
    // Actually, calling the controller functions with mocked req/res is easier.
    const reqStart = { body: { interviewCode: 'test-code', skills: ['JavaScript'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    
    await questionController.startInterview(reqStart, resStart);
    
    const session = questionController.getInterviewSession('test-code');
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
    geminiService.generateFinalEvaluation.mockResolvedValue({ overallScore: 5 });

    const reqStart = { body: { interviewCode: 'fail-code', skills: ['React'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    
    await questionController.startInterview(reqStart, resStart);
    const session = questionController.getInterviewSession('fail-code');
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

  it('weak answer triggers at most one follow-up per main question', async () => {
    geminiService.generateQuestion.mockResolvedValue({ question: 'Main Q', topic: 'JS' });
    // First answer is weak (score 5)
    geminiService.analyzeAnswer.mockResolvedValueOnce({ score: 5, feedback: 'Weak' })
      // Follow-up answer is also weak
      .mockResolvedValueOnce({ score: 5, feedback: 'Still weak' })
      // Next answers are good
      .mockResolvedValue({ score: 9, feedback: 'Good' });
      
    geminiService.generateFollowUpQuestion.mockResolvedValue({ question: 'Follow up Q', topic: 'JS' });
    geminiService.generateFinalEvaluation.mockResolvedValue({ overallScore: 7 });

    const reqStart = { body: { interviewCode: 'weak-code', skills: ['Node'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await questionController.startInterview(reqStart, resStart);
    
    const session = questionController.getInterviewSession('weak-code');
    
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

  it('evaluation failure excludes score from averages and does not generate follow-up', async () => {
    geminiService.generateQuestion.mockResolvedValue({ question: 'Main Q', topic: 'JS' });
    // Analyze fails -> { evaluationFailed: true, score: null }
    geminiService.analyzeAnswer.mockRejectedValue(new Error('Fail'));
    geminiService.generateFinalEvaluation.mockResolvedValue({ overallScore: 8 });

    const reqStart = { body: { interviewCode: 'eval-fail', skills: ['SQL'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await questionController.startInterview(reqStart, resStart);
    
    const session = questionController.getInterviewSession('eval-fail');
    const reqAns = { body: { interviewCode: 'eval-fail', answer: 'Ans', question: session.questions[0] } };
    const resAns = { json: jest.fn() };
    await resultController.processAnswer(reqAns, resAns);
    
    const resp = resAns.json.mock.calls[0][0];
    expect(resp.evaluation.evaluationFailed).toBe(true);
    expect(resp.evaluation.score).toBeNull();
    expect(resp.isFollowUp).toBe(false); // No follow-up on failure
  });

  it('skipped answer has score 0 and no follow-up', async () => {
    geminiService.generateQuestion.mockResolvedValue({ question: 'Main Q', topic: 'JS' });
    
    const reqStart = { body: { interviewCode: 'skip-code', skills: ['Python'] } };
    const resStart = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await questionController.startInterview(reqStart, resStart);
    
    const session = questionController.getInterviewSession('skip-code');
    const reqAns = { body: { interviewCode: 'skip-code', answer: '', skipped: true, question: session.questions[0] } };
    const resAns = { json: jest.fn() };
    await resultController.processAnswer(reqAns, resAns);
    
    const resp = resAns.json.mock.calls[0][0];
    expect(resp.evaluation.score).toBe(0);
    expect(resp.evaluation.feedback).toBe("Question skipped");
    expect(resp.isFollowUp).toBe(false);
  });
});
