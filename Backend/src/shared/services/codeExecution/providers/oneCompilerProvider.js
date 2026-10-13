const { className: javaClassName } = require('./javaSource');
const axios = require('axios');
const { normalizeOutput } = require('../normalizeOutput');
const { VERDICTS } = require('../verdicts');
const metric = value => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const classify = data => {
  const apiError = String(data.error || '');
  if (data.status === 'failed' || apiError) {
    const reason = /E00[34]|token|key/i.test(apiError) ? 'missing_key' : /E002|quota|rate/i.test(apiError) ? 'rate_limit' : /E001|timed.?out/i.test(apiError) ? 'timeout' : 'misconfigured';
    throw Object.assign(new Error('OneCompiler API failure: ' + apiError), { serviceReason: reason });
  }
  if (data.status !== 'success' || !('stdout' in data || 'stderr' in data || 'exception' in data)) throw Object.assign(new Error('Malformed OneCompiler response'), { serviceReason: 'provider_unavailable' });
  const exception = String(data.exception || '');
  const details = String(data.stderr || '');
  if (/timeout|time limit/i.test(exception)) return VERDICTS.TIME_LIMIT_EXCEEDED;
  if (/compil|syntax/i.test(exception) || /SyntaxError|error:|expected primary-expression|cannot find symbol/i.test(details)) return VERDICTS.COMPILATION_ERROR;
  if (exception || (data.exitCode != null && data.exitCode !== 0) || /Traceback|Exception in thread|Segmentation fault|ReferenceError|TypeError/i.test(details)) return VERDICTS.RUNTIME_ERROR;
  return VERDICTS.ACCEPTED;
};
const execute = async ({ language, code, stdin = '', requestTimeoutMs, timeLimitMs = 2000 }) => {
  const url = process.env.ONECOMPILER_API_URL || 'https://api.onecompiler.org/v1/run';
  const key = process.env.ONECOMPILER_API_KEY || '';
  if (!key) throw new Error('ONECOMPILER_API_KEY is not configured');
  const className = javaClassName(code);
  const names = { c:'main.c', go:'main.go', rust:'main.rs', kotlin:'Main.kt', sql:'main.sql', cpp:'main.cpp', python:'main.py', javascript:'main.js', java:className + '.java' };
  if (!names[language]) return { verdict: VERDICTS.VALIDATION_ERROR, output:'', stderr:'Unsupported language', runtimeMs:null, memoryKb:null };
  const response = await axios.post(url, { language: language === "sql" ? "sqlite" : language, stdin, files:[{name:names[language],content:code}] }, { headers:{'Content-Type':'application/json','X-API-Key':key}, timeout:Math.min(requestTimeoutMs || Infinity, Number(process.env.ONECOMPILER_REQUEST_TIMEOUT_MS || 60000)) });
  const data = response.data || {};
  let verdict = classify(data);
  if (verdict === VERDICTS.ACCEPTED && metric(data.executionTime) != null && metric(data.executionTime) > timeLimitMs) verdict = VERDICTS.TIME_LIMIT_EXCEEDED;
  return { success:verdict === VERDICTS.ACCEPTED, verdict, output:normalizeOutput(data.stdout || ''), stderr:normalizeOutput(data.stderr || data.exception || ''), compileOutput:verdict === VERDICTS.COMPILATION_ERROR ? normalizeOutput(data.stderr || data.exception || '') : '', compilationTimeMs:metric(data.compilationTime), runtimeMs:metric(data.executionTime), memoryKb:metric(data.memoryUsed), exitCode:metric(data.exitCode) };
};
module.exports = { execute };
