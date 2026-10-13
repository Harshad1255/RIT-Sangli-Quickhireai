const axios = require('axios');
const { normalizeOutput } = require('../normalizeOutput');
const { VERDICTS } = require('../verdicts');
const { className: javaClassName } = require('./javaSource');

const PISTON_LANGUAGES = {
  python: { language: 'python', version: '*', extension: 'py' },
  javascript: { language: 'javascript', version: '*', extension: 'js' },
  java: { language: 'java', version: '*', extension: 'java' },
  cpp: { language: 'c++', version: '*', extension: 'cpp' },
  c: { language: 'c', version: '*', extension: 'c' },
  go: { language: 'go', version: '*', extension: 'go' },
  rust: { language: 'rust', version: '*', extension: 'rs' },
  sql: { language: 'sqlite3', version: '*', extension: 'sql' }
};

const execute = async ({ language, code, stdin = '', requestTimeoutMs = 30000, timeLimitMs = 2000 }) => {
  const PISTON_API_URL = (process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute').replace(/\/$/, '');
  const config = PISTON_LANGUAGES[language];

  if (!config) {
    return {
      success: false,
      verdict: VERDICTS.VALIDATION_ERROR,
      output: '',
      stderr: `Unsupported language: ${language}`,
      runtimeMs: 0,
      memoryKb: 0
    };
  }

  let fileName = `main.${config.extension}`;
  let sourceCode = code;

  if (language === 'java') {
    const publicClass = javaClassName(code);
    fileName = `${publicClass}.java`;
  }

  const payload = {
    language: config.language,
    version: config.version,
    files: [
      {
        name: fileName,
        content: sourceCode
      }
    ],
    stdin: stdin || '',
    run_timeout: Math.max(1000, Math.min(10000, Number(timeLimitMs) || 3000)),
    compile_timeout: 10000
  };

  const timeoutMs = Math.max(1000, Math.min(requestTimeoutMs || 30000, 30000));
  const startTime = Date.now();

  try {
    const response = await axios.post(PISTON_API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs
    });

    const elapsed = Date.now() - startTime;
    const data = response.data;

    if (!data || (!data.run && !data.compile)) {
      throw Object.assign(new Error('Malformed Piston response'), { serviceReason: 'provider_unavailable' });
    }

    // 1. Check compilation errors (for C++, Java, C, etc.)
    if (data.compile && data.compile.code != null && data.compile.code !== 0) {
      const compileErr = normalizeOutput(data.compile.output || data.compile.stderr || '');
      return {
        success: false,
        verdict: VERDICTS.COMPILATION_ERROR,
        output: '',
        stderr: compileErr,
        compileOutput: compileErr,
        exitCode: data.compile.code,
        runtimeMs: elapsed,
        memoryKb: null
      };
    }

    const run = data.run || {};
    const stdout = normalizeOutput(run.stdout || run.output || '');
    const stderr = normalizeOutput(run.stderr || '');
    const combined = run.output || '';

    // 2. Check for Time Limit Exceeded
    const isTimeout = run.signal === 'SIGKILL' ||
      run.code === 137 ||
      /timed out|time limit exceeded/i.test(stderr) ||
      /timed out|time limit exceeded/i.test(combined);

    if (isTimeout) {
      return {
        success: false,
        verdict: VERDICTS.TIME_LIMIT_EXCEEDED,
        output: stdout,
        stderr: stderr || 'Time Limit Exceeded',
        compileOutput: '',
        exitCode: run.code ?? 137,
        runtimeMs: Math.max(elapsed, Number(timeLimitMs) || 2000),
        memoryKb: null
      };
    }

    // 3. Check for Runtime Error
    const isRuntimeError = (run.code != null && run.code !== 0) ||
      run.signal === 'SIGSEGV' ||
      run.code === 139 ||
      (stderr && !stdout && /Traceback|Error|Exception|Segmentation fault/i.test(stderr));

    if (isRuntimeError) {
      return {
        success: false,
        verdict: VERDICTS.RUNTIME_ERROR,
        output: stdout,
        stderr: stderr || 'Runtime Error',
        compileOutput: '',
        exitCode: run.code ?? 1,
        runtimeMs: elapsed,
        memoryKb: null
      };
    }

    // 4. Accepted
    return {
      success: true,
      verdict: VERDICTS.ACCEPTED,
      output: stdout,
      stderr: stderr,
      compileOutput: '',
      exitCode: 0,
      runtimeMs: elapsed,
      memoryKb: null
    };
  } catch (error) {
    console.error('Piston execution error:', error.message);
    const serviceReason = error.code === 'ECONNABORTED' || /timeout/i.test(error.message)
      ? 'timeout'
      : (error.response?.status >= 500 ? 'provider_5xx' : 'provider_unavailable');
    throw Object.assign(new Error(`Piston error: ${error.message}`), { serviceReason });
  }
};

module.exports = { execute };
