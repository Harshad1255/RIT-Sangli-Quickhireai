const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const vm = require('vm');

const TEMP_DIR = path.join(os.tmpdir(), 'quickhire_exec');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const COMPILE_TIMEOUTS = {
  cpp: 20000,
  java: 30000
};

function killProcessTree(pid) {
  try {
    if (os.platform() === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (e) {
    // Ignore error if process is already dead
  }
}

class LocalExecutionService {
  normalizeLanguage(language) {
    const lang = String(language).toLowerCase().trim();
    if (lang === 'c++' || lang === 'cpp' || lang === 'c') return 'cpp';
    if (lang === 'java') return 'java';
    if (lang === 'python' || lang === 'py' || lang === 'python3') return 'python';
    if (lang === 'javascript' || lang === 'js' || lang === 'node') return 'javascript';
    return lang;
  }

  async judgeSolution({ language, code, testCases = [], timeLimit = 2000, memoryLimit = 256, visibleOnly = false }) {
    const lang = this.normalizeLanguage(language);
    const casesToRun = visibleOnly ? testCases.filter(test => !test.isHidden) : testCases;
    
    if (casesToRun.length === 0) {
      return {
        success: false,
        status: 'Validation Error',
        verdict: 'Validation Error',
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        runtime: 0,
        memory: 0,
        executionTimeMs: 0
      };
    }

    let executablePath = null;
    let className = null;
    let tempDir = path.join(TEMP_DIR, crypto.randomBytes(8).toString('hex'));
    
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Phase 1: Compilation
      if (lang === 'cpp') {
        const srcPath = path.join(tempDir, 'main.cpp');
        executablePath = path.join(tempDir, os.platform() === 'win32' ? 'main.exe' : 'main');
        fs.writeFileSync(srcPath, code);
        
        const compileResult = await this.compileCode(`g++ "${srcPath}" -o "${executablePath}" -O2`, COMPILE_TIMEOUTS.cpp);
        if (!compileResult.success) {
          return this.createCompilationErrorResult(compileResult.error, casesToRun);
        }
      } else if (lang === 'java') {
        className = this.extractJavaClassName(code) || 'Main';
        const srcPath = path.join(tempDir, `${className}.java`);
        fs.writeFileSync(srcPath, code);
        
        const compileResult = await this.compileCode(`javac "${srcPath}"`, COMPILE_TIMEOUTS.java);
        if (!compileResult.success) {
          return this.createCompilationErrorResult(compileResult.error, casesToRun);
        }
      } else if (lang === 'python') {
        executablePath = path.join(tempDir, 'main.py');
        fs.writeFileSync(executablePath, code);
      }

      // Phase 2: Execution
      const results = [];
      let passedCount = 0;
      let overallVerdict = 'Accepted';
      let maxMemory = 0;
      let totalRuntime = 0;
      
      for (const tc of casesToRun) {
        const tl = tc.timeLimitMs || timeLimit || 2000;
        const execResult = await this.executeTestCase(lang, executablePath, className, tempDir, code, tc.input, tl);
        
        const actualOutput = this.normalize(execResult.stdout);
        const expectedOutput = this.normalize(tc.expectedOutput);
        let passed = false;
        let caseVerdict = execResult.status;

        if (execResult.status === 'Accepted') {
          if (actualOutput === expectedOutput) {
            passed = true;
            passedCount++;
          } else {
            caseVerdict = 'Wrong Answer';
          }
        }

        if (this.priority(caseVerdict) > this.priority(overallVerdict)) {
          overallVerdict = caseVerdict;
        }

        totalRuntime = Math.max(totalRuntime, execResult.executionTimeMs);
        maxMemory = Math.max(maxMemory, execResult.memoryKb || 0);

        results.push({
          testCaseId: tc._id || null,
          input: tc.isHidden ? 'Hidden Test Case' : (tc.input || ''),
          expectedOutput: tc.isHidden ? 'Hidden Expected Output' : expectedOutput,
          actualOutput: tc.isHidden ? (passed ? 'Passed' : 'Failed') : actualOutput,
          stderr: tc.isHidden ? '' : execResult.stderr,
          passed,
          isPassed: passed,
          runtime: execResult.executionTimeMs,
          timeMs: execResult.executionTimeMs,
          memoryKb: execResult.memoryKb,
          memory: execResult.memoryKb,
          isSample: tc.isSample || !tc.isHidden,
          isHidden: Boolean(tc.isHidden)
        });
      }

      return {
        success: overallVerdict === 'Accepted',
        status: overallVerdict,
        verdict: overallVerdict,
        passedTests: passedCount,
        testcasesPassed: passedCount,
        totalTests: casesToRun.length,
        totalTestcases: casesToRun.length,
        executionTimeMs: totalRuntime,
        runtime: totalRuntime,
        memoryUsageKb: maxMemory,
        memory: maxMemory,
        errorMessage: overallVerdict === 'Compilation Error' ? 'Compilation error' : '',
        results,
        testResults: results
      };
      
    } catch (err) {
      return {
        success: false,
        status: 'Internal Execution Error',
        verdict: 'Internal Execution Error',
        passedTests: 0,
        testcasesPassed: 0,
        totalTests: casesToRun.length,
        totalTestcases: casesToRun.length,
        errorMessage: err.message,
        results: [],
        testResults: [],
        runtime: 0,
        memory: 0
      };
    } finally {
      // Cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  compileCode(command, timeoutMs) {
    return new Promise((resolve) => {
      const child = exec(command, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            return resolve({ success: false, error: 'Compilation Time Limit Exceeded' });
          }
          return resolve({ success: false, error: stderr || stdout || error.message });
        }
        resolve({ success: true });
      });
    });
  }

  executeTestCase(language, executablePath, className, tempDir, rawCode, input, timeLimitMs) {
    if (language === 'javascript') {
      return this.runJsVM(rawCode, input, timeLimitMs);
    }

    return new Promise((resolve) => {
      let command;
      let args = [];
      if (language === 'cpp') {
        command = executablePath;
      } else if (language === 'java') {
        command = 'java';
        args = ['-cp', tempDir, className];
      } else if (language === 'python') {
        command = os.platform() === 'win32' ? 'python' : 'python3';
        args = [executablePath];
      } else {
        return resolve({ status: 'Validation Error', stdout: '', stderr: 'Unsupported language', executionTimeMs: 0, memoryKb: 0 });
      }

      const start = process.hrtime.bigint();
      
      const child = spawn(command, args, {
        detached: os.platform() !== 'win32',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      if (input) {
        child.stdin.write(input);
      }
      child.stdin.end();

      const timeoutId = setTimeout(() => {
        killProcessTree(child.pid);
      }, timeLimitMs);

      child.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        const end = process.hrtime.bigint();
        const durationMs = Number((end - start) / 1000000n);
        
        let status = 'Accepted';
        if (signal === 'SIGKILL' || signal === 'SIGTERM' || durationMs >= timeLimitMs) {
          status = 'Time Limit Exceeded';
        } else if (code !== 0) {
          status = 'Runtime Error';
        }

        resolve({
          status,
          stdout,
          stderr,
          executionTimeMs: durationMs,
          memoryKb: null // Unknown for external process without advanced wrapper
        });
      });
      
      child.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          status: 'Runtime Error',
          stdout: '',
          stderr: err.message,
          executionTimeMs: 0,
          memoryKb: null
        });
      });
    });
  }

  async runJsVM(code, inputStr, timeLimitMs) {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      try {
        const logs = [];
        const sandbox = {
          console: {
            log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
            error: (...args) => logs.push(args.join(' ')),
          },
          Math, JSON, parseInt, parseFloat, Array, Object, String, Number, Boolean, Set, Map
        };

        let inputSetup = '';
        let funcArgs = '';
        if (inputStr) {
          // Naive JS input parsing for standard leetcode-style: "nums = [2,7,11,15], target = 9"
          const parts = inputStr.split('=').map(s => s.trim());
          if (parts.length > 1) {
            const lines = inputStr.split(',').map(p => p.trim());
            for (const p of lines) {
              if (p.includes('=')) {
                inputSetup += `const ${p};\n`;
              }
            }
            funcArgs = lines.map(p => p.split('=')[0].trim()).join(', ');
          }
        }

        let invokeScript = `
          ${inputSetup}
          ${code}
          if (typeof solve === 'function') {
            const res = solve(${funcArgs});
            if (res !== undefined) {
              console.log(typeof res === 'object' ? JSON.stringify(res) : String(res));
            }
          }
        `;

        const context = vm.createContext(sandbox);
        const script = new vm.Script(invokeScript);
        
        script.runInContext(context, { timeout: timeLimitMs });

        const end = process.hrtime.bigint();
        const durationMs = Number((end - start) / 1000000n);

        resolve({
          status: 'Accepted',
          stdout: logs.join('\n').trim(),
          stderr: '',
          executionTimeMs: durationMs,
          memoryKb: null
        });
      } catch (err) {
        const end = process.hrtime.bigint();
        const durationMs = Number((end - start) / 1000000n);

        let status = 'Runtime Error';
        if (err.message && err.message.includes('Script execution timed out')) {
          status = 'Time Limit Exceeded';
        }

        resolve({
          status,
          stdout: '',
          stderr: err.message || 'JavaScript runtime error',
          executionTimeMs: durationMs,
          memoryKb: null
        });
      }
    });
  }

  extractJavaClassName(code) {
    const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    return match ? match[1] : 'Main';
  }

  normalize(output) {
    return String(output || '').replace(/\r\n/g, '\n').trim();
  }

  priority(verdict) {
    const p = {
      'Accepted': 0,
      'Wrong Answer': 1,
      'Compilation Error': 2,
      'Runtime Error': 3,
      'Time Limit Exceeded': 4,
      'Internal Execution Error': 5,
      'Validation Error': 6
    };
    return p[verdict] || 7;
  }

  createCompilationErrorResult(errorMsg, testCases) {
    return {
      success: false,
      status: 'Compilation Error',
      verdict: 'Compilation Error',
      passedTests: 0,
      testcasesPassed: 0,
      totalTests: testCases.length,
      totalTestcases: testCases.length,
      executionTimeMs: 0,
      runtime: 0,
      memoryUsageKb: 0,
      memory: 0,
      errorMessage: errorMsg,
      results: testCases.map(tc => ({
        input: tc.isHidden ? 'Hidden Test Case' : tc.input,
        expectedOutput: tc.isHidden ? 'Hidden Expected Output' : tc.expectedOutput,
        actualOutput: 'Compilation Error',
        stderr: errorMsg,
        passed: false,
        isPassed: false,
        runtime: 0,
        timeMs: 0,
        memoryKb: null,
        memory: null,
        isSample: tc.isSample || !tc.isHidden,
        isHidden: Boolean(tc.isHidden)
      })),
      testResults: testCases.map(tc => ({
        testCaseId: tc._id || null,
        input: tc.isHidden ? 'Hidden Test Case' : tc.input,
        expectedOutput: tc.isHidden ? 'Hidden Expected Output' : tc.expectedOutput,
        actualOutput: 'Compilation Error',
        stderr: errorMsg,
        passed: false,
        runtime: 0,
        memory: null,
        isSample: tc.isSample || !tc.isHidden,
        isHidden: Boolean(tc.isHidden)
      }))
    };
  }
}

module.exports = new LocalExecutionService();
