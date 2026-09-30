process.env.JWT_SECRET = 'coding-health-test-secret';
process.env.CODE_EXECUTION_ENABLED = 'true';
process.env.CODE_EXECUTION_PROVIDER = 'judge0';
process.env.CODE_EXECUTION_FALLBACK_PROVIDER = 'onecompiler';
process.env.JUDGE0_API_URL = 'https://judge0.invalid';
process.env.JUDGE0_API_KEY = 'health-test-key';
process.env.ONECOMPILER_API_KEY = 'health-test-fallback-key';

jest.mock('../../src/shared/services/codeExecution', () => ({
  executeCode: jest.fn(),
  judgeSolution: jest.fn(),
  runTestCases: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const { executeCode } = require('../../src/shared/services/codeExecution');
const { generateToken } = require('../../src/features/auth/middleware/auth');
const codingProblemRoutes = require('../../src/features/coding/routes/codingProblemRoutes');

const app = express();
app.use('/api/coding', codingProblemRoutes);

const tokenFor = userType => generateToken({ id: 'health-user', userType });

beforeEach(() => {
  jest.clearAllMocks();
  executeCode.mockResolvedValue({
    success: true,
    verdict: 'Accepted',
    output: '1',
    runtimeMs: 2,
    memoryKb: 64
  });
});

describe('GET /api/coding/health', () => {
  test('requires authentication and permits only company or admin users', async () => {
    const anonymous = await request(app).get('/api/coding/health');
    const student = await request(app)
      .get('/api/coding/health')
      .set('Authorization', `Bearer ${tokenFor('candidate')}`);

    expect(anonymous.status).toBe(401);
    expect(student.status).toBe(403);
  });

  test('reports safe provider configuration and performs the mocked print probe', async () => {
    const response = await request(app)
      .get('/api/coding/health')
      .set('Authorization', `Bearer ${tokenFor('company')}`);

    expect(response.status).toBe(200);
    expect(response.body.data.codeExecutionEnabled).toBe(true);
    expect(response.body.data.primaryProvider).toBe('judge0');
    expect(response.body.data.fallbackProvider).toBe('onecompiler');
    expect(response.body.data.providerConfig.judge0.apiUrlConfigured).toBe(true);
    expect(response.body.data.providerConfig.judge0.apiKeyConfigured).toBe(true);
    expect(response.body.data.probe.output).toBe('1');
    expect(executeCode).toHaveBeenCalledWith(expect.objectContaining({ language: 'python', code: 'print(1)' }));
    expect(JSON.stringify(response.body)).not.toContain('health-test-key');
    expect(JSON.stringify(response.body)).not.toContain('health-test-fallback-key');
  });
});
