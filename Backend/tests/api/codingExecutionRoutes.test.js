const express = require('express');
const request = require('supertest');

jest.mock('../../src/features/coding/models/CodingProblem', () => ({
  findById: jest.fn()
}));
jest.mock('../../src/features/coding/models/CodingSubmission', () => jest.fn().mockImplementation(submission => ({
  ...submission,
  _id: 'submission-id',
  submittedAt: new Date('2026-01-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined)
})));
jest.mock('../../src/shared/services/codeExecution', () => ({
  executeCode: jest.fn(),
  judgeSolution: jest.fn()
}));

const CodingProblem = require('../../src/features/coding/models/CodingProblem');
const CodingSubmission = require('../../src/features/coding/models/CodingSubmission');
const { executeCode, judgeSolution } = require('../../src/shared/services/codeExecution');
const codingProblemController = require('../../src/features/coding/controllers/codingProblemController');

const problem = {
  _id: 'two-sum-id',
  isActive: true,
  totalSubmissions: 0,
  totalAccepted: 0,
  testCases: [
    { input: '[2,7,11,15] 9', expectedOutput: '[0,1]', isSample: true, isHidden: false },
    { input: '[3,2,4] 6', expectedOutput: '[1,2]', isSample: true, isHidden: false },
    { input: '[3,3] 6', expectedOutput: '[0,1]', isSample: false, isHidden: true }
  ],
  save: jest.fn().mockResolvedValue(undefined)
};

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'student-id' };
  next();
});
app.post('/api/coding/problems/:id/run', codingProblemController.runProblem);
app.post('/api/coding/problems/:id/submit', codingProblemController.submitProblem);

beforeEach(() => {
  jest.clearAllMocks();
  problem.totalSubmissions = 0;
  problem.totalAccepted = 0;
  CodingProblem.findById.mockResolvedValue(problem);
});

describe('coding problem execution routes', () => {
  test('runs the Two Sum function against sample cases with a generated driver', async () => {
    judgeSolution.mockResolvedValue({
      verdict: 'Accepted',
      passedTests: 2,
      totalTests: 2,
      runtime: 4,
      memory: 32,
      testResults: [
        { input: '[2,7,11,15] 9', expectedOutput: '[0,1]', actualOutput: '[0,1]', passed: true, isHidden: false },
        { input: '[3,2,4] 6', expectedOutput: '[1,2]', actualOutput: '[1,2]', passed: true, isHidden: false }
      ]
    });

    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/run')
      .send({
        language: 'javascript',
        code: 'function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i++) { const other = target - nums[i]; if (seen.has(other)) return [seen.get(other), i]; seen.set(nums[i], i); } return []; }'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.verdict).toBe('Accepted');
    expect(judgeSolution).toHaveBeenCalledWith(expect.objectContaining({
      code: expect.stringContaining('__QH_RESULT_'),
      testCases: problem.testCases.slice(0, 2)
    }));
  });

  test('returns runtimeMs and memoryKb from custom-stdin execution', async () => {
    executeCode.mockResolvedValue({
      verdict: 'Accepted',
      output: '[0,1]',
      stderr: '',
      runtimeMs: 13,
      memoryKb: 96
    });

    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/run')
      .send({ language: 'javascript', code: 'function solve(nums, target) { return [0, 1]; }', stdin: '[2,7,11,15] 9' });

    expect(response.status).toBe(200);
    expect(response.body.data.runtimeMs).toBe(13);
    expect(response.body.data.memoryKb).toBe(96);
  });

  test('does not return raw server exceptions to students', async () => {
    judgeSolution.mockRejectedValueOnce(new Error('private database detail'));

    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/run')
      .send({ language: 'javascript', code: 'function solve(nums, target) { return [0, 1]; }' });

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
    expect(JSON.stringify(response.body)).not.toContain('private database detail');
  });

  test('does not return raw server exceptions from submit to students', async () => {
    judgeSolution.mockRejectedValueOnce(new Error('private submission detail'));

    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/submit')
      .send({ language: 'javascript', code: 'function solve(nums, target) { return [0, 1]; }' });

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
    expect(JSON.stringify(response.body)).not.toContain('private submission detail');
  });

  test.each(['Wrong Answer', 'Runtime Error', 'Compilation Error', 'Time Limit Exceeded'])(
    'returns the %s verdict from code evaluation', async verdict => {
      judgeSolution.mockResolvedValue({ verdict, passedTests: 0, totalTests: 2, runtime: 0, memory: 0, testResults: [] });

      const response = await request(app)
        .post('/api/coding/problems/two-sum-id/run')
        .send({ language: 'javascript', code: 'function solve(nums, target) { return []; }' });

      expect(response.status).toBe(200);
      expect(response.body.data.verdict).toBe(verdict);
    }
  );

  test('returns a validation error for empty source without invoking execution', async () => {
    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/run')
      .send({ language: 'javascript', code: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/code are required/i);
    expect(judgeSolution).not.toHaveBeenCalled();
  });

  test('reports provider outages only as execution-service errors', async () => {
    judgeSolution.mockResolvedValue({
      verdict: 'Execution Service Error',
      code: 'EXECUTION_SERVICE_ERROR',
      serviceReason: 'timeout',
      passedTests: 0,
      totalTests: 2,
      runtime: 0,
      memory: 0,
      testResults: []
    });

    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/run')
      .send({ language: 'javascript', code: 'function solve(nums, target) { return []; }' });

    expect(response.status).toBe(200);
    expect(response.body.data.verdict).toBe('Execution Service Error');
    expect(response.body.data.serviceReason).toBe('timeout');
  });

  test('redacts hidden test details in submit responses', async () => {
    judgeSolution.mockResolvedValue({
      verdict: 'Accepted',
      passedTests: 3,
      totalTests: 3,
      runtime: 5,
      memory: 48,
      testResults: problem.testCases.map(testCase => ({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: testCase.expectedOutput,
        passed: true,
        isHidden: testCase.isHidden
      }))
    });

    const response = await request(app)
      .post('/api/coding/problems/two-sum-id/submit')
      .send({ language: 'javascript', code: 'function solve(nums, target) { return [0, 1]; }' });

    expect(response.status).toBe(201);
    expect(response.body.data.verdict).toBe('Accepted');
    expect(response.body.data.testResults[2]).toMatchObject({
      input: 'Hidden Test Case',
      expectedOutput: 'Hidden',
      actualOutput: 'Passed'
    });
    expect(JSON.stringify(response.body)).not.toContain('[3,3] 6');
  });

  test.each([
    ['run', '/run', null],
    ['run', '/run', { ...problem, isActive: false }],
    ['submit', '/submit', null],
    ['submit', '/submit', { ...problem, isActive: false }]
  ])('returns 404 for %s when the problem is missing or inactive', async (_action, endpoint, unavailableProblem) => {
    CodingProblem.findById.mockResolvedValueOnce(unavailableProblem);

    const response = await request(app)
      .post(`/api/coding/problems/two-sum-id${endpoint}`)
      .send({ language: 'javascript', code: 'function solve(nums, target) { return [0, 1]; }' });

    expect(response.status).toBe(404);
    expect(judgeSolution).not.toHaveBeenCalled();
  });
});
