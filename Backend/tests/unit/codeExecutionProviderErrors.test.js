process.env.CODE_EXECUTION_ENABLED = 'true';
process.env.CODE_EXECUTION_PROVIDER = 'judge0';
process.env.CODE_EXECUTION_FALLBACK_PROVIDER = 'judge0';
process.env.JUDGE0_API_URL = 'http://mock-provider.invalid';

jest.mock('../../src/shared/services/codeExecution/providers/judge0Provider', () => ({ execute: jest.fn() }));
jest.mock('../../src/shared/services/codeExecution/providers/oneCompilerProvider', () => ({ execute: jest.fn() }));

const judge0Provider = require('../../src/shared/services/codeExecution/providers/judge0Provider');
const { executeCode } = require('../../src/shared/services/codeExecution/orchestrator');
const { VERDICTS } = require('../../src/shared/services/codeExecution/verdicts');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CODE_EXECUTION_FALLBACK_PROVIDER = 'judge0';
});

describe('execution provider error classification', () => {
  test('classifies provider timeouts as infrastructure errors', async () => {
    judge0Provider.execute.mockRejectedValue(Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' }));

    const result = await executeCode({ language: 'javascript', code: 'console.log(1)' });

    expect(result.verdict).toBe(VERDICTS.EXECUTION_SERVICE_ERROR);
    expect(result.serviceReason).toBe('timeout');
  });

  test('classifies provider 5xx responses as infrastructure errors', async () => {
    judge0Provider.execute.mockRejectedValue(Object.assign(new Error('provider failed'), { response: { status: 503 } }));

    const result = await executeCode({ language: 'javascript', code: 'console.log(1)' });

    expect(result.verdict).toBe(VERDICTS.EXECUTION_SERVICE_ERROR);
    expect(result.serviceReason).toBe('provider_5xx');
  });

  test('classifies missing provider credentials without exposing values', async () => {
    judge0Provider.execute.mockRejectedValue(new Error('JUDGE0_API_KEY is not configured'));

    const result = await executeCode({ language: 'javascript', code: 'console.log(1)' });

    expect(result.verdict).toBe(VERDICTS.EXECUTION_SERVICE_ERROR);
    expect(result.serviceReason).toBe('missing_key');
    expect(JSON.stringify(result)).not.toContain('not configured');
  });

  test('classifies provider authentication rejection as a missing key', async () => {
    judge0Provider.execute.mockRejectedValue(Object.assign(new Error('unauthorized'), { response: { status: 401 } }));

    const result = await executeCode({ language: 'javascript', code: 'console.log(1)' });

    expect(result.verdict).toBe(VERDICTS.EXECUTION_SERVICE_ERROR);
    expect(result.serviceReason).toBe('missing_key');
  });

  test('lets unexpected provider-adapter bugs propagate as server exceptions', async () => {
    judge0Provider.execute.mockRejectedValue(new TypeError('internal adapter bug'));

    await expect(executeCode({ language: 'javascript', code: 'console.log(1)' }))
      .rejects.toThrow('internal adapter bug');
  });

  test('reports disabled code execution with the disabled reason', async () => {
    const enabled = process.env.CODE_EXECUTION_ENABLED;
    let disabledExecuteCode;
    process.env.CODE_EXECUTION_ENABLED = 'false';
    try {
      jest.isolateModules(() => {
        disabledExecuteCode = require('../../src/shared/services/codeExecution/orchestrator').executeCode;
      });
      const result = await disabledExecuteCode({ language: 'javascript', code: 'console.log(1)' });

      expect(result.verdict).toBe(VERDICTS.EXECUTION_SERVICE_ERROR);
      expect(result.serviceReason).toBe('disabled');
    } finally {
      process.env.CODE_EXECUTION_ENABLED = enabled;
    }
  });
});
