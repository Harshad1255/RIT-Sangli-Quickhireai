const axios = require('axios');
const { LANGUAGES } = require('../constants/categories');

// Judge0 API configuration (matches GEMINI_API_KEY pattern in .env)
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_HOST = process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';
const PISTON_API = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

const JUDGE0_LANGUAGE_IDS = {
  javascript: 63, // Node.js 12.14.0
  python: 71,     // Python 3.8.1
  java: 62,       // Java OpenJDK 13.0.1
  cpp: 54,        // C++ GCC 9.2.0
  c: 50           // C GCC 9.2.0
};

const normalizeOutput = (output) => {
  if (!output) return '';
  return output.toString().trim().replace(/\r\n/g, '\n').replace(/\s+$/gm, '');
};

const executeWithJudge0 = async ({ language, code, stdin = '', timeLimitMs = 2000, memoryLimitMb = 256 }) => {
  const languageId = JUDGE0_LANGUAGE_IDS[language.toLowerCase()] || 63;
  
  const headers = {
    'Content-Type': 'application/json'
  };
  if (JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = JUDGE0_HOST;
  }

  const payload = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: languageId,
    stdin: Buffer.from(stdin).toString('base64'),
    cpu_time_limit: timeLimitMs / 1000,
    memory_limit: memoryLimitMb * 1024
  };

  try {
    const submissionRes = await axios.post(
      `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`,
      payload,
      { headers, timeout: timeLimitMs + 5000 }
    );

    const data = submissionRes.data;
    const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf8') : '';
    const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf8') : '';
    const compileOutput = data.compile_output ? Buffer.from(data.compile_output, 'base64').toString('utf8') : '';
    const timeMs = data.time ? parseFloat(data.time) * 1000 : 0;
    const memoryKb = data.memory || 0;

    let verdict = 'Accepted';
    if (data.status) {
      if (data.status.id === 6) verdict = 'Compilation Error';
      else if (data.status.id === 5) verdict = 'Time Limit Exceeded';
      else if (data.status.id >= 7) verdict = 'Runtime Error';
      else if (data.status.id === 4) verdict = 'Wrong Answer';
    }

    return {
      success: true,
      verdict,
      output: normalizeOutput(stdout),
      stderr: normalizeOutput(stderr),
      logs: normalizeOutput(compileOutput || stderr),
      runtime: Math.round(timeMs),
      memory: Math.round(memoryKb)
    };
  } catch (error) {
    console.warn('Judge0 API call failed, falling back to Piston sandbox:', error.message);
    return await executeWithPiston({ language, code, stdin, timeLimitMs });
  }
};

const executeWithPiston = async ({ language, code, stdin = '', timeLimitMs = 2000 }) => {
  const langMap = {
    javascript: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'c++',
    c: 'c'
  };
  const pistonLang = langMap[language.toLowerCase()] || 'javascript';

  try {
    const response = await axios.post(`${PISTON_API}/execute`, {
      language: pistonLang,
      version: '*',
      files: [{ name: pistonLang === 'java' ? 'Main.java' : `main.${language}`, content: code }],
      stdin,
      run_timeout: timeLimitMs
    }, { timeout: timeLimitMs + 5000 });

    const result = response.data;
    const compileOutput = result.compile?.output || result.compile?.stderr || '';
    const runOutput = result.run?.output || '';
    const runStderr = result.run?.stderr || '';
    const runtime = result.run?.runtime || 0;
    const memory = result.run?.memory || 0;

    if (result.compile && result.compile.code !== 0 && result.compile.code !== undefined) {
      return {
        success: false,
        verdict: 'Compilation Error',
        output: normalizeOutput(compileOutput || runStderr),
        runtime,
        memory,
        logs: compileOutput + runStderr
      };
    }

    return {
      success: true,
      verdict: 'Accepted',
      output: normalizeOutput(runOutput),
      stderr: normalizeOutput(runStderr),
      logs: compileOutput + runStderr,
      runtime,
      memory
    };
  } catch (error) {
    return {
      success: false,
      verdict: 'Runtime Error',
      output: '',
      stderr: error.message,
      logs: error.message,
      runtime: 0,
      memory: 0
    };
  }
};

const executeCode = async ({ language, code, stdin = '', timeLimit = 2000, memoryLimit = 256 }) => {
  if (JUDGE0_API_KEY) {
    return await executeWithJudge0({
      language,
      code,
      stdin,
      timeLimitMs: timeLimit,
      memoryLimitMb: memoryLimit
    });
  } else {
    return await executeWithPiston({
      language,
      code,
      stdin,
      timeLimitMs: timeLimit
    });
  }
};

const judgeSolution = async ({ language, code, testCases = [], timeLimit = 2000, memoryLimit = 256 }) => {
  const results = [];
  let passedCount = 0;
  let overallVerdict = 'Accepted';
  let totalRuntime = 0;
  let maxMemory = 0;

  for (const tc of testCases) {
    const execResult = await executeCode({
      language,
      code,
      stdin: tc.input || '',
      timeLimit: tc.timeLimitMs || timeLimit,
      memoryLimit: tc.memoryLimitMb || memoryLimit
    });

    const actualOutput = normalizeOutput(execResult.output);
    const expectedOutput = normalizeOutput(tc.expectedOutput);
    const passed = execResult.verdict === 'Accepted' && actualOutput === expectedOutput;

    if (passed) {
      passedCount++;
    } else if (overallVerdict === 'Accepted') {
      if (execResult.verdict !== 'Accepted') {
        overallVerdict = execResult.verdict;
      } else {
        overallVerdict = 'Wrong Answer';
      }
    }

    totalRuntime = Math.max(totalRuntime, execResult.runtime || 0);
    maxMemory = Math.max(maxMemory, execResult.memory || 0);

    results.push({
      testCaseId: tc._id || null,
      input: tc.isHidden ? 'Hidden Test Case' : (tc.input || ''),
      expectedOutput: tc.isHidden ? 'Hidden Expected Output' : expectedOutput,
      actualOutput: tc.isHidden ? (passed ? 'Passed' : 'Failed') : actualOutput,
      passed,
      runtime: execResult.runtime || 0,
      memory: execResult.memory || 0,
      isSample: tc.isSample || !tc.isHidden,
      isHidden: tc.isHidden || false
    });
  }

  return {
    verdict: overallVerdict,
    passedCount,
    totalCount: testCases.length,
    testResults: results,
    runtimeMs: totalRuntime,
    memoryMb: maxMemory
  };
};

module.exports = {
  executeCode,
  judgeSolution,
  normalizeOutput
};
