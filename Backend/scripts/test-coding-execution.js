// Self-contained test script for QuickHire AI Coding Execution Engine
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { executeCode, judgeSolution } = require('../src/shared/services/codeExecution');
const { wrapCodeForExecution } = require('../src/features/coding/services/functionDriver');

async function runAllTests() {
  console.log('=== QUICKHIRE AI CODING EXECUTION VERIFICATION SUITE ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED:', err.message);
      failed++;
    }
  }

  // Test 1: Python Hello World
  await test('Python basic execution', async () => {
    const res = await executeCode({
      language: 'python',
      code: 'print("Hello from Python")',
      stdin: ''
    });
    if (res.verdict !== 'Accepted' || !res.output.includes('Hello from Python')) {
      throw new Error(`Expected Accepted with "Hello from Python", got ${res.verdict}: ${res.output || res.stderr}`);
    }
  });

  // Test 2: Python with standard input
  await test('Python with custom stdin', async () => {
    const res = await executeCode({
      language: 'python',
      code: 'import sys\nval = int(sys.stdin.read().strip())\nprint(val * 2)',
      stdin: '21'
    });
    if (res.verdict !== 'Accepted' || res.output.trim() !== '42') {
      throw new Error(`Expected 42, got ${res.verdict}: "${res.output}" (stderr: ${res.stderr})`);
    }
  });

  // Test 3: JavaScript execution
  await test('JavaScript execution', async () => {
    const res = await executeCode({
      language: 'javascript',
      code: 'console.log(7 * 6);',
      stdin: ''
    });
    if (res.verdict !== 'Accepted' || res.output.trim() !== '42') {
      throw new Error(`Expected 42, got ${res.verdict}: "${res.output}" (stderr: ${res.stderr})`);
    }
  });

  // Test 4: C++ execution
  await test('C++ execution', async () => {
    const res = await executeCode({
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\nint main() { cout << 12345 << endl; return 0; }',
      stdin: ''
    });
    if (res.verdict !== 'Accepted' || res.output.trim() !== '12345') {
      throw new Error(`Expected 12345, got ${res.verdict}: "${res.output}" (stderr: ${res.stderr})`);
    }
  });

  // Test 5: Java execution
  await test('Java execution', async () => {
    const res = await executeCode({
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Java Works");\n  }\n}',
      stdin: ''
    });
    if (res.verdict !== 'Accepted' || !res.output.includes('Java Works')) {
      throw new Error(`Expected "Java Works", got ${res.verdict}: "${res.output}" (stderr: ${res.stderr})`);
    }
  });

  // Test 6: Compilation error detection
  await test('Compilation error detection (C++)', async () => {
    const res = await executeCode({
      language: 'cpp',
      code: '#include <iostream>\nint main() { cout << missing_semicolon return 0; }',
      stdin: ''
    });
    if (res.verdict !== 'Compilation Error') {
      throw new Error(`Expected Compilation Error, got ${res.verdict}`);
    }
  });

  // Test 7: Runtime error detection (Python ZeroDivisionError)
  await test('Runtime error detection (Python ZeroDivision)', async () => {
    const res = await executeCode({
      language: 'python',
      code: 'print(1 / 0)',
      stdin: ''
    });
    if (res.verdict !== 'Runtime Error') {
      throw new Error(`Expected Runtime Error, got ${res.verdict}`);
    }
  });

  // Test 8: Test case judging and partial scoring
  await test('Test case judging with partial scoring', async () => {
    const judgeRes = await judgeSolution({
      language: 'python',
      code: 'import sys\nn = int(sys.stdin.read().strip())\nprint(n * 2)',
      testCases: [
        { input: '2', expectedOutput: '4', isHidden: false },
        { input: '5', expectedOutput: '10', isHidden: false },
        { input: '10', expectedOutput: '999', isHidden: false } // Intentional failure
      ]
    });
    if (judgeRes.passedTests !== 2 || judgeRes.totalTests !== 3) {
      throw new Error(`Expected 2/3 passed, got ${judgeRes.passedTests}/${judgeRes.totalTests}`);
    }
    if (judgeRes.verdict !== 'Wrong Answer') {
      throw new Error(`Expected Wrong Answer, got ${judgeRes.verdict}`);
    }
    if (judgeRes.score !== 66.67) {
      throw new Error(`Expected 66.67 score, got ${judgeRes.score}`);
    }
  });

  // Test 9: Function driver wrapping with solve() function
  await test('Function driver with solve() function', async () => {
    const userCode = 'def solve(nums, target):\n    return [0, 1]';
    const wrapped = wrapCodeForExecution('python', userCode, 'solve');
    const res = await executeCode({
      language: 'python',
      code: wrapped,
      stdin: '[2, 7, 11, 15] 9'
    });
    if (res.verdict !== 'Accepted' || !res.output.includes('[0,1]')) {
      throw new Error(`Expected [0,1], got ${res.verdict}: "${res.output}" (stderr: ${res.stderr})`);
    }
  });

  // Test 10: Script without solve() function does not crash with Entry function was not found
  await test('Script without solve() does not crash wrapper', async () => {
    const userCode = 'x = int(input())\nprint(x * 3)';
    const wrapped = wrapCodeForExecution('python', userCode, 'solve');
    // wrapped should be equal to userCode because solve() is not defined
    if (wrapped !== userCode) {
      throw new Error('Code was unexpectedly wrapped even though solve() does not exist!');
    }
    const res = await executeCode({
      language: 'python',
      code: wrapped,
      stdin: '7'
    });
    if (res.verdict !== 'Accepted' || res.output.trim() !== '21') {
      throw new Error(`Expected 21, got ${res.verdict}: "${res.output}"`);
    }
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
