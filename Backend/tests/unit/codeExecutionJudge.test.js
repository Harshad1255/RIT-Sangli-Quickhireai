process.env.CODE_EXECUTION_ENABLED = 'true';
process.env.CODE_EXECUTION_PROVIDER = 'judge0';
process.env.CODE_EXECUTION_FALLBACK_PROVIDER = 'judge0';
process.env.JUDGE0_API_URL = 'http://mock-provider.invalid';

jest.mock('../../src/shared/services/codeExecution/providers/judge0Provider', () => ({ execute: jest.fn() }));
jest.mock('../../src/shared/services/codeExecution/providers/oneCompilerProvider', () => ({ execute: jest.fn() }));

const { spawnSync } = require('node:child_process');
const judge0Provider = require('../../src/shared/services/codeExecution/providers/judge0Provider');
const { judgeSolution } = require('../../src/shared/services/codeExecution/orchestrator');
const { wrapCodeForExecution } = require('../../src/features/coding/services/functionDriver');

const visibleCases = [
  { input: '[2,7,11,15] 9', expectedOutput: '[0,1]', isSample: true },
  { input: '[3,2,4] 6', expectedOutput: '[1,2]', isSample: true }
];

beforeEach(() => {
  jest.clearAllMocks();
  judge0Provider.execute.mockImplementation(async ({ code, stdin }) => {
    const result = spawnSync(process.execPath, ['-e', code], {
      input: stdin,
      encoding: 'utf8',
      timeout: 2000
    });
    if (result.error?.code === 'ETIMEDOUT') {
      return { success: false, verdict: 'Time Limit Exceeded', output: '', stderr: '', runtimeMs: 2000, memoryKb: 0 };
    }
    if (result.status !== 0) {
      const verdict = /SyntaxError/.test(result.stderr) ? 'Compilation Error' : 'Runtime Error';
      return { success: false, verdict, output: result.stdout || '', stderr: result.stderr || '', runtimeMs: 1, memoryKb: 0 };
    }
    return { success: true, verdict: 'Accepted', output: result.stdout, stderr: result.stderr, runtimeMs: 1, memoryKb: 32 };
  });
});

describe('judgeSolution with a mocked execution provider', () => {
  test('accepts the JavaScript Two Sum fixture for both visible sample cases', async () => {
    const source = `function solve(nums, target) {
  const seen = new Map();
  for (let index = 0; index < nums.length; index += 1) {
    const complement = target - nums[index];
    if (seen.has(complement)) return [seen.get(complement), index];
    seen.set(nums[index], index);
  }
  return [];
}`;

    const result = await judgeSolution({
      language: 'javascript',
      code: wrapCodeForExecution('javascript', source),
      testCases: visibleCases
    });

    expect(result.verdict).toBe('Accepted');
    expect(result.passedTests).toBe(2);
    expect(result.testResults.map(test => test.actualOutput)).toEqual(['[0,1]', '[1,2]']);
  });

  test('returns Wrong Answer for a valid but incorrect function result', async () => {
    const result = await judgeSolution({
      language: 'javascript',
      code: wrapCodeForExecution('javascript', 'function solve(nums, target) { return []; }'),
      testCases: visibleCases
    });

    expect(result.verdict).toBe('Wrong Answer');
    expect(result.passedTests).toBe(0);
  });

  test.each([
    ['Runtime Error', 'function solve() { throw new Error("runtime failure"); }'],
    ['Compilation Error', 'function solve( {']
  ])('maps a %s from the mocked provider', async (expectedVerdict, source) => {
    const result = await judgeSolution({
      language: 'javascript',
      code: wrapCodeForExecution('javascript', source),
      testCases: [visibleCases[0]]
    });

    expect(result.verdict).toBe(expectedVerdict);
  });

  test('maps a timed-out execution to Time Limit Exceeded', async () => {
    const result = await judgeSolution({
      language: 'javascript',
      code: wrapCodeForExecution('javascript', 'function solve() { while (true) {} }'),
      testCases: [visibleCases[0]],
      timeLimit: 2000
    });

    expect(result.verdict).toBe('Time Limit Exceeded');
  });
});
