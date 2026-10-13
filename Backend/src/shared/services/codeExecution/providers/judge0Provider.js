const { forJudge0 } = require('./javaSource');
const axios = require('axios');
const { normalizeOutput } = require('../normalizeOutput');
const { VERDICTS } = require('../verdicts');
const { LANGUAGE_IDS } = require('../languageMap');

const POLL_INTERVAL_MS = Number(process.env.JUDGE0_POLL_INTERVAL_MS || 800);
const POLL_TIMEOUT_MS = Number(process.env.JUDGE0_POLL_TIMEOUT_MS || 60000);

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

const execute = async ({ requestTimeoutMs, language, code, stdin = '', timeLimitMs = 2000, memoryLimitMb = 256 }) => {
  const deadline = Date.now() + Math.min(requestTimeoutMs || Infinity, POLL_TIMEOUT_MS);
  const JUDGE0_API_URL = (process.env.JUDGE0_API_URL || process.env.JUDGE0_BASE_URL || '').replace(/\/$/, '');
  const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

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
    if (new URL(JUDGE0_API_URL).hostname.endsWith('.rapidapi.com')) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = new URL(JUDGE0_API_URL).hostname;
    } else headers[process.env.JUDGE0_AUTH_HEADER || 'X-Auth-Token'] = JUDGE0_API_KEY;
  }

  const payload = {
    source_code: Buffer.from(language === 'java' ? forJudge0(code) : code, 'utf8').toString('base64'),
    language_id: languageId,
    stdin: Buffer.from(stdin || '', 'utf8').toString('base64'),
    cpu_time_limit: Math.max(0.1, Number(timeLimitMs) / 1000),
    ...(language === 'cpp' ? { compiler_options: '-std=c++17' } : {}),
    memory_limit: Math.max(1, Number(memoryLimitMb) * 1024)
  };

  try {
    const submission = await axios.post(
      `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false`,
      payload,
      { headers, timeout: Math.max(1, Math.min(10000, deadline - Date.now())) }
    );
    
    const token = submission.data?.token;
    if (!token) throw new Error('Execution provider did not return a submission token.');

    let data;
    
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, Math.min(POLL_INTERVAL_MS, Math.max(0, deadline - Date.now()))));
      const response = await axios.get(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
        { headers, timeout: Math.max(1, Math.min(10000, deadline - Date.now())) }
      );
      data = response.data;
      if (!data?.status || typeof data.status.id !== 'number') throw Object.assign(new Error('Malformed Judge0 response'), { serviceReason: 'provider_unavailable' });
      if (![1, 2].includes(data.status.id)) break; // Status 1=In Queue, 2=Processing
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
      compileOutput,
      providerSubmissionId: token,
      exitCode: data.exit_code ?? null,
      runtimeMs: data.time != null && Number.isFinite(Number(data.time)) ? Math.round(Number(data.time) * 1000) : null,
      memoryKb: data.memory != null ? Number(data.memory) : null
    };
  } catch (error) {
    console.error('Judge0 provider error:', error.message);
    throw error;
  }
};

module.exports = { execute };
