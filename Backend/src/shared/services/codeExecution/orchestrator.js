const { normalizeLanguage } = require('./languageMap');
const { VERDICTS, getWorstVerdict } = require('./verdicts');
const { normalizeOutput } = require('./normalizeOutput');
const { unwrapDriverOutput } = require('../../../features/coding/services/functionDriver');
const judge0Provider = require('./providers/judge0Provider');
const oneCompilerProvider = require('./providers/oneCompilerProvider');

const CODE_EXECUTION_ENABLED = process.env.CODE_EXECUTION_ENABLED === 'true';
const MAX_SOURCE_CODE_LENGTH = Number(process.env.CODE_MAX_SOURCE_LENGTH || 50000);
const DEFAULT_TIME_LIMIT = 2000;
const DEFAULT_MEMORY_LIMIT = 256;

const getProviderFailureReason = (error) => {
  if (error?.serviceReason) return error.serviceReason;
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.response?.status || error?.statusCode);
  if (status === 401 || status === 403) return 'missing_key';
  if (status === 404) return 'missing_url';
  if (status >= 500) return 'provider_5xx';
  if (/api.?key|credential/.test(message)) return 'missing_key';
  if (/api.?url|base url|endpoint/.test(message)) return 'missing_url';
  if (/submission token/.test(message)) return 'misconfigured';
  if (['ECONNABORTED', 'ETIMEDOUT', 'ABORT_ERR'].includes(error?.code) || /timeout|timed out|polling exceeded/.test(message)) return 'timeout';
  if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EHOSTUNREACH', 'EAI_AGAIN', 'ERR_NETWORK'].includes(error?.code) || /network error|connection refused|socket hang up|unreachable/.test(message)) return 'provider_unavailable';
  if (status) return 'provider_unavailable';
  return null;
};

const executionServiceFailure = (serviceReason) => ({
  success: false,
  verdict: VERDICTS.EXECUTION_SERVICE_ERROR,
  code: 'EXECUTION_SERVICE_ERROR',
  serviceReason,
  output: '',
  stderr: '',
  runtimeMs: 0,
  memoryKb: 0
});

const executeSingleRun = async (params) => {
  const primaryProviderName = (process.env.CODE_EXECUTION_PROVIDER || 'judge0').trim().toLowerCase();
  const fallbackProviderName = (process.env.CODE_EXECUTION_FALLBACK_PROVIDER || 'onecompiler').trim().toLowerCase();
  
  const providers = {
    judge0: judge0Provider.execute,
    onecompiler: oneCompilerProvider.execute
  };

  const primaryExecute = providers[primaryProviderName];
  const fallbackExecute = providers[fallbackProviderName];

  if (!primaryExecute) {
    return executionServiceFailure('misconfigured');
  }

  try {
    const result = await primaryExecute(params);
    if (result?.verdict === VERDICTS.EXECUTION_SERVICE_ERROR) {
      throw Object.assign(new Error('Provider returned an unavailable status.'), {
        serviceReason: result.serviceReason || 'provider_unavailable'
      });
    }
    return result;
  } catch (primaryError) {
    let failure = primaryError;
    const primaryFailureReason = getProviderFailureReason(primaryError);
    if (!primaryFailureReason) throw primaryError;
    console.error(`Primary provider (${primaryProviderName}) failed (${primaryFailureReason}).`);
    if (fallbackExecute && primaryProviderName !== fallbackProviderName) {
      console.log(`Failing over to ${fallbackProviderName}.`);
      try {
        const result = await fallbackExecute(params);
        if (result?.verdict === VERDICTS.EXECUTION_SERVICE_ERROR) {
          throw Object.assign(new Error('Fallback provider returned an unavailable status.'), {
            serviceReason: result.serviceReason || 'provider_unavailable'
          });
        }
        return result;
      } catch (fallbackErr) {
        const fallbackFailureReason = getProviderFailureReason(fallbackErr);
        if (!fallbackFailureReason) throw fallbackErr;
        failure = fallbackErr;
        console.error(`Fallback provider (${fallbackProviderName}) failed (${fallbackFailureReason}).`);
      }
    }

    return executionServiceFailure(getProviderFailureReason(failure));
  }
};

