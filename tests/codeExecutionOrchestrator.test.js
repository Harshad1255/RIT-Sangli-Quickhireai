const { executeCode } = require('../Backend/src/shared/services/codeExecution/orchestrator');
const axios = require('axios');
const { VERDICTS } = require('../Backend/src/shared/services/codeExecution/verdicts');

jest.mock('axios');

describe('executeCode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CODE_EXECUTION_ENABLED = 'true';
    process.env.CODE_EXECUTION_PROVIDER = 'judge0';
    process.env.JUDGE0_API_URL = 'http://mock.judge0.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects unsupported language', async () => {
    const result = await executeCode({ language: 'unknown', code: 'print("hi")' });
    expect(result.success).toBe(false);
    expect(result.verdict).toBe(VERDICTS.VALIDATION_ERROR);
  });

  it('rejects oversized code', async () => {
    process.env.CODE_MAX_SOURCE_LENGTH = '10';
    const result = await executeCode({ language: 'python', code: 'print("this is way too long")' });
    expect(result.success).toBe(false);
    expect(result.verdict).toBe(VERDICTS.VALIDATION_ERROR);
  });

  it('handles Judge0 Accepted', async () => {
    // Mock the submission POST
    axios.post.mockResolvedValueOnce({ data: { token: 'mock-token' } });
    
    // Mock the polling GET
    axios.get.mockResolvedValueOnce({
      data: {
        status: { id: 3 }, // Accepted
        stdout: Buffer.from('hello\n').toString('base64'),
        time: '0.045',
        memory: '1024'
      }
    });

    const result = await executeCode({ language: 'python', code: 'print("hello")' });
    
    expect(result.success).toBe(true);
    expect(result.verdict).toBe(VERDICTS.ACCEPTED);
    expect(result.output).toBe('hello');
    expect(result.runtimeMs).toBe(45);
  });

  it('falls back to secondary provider if Judge0 fails', async () => {
    process.env.CODE_EXECUTION_FALLBACK_PROVIDER = 'onecompiler';
    process.env.ONECOMPILER_API_KEY = 'mock-key';

    // Judge0 POST fails
    axios.post.mockRejectedValueOnce(new Error('Network error'));
    
    // Fallback to OneCompiler POST
    axios.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        stdout: 'fallback output\n',
        executionTime: 12,
        memoryUsed: 2048
      }
    });

    const result = await executeCode({ language: 'javascript', code: 'console.log("fallback output")' });
    
    expect(result.success).toBe(true);
    expect(result.verdict).toBe(VERDICTS.ACCEPTED);
    expect(result.output).toBe('fallback output');
    // Ensure axios.post was called twice
    expect(axios.post).toHaveBeenCalledTimes(2);
  });
});
