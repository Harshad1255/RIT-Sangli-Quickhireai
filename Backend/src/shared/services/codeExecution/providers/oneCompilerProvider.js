const axios = require('axios');
const { normalizeOutput } = require('../normalizeOutput');
const { VERDICTS } = require('../verdicts');

const classifyOneCompilerFailure = (result) => {
  const details = String(result?.exception || result?.stderr || result?.error || '').toLowerCase();
  if (details.includes('timeout') || details.includes('time limit')) return VERDICTS.TIME_LIMIT_EXCEEDED;
  if (details.includes('compil') || details.includes('syntax') || /\berror:\s/.test(details) || details.includes('expected primary-expression')) {
    return VERDICTS.COMPILATION_ERROR;
  }
  if (details) return VERDICTS.RUNTIME_ERROR;
  return result?.status === 'success' ? VERDICTS.ACCEPTED : VERDICTS.EXECUTION_SERVICE_ERROR;
};

const execute = async ({ language, code, stdin = '', timeLimitMs = 2000 }) => {
  const ONECOMPILER_API_URL = process.env.ONECOMPILER_API_URL || 'https://api.onecompiler.com/v1/run';
  const ONECOMPILER_API_KEY = process.env.ONECOMPILER_API_KEY || '';

  if (!ONECOMPILER_API_KEY) {
    throw new Error('ONECOMPILER_API_KEY is not configured');
  }

  const fileNames = { cpp: 'main.cpp', python: 'main.py', javascript: 'main.js', java: 'Main.java' };

  try {
    const response = await axios.post(ONECOMPILER_API_URL, {
      language,
      stdin,
      files: [{ name: fileNames[language] || 'main.txt', content: code }]
    }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ONECOMPILER_API_KEY },
      timeout: timeLimitMs + 5000 // Give some buffer over the code timeout
    });

    const data = response.data || {};
    const verdict = classifyOneCompilerFailure(data);
    const stderr = normalizeOutput(data.stderr || data.exception || data.error || '');
    
    return {
      success: verdict === VERDICTS.ACCEPTED,
      verdict,
      output: normalizeOutput(data.stdout || ''),
      stderr,
      runtimeMs: Number(data.executionTime || 0),
      memoryKb: Number(data.memoryUsed || 0)
    };
  } catch (error) {
    console.error('OneCompiler provider error:', error.message);
    throw error;
  }
};

module.exports = { execute };