const executeCode = async ({ language, code, stdin = '', timeLimitMs = DEFAULT_TIME_LIMIT, memoryLimitMb = DEFAULT_MEMORY_LIMIT }) => {
  if (!CODE_EXECUTION_ENABLED) {
    return executionServiceFailure('disabled');
  }

  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return {
      success: false,
      verdict: VERDICTS.VALIDATION_ERROR,
      output: '',
      stderr: `Unsupported language: ${language}`,
      runtimeMs: 0,
      memoryKb: 0
    };
  }

  if (typeof code !== 'string' || !code.trim()) {
    return {
      success: false,
      verdict: VERDICTS.VALIDATION_ERROR,
      output: '',
      stderr: 'Source code is required.',
      runtimeMs: 0,
      memoryKb: 0
    };
  }

  if (code.length > MAX_SOURCE_CODE_LENGTH) {
    return {
      success: false,
      verdict: VERDICTS.VALIDATION_ERROR,
      output: '',
      stderr: `Source code exceeds the ${MAX_SOURCE_CODE_LENGTH}-character limit.`,
      runtimeMs: 0,
      memoryKb: 0
    };
  }

  const execution = await executeSingleRun({
    language: normalizedLanguage,
    code,
    stdin,
    timeLimitMs,
    memoryLimitMb
  });
  return { ...execution, output: unwrapDriverOutput(code, execution.output) };
};

const judgeSolution = async ({ language, code, testCases = [], timeLimit = DEFAULT_TIME_LIMIT, memoryLimit = DEFAULT_MEMORY_LIMIT, visibleOnly = false }) => {
  const casesToRun = visibleOnly ? testCases.filter(test => !test.isHidden) : testCases;
  
  if (!casesToRun || casesToRun.length === 0) {
    return {
      success: false,
      verdict: VERDICTS.VALIDATION_ERROR,
      passedTests: 0,
      totalTests: 0,
      testResults: [],
      runtime: 0,
      memory: 0
    };
  }

  const results = [];
  let passedCount = 0;
  let overallVerdict = VERDICTS.ACCEPTED;
  let totalRuntime = 0;
  let maxMemory = 0;

  for (const testCase of casesToRun) {
    const execution = await executeCode({
      language,
      code,
      stdin: testCase.input || '',
      timeLimitMs: testCase.timeLimitMs || timeLimit,
      memoryLimitMb: testCase.memoryLimitMb || memoryLimit
    });

    if (execution.verdict === VERDICTS.EXECUTION_SERVICE_ERROR) {
      overallVerdict = VERDICTS.EXECUTION_SERVICE_ERROR;
      // Fail fast on service error
      results.push({
        testCaseId: testCase._id || null,
        input: testCase.isHidden ? 'Hidden Test Case' : (testCase.input || ''),
        expectedOutput: testCase.isHidden ? 'Hidden Expected Output' : normalizeOutput(testCase.expectedOutput),
        actualOutput: execution.output || '',
        stderr: execution.stderr || '',
        passed: false,
        runtime: 0,
        memory: 0,
        isHidden: Boolean(testCase.isHidden)
      });
      return {
        success: false,
        verdict: overallVerdict,
        code: execution.code || 'EXECUTION_SERVICE_ERROR',
        serviceReason: execution.serviceReason || 'provider_unavailable',
        passedTests: passedCount,
        totalTests: casesToRun.length,
        testResults: results,
        runtime: totalRuntime,
        memory: maxMemory
      };
    }

    const actualOutput = execution.output;
    const expectedOutput = normalizeOutput(testCase.expectedOutput);
    const passed = execution.verdict === VERDICTS.ACCEPTED && actualOutput === expectedOutput;
    
    const caseVerdict = passed 
      ? VERDICTS.ACCEPTED 
      : (execution.verdict === VERDICTS.ACCEPTED ? VERDICTS.WRONG_ANSWER : execution.verdict);

    if (passed) passedCount += 1;
    overallVerdict = getWorstVerdict(overallVerdict, caseVerdict);
    
    totalRuntime = Math.max(totalRuntime, execution.runtimeMs || 0);
    maxMemory = Math.max(maxMemory, execution.memoryKb || 0);

    results.push({
      testCaseId: testCase._id || null,
      input: testCase.isHidden ? 'Hidden Test Case' : (testCase.input || ''),
      expectedOutput: testCase.isHidden ? 'Hidden Expected Output' : expectedOutput,
      actualOutput: testCase.isHidden ? (passed ? 'Passed' : 'Failed') : actualOutput,
      stderr: testCase.isHidden ? '' : execution.stderr,
      passed,
      runtime: execution.runtimeMs || 0,
      memory: execution.memoryKb || 0,
      isHidden: Boolean(testCase.isHidden)
    });
  }

  return {
    success: overallVerdict === VERDICTS.ACCEPTED,
    verdict: overallVerdict,
    passedTests: passedCount,
    totalTests: casesToRun.length,
    testResults: results,
    runtime: totalRuntime,
    memory: maxMemory
  };
};

module.exports = {
  executeCode,
  judgeSolution,
  runTestCases: judgeSolution // Alias for backward compatibility
};
