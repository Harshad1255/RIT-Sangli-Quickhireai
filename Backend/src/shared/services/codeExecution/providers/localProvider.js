const { spawn } = require('child_process');
const { normalizeOutput } = require('../normalizeOutput');
const { VERDICTS } = require('../verdicts');
const fs = require('fs');
const path = require('path');
const os = require('os');

const runProcess = ({ command, args = [], stdin = '', timeLimitMs = 2000 }) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    let child;
    try {
      child = spawn(command, args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      return resolve({
        error: err,
        verdict: VERDICTS.EXECUTION_SERVICE_ERROR,
        serviceReason: 'provider_unavailable'
      });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch (_) {}
    }, timeLimitMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        error: err,
        verdict: VERDICTS.EXECUTION_SERVICE_ERROR,
        serviceReason: 'provider_unavailable'
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const elapsed = Date.now() - startTime;

      if (timedOut || signal === 'SIGKILL' || code === 137) {
        return resolve({
          success: false,
          verdict: VERDICTS.TIME_LIMIT_EXCEEDED,
          output: normalizeOutput(stdout),
          stderr: normalizeOutput(stderr || 'Time Limit Exceeded'),
          compileOutput: '',
          exitCode: 137,
          runtimeMs: Math.max(elapsed, timeLimitMs),
          memoryKb: null
        });
      }

      const isError = (code != null && code !== 0) || (stderr && !stdout && /Traceback|Error|Exception/i.test(stderr));

      if (isError) {
        const isCompilation = /SyntaxError|compile|expected/i.test(stderr);
        return resolve({
          success: false,
          verdict: isCompilation ? VERDICTS.COMPILATION_ERROR : VERDICTS.RUNTIME_ERROR,
          output: normalizeOutput(stdout),
          stderr: normalizeOutput(stderr || 'Runtime Error'),
          compileOutput: isCompilation ? normalizeOutput(stderr) : '',
          exitCode: code ?? 1,
          runtimeMs: elapsed,
          memoryKb: null
        });
      }

      return resolve({
        success: true,
        verdict: VERDICTS.ACCEPTED,
        output: normalizeOutput(stdout),
        stderr: normalizeOutput(stderr),
        compileOutput: '',
        exitCode: 0,
        runtimeMs: elapsed,
        memoryKb: null
      });
    });

    if (stdin) {
      try {
        child.stdin.write(stdin);
        child.stdin.end();
      } catch (_) {}
    } else {
      try {
        child.stdin.end();
      } catch (_) {}
    }
  });
};

const execute = async ({ language, code, stdin = '', timeLimitMs = 2000 }) => {
  const normLang = String(language || '').toLowerCase();

  if (normLang === 'javascript' || normLang === 'js') {
    return runProcess({
      command: process.execPath,
      args: ['-e', code],
      stdin,
      timeLimitMs
    });
  }

  if (normLang === 'python' || normLang === 'py') {
    // Try python executable
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const res = await runProcess({
      command: pythonCmd,
      args: ['-c', code],
      stdin,
      timeLimitMs
    });

    if (res.error && res.error.code === 'ENOENT' && process.platform === 'win32') {
      // Try Windows py launcher
      return runProcess({
        command: 'py',
        args: ['-3', '-c', code],
        stdin,
        timeLimitMs
      });
    }

    return res;
  }

  // For compiled languages without local toolchains, declare unavailable to let other providers handle
  throw Object.assign(new Error(`Local execution not available for ${language}`), {
    serviceReason: 'provider_unavailable'
  });
};

module.exports = { execute };
