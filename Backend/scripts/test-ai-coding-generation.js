// Verification script for AI Coding Question Maker
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { generateCodingProblem } = require('../src/features/coding/services/codingGeminiService');
const { getFallbackCodingProblem, normalizeCategory } = require('../src/features/coding/data/codingProblemBank');

async function runTests() {
  console.log('=== VERIFYING AI CODING QUESTION GENERATOR ===\n');
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

  // Test 1: Category normalization
  await test('Category normalization', async () => {
    if (normalizeCategory('String') !== 'Strings') throw new Error('Expected String -> Strings');
    if (normalizeCategory('strings') !== 'Strings') throw new Error('Expected strings -> Strings');
    if (normalizeCategory('Arrays') !== 'Arrays & Hashing') throw new Error('Expected Arrays -> Arrays & Hashing');
    if (normalizeCategory('Stack') !== 'Stack') throw new Error('Expected Stack -> Stack');
    if (normalizeCategory('Dynamic Programming') !== 'Dynamic Programming') throw new Error('Expected Dynamic Programming -> Dynamic Programming');
  });

  // Test 2: Fallback for Strings returns String-specific challenge
  await test('Fallback generation for String topic', async () => {
    const p = getFallbackCodingProblem('String', 'Easy');
    if (!p.title) throw new Error('Missing title');
    if (p.category !== 'Strings') throw new Error(`Expected Strings category, got ${p.category}`);
    const lower = p.statementMarkdown.toLowerCase();
    const isString = lower.includes('string') || lower.includes('character') || lower.includes('word') || lower.includes('palindrome') || lower.includes('anagram') || lower.includes('vowel');
    if (!isString) throw new Error(`Problem does not test strings: ${p.statementMarkdown}`);
    if (lower.includes('array of integers `nums`, return the sum')) {
      throw new Error('Problem still contains old array sum template!');
    }
  });

  // Test 3: Deduplication ensures different questions on retry
  await test('Non-repeating question selection on retry', async () => {
    const p1 = getFallbackCodingProblem('Strings', 'Easy');
    const p2 = getFallbackCodingProblem('Strings', 'Easy', null, [p1.title]);
    if (p1.title === p2.title) {
      throw new Error(`Expected different question, but got "${p1.title}" again`);
    }
  });

  // Test 4: Array problem generation
  await test('Generation for Array topic', async () => {
    const p = getFallbackCodingProblem('Arrays', 'Easy');
    if (p.category !== 'Arrays & Hashing') throw new Error(`Expected Arrays & Hashing, got ${p.category}`);
    if (!p.sampleTestCases || p.sampleTestCases.length < 2) throw new Error('Missing sample test cases');
    if (!p.hiddenTestCases || p.hiddenTestCases.length < 2) throw new Error('Missing hidden test cases');
  });

  // Test 5: End-to-end generateCodingProblem for String
  await test('generateCodingProblem service for "String"', async () => {
    const p = await generateCodingProblem('String', 'Easy');
    if (!p.title) throw new Error('Missing problem title');
    const lower = (p.statementMarkdown || '').toLowerCase();
    const isString = lower.includes('string') || lower.includes('character') || lower.includes('word') || lower.includes('palindrome') || lower.includes('anagram') || lower.includes('vowel');
    if (!isString) throw new Error(`generateCodingProblem did not return string challenge: ${p.title}`);
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
