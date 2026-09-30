const axios = require('axios');
const { normalizeOutput } = require('../normalizeOutput');
const { VERDICTS } = require('../verdicts');
const { LANGUAGE_IDS } = require('../languageMap');

const POLL_INTERVAL_MS = Number(process.env.JUDGE0_POLL_INTERVAL_MS || 800);
const POLL_TIMEOUT_MS = Number(process.env.JUDGE0_POLL_TIMEOUT_MS || 15000);

const decodeBase64 = (value) => {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch (_) {
    return String(value);
  }
};

const mapProviderStatus = (statusId) => {
  switch (statusId) {
    case 3: return VERDICTS.ACCEPTED;
    case 4: return VERDICTS.WRONG_ANSWER;
    case 5: return VERDICTS.TIME_LIMIT_EXCEEDED;
    case 6: return VERDICTS.COMPILATION_ERROR;
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12: return VERDICTS.RUNTIME_ERROR;
    case 13:
    case 14: return VERDICTS.EXECUTION_SERVICE_ERROR;
    default: return VERDICTS.EXECUTION_SERVICE_ERROR;
  }
};

const execute = async ({ language, code, stdin = '', timeLimitMs = 2000, memoryLimitMb = 256 }) => {
  const JUDGE0_API_URL = (process.env.JUDGE0_API_URL || process.env.JUDGE0_BASE_URL || '').replace(/\/$/, '');
  const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
  const JUDGE0_HOST = process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';

  if (!JUDGE0_API_URL) {
    throw new Error('JUDGE0_API_URL is not configured');
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return {
      success: false,
      verdict: VERDICTS.VALIDATION_ERROR,
      output: '',
      stderr: `Unsupported language: ${language}`,
      runtimeMs: 0,
      memoryKb: 0
    };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = JUDGE0_HOST;
  }

  const payload = {
    source_code: Buffer.from(code, 'utf8').toString('base64'),
    language_id: languageId,
    stdin: Buffer.from(stdin || '', 'utf8').toString('base64'),
    cpu_time_limit: Math.max(0.1, Number(timeLimitMs) / 1000),
    memory_limit: Math.max(1, Number(memoryLimitMb) * 1024)
  };

  try {
    const submission = await axios.post(
      `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false`,
      payload,
      { headers, timeout: 10000 }
    );
    
    const token = submission.data?.token;
    if (!token) throw new Error('Execution provider did not return a submission token.');

    const startedAt = Date.now();
    let data;
    
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const response = await axios.get(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
        { headers, timeout: 10000 }
      );
      data = response.data;
      if (!data?.status || ![1, 2].includes(data.status.id)) break; // Status 1=In Queue, 2=Processing
    }

    if (!data || !data.status || [1, 2].includes(data.status.id)) {
      throw new Error(`Provider polling exceeded ${POLL_TIMEOUT_MS}ms timeout.`);
    }

    const stdout = decodeBase64(data.stdout);
    const stderr = decodeBase64(data.stderr);
    const compileOutput = decodeBase64(data.compile_output);
    const verdict = mapProviderStatus(data.status.id);

    return {
      success: verdict === VERDICTS.ACCEPTED,
      verdict,
      output: normalizeOutput(stdout),
      stderr: normalizeOutput(stderr || compileOutput),
      runtimeMs: data.time ? Math.round(Number(data.time) * 1000) : 0,
      memoryKb: Number(data.memory || 0)
    };
  } catch (error) {
    console.error('Judge0 provider error:', error.message);
    throw error;
  }
};

module.exports = { execute };
