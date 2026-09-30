const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

const getFallbackCodingProblem = (topic, difficulty, languages = []) => {
  const baseTopic = topic || 'Arrays';
  const preferredLanguages = Array.isArray(languages) && languages.length ? languages : ['javascript'];

  return {
    title: `${baseTopic} Pattern Mastery`,
    difficulty,
    tags: [baseTopic, 'Arrays', 'Interview Practice'],
    statementMarkdown: `## Problem
Given an array of integers \`nums\`, return the sum of all elements in the array.

Write a function that takes an array as input and returns the total sum. The function should handle positive, negative, and zero values.

### Example
Input: \`[1, -2, 3, 4]\`
Output: \`6\`

### Explanation
The sum of the elements is $1 + (-2) + 3 + 4 = 6$.

### Constraints
- $1 \le nums.length \le 10^5$
- $-10^9 \le nums[i] \le 10^9$
- The answer fits in a 64-bit signed integer.
`,
    constraints: '- 1 <= nums.length <= 10^5\n- -10^9 <= nums[i] <= 10^9\n- Output should be a single integer',
    sampleTestCases: [
      { input: '[1, -2, 3, 4]', expectedOutput: '6', explanation: 'Sum of values is 6.' },
      { input: '[0, 0, 0]', expectedOutput: '0', explanation: 'All values are zero, so the total is 0.' }
    ],
    hiddenTestCases: [
      { input: '[]', expectedOutput: '0' },
      { input: '[5, 5, 5]', expectedOutput: '15' },
      { input: '[-10, 20, -30, 40]', expectedOutput: '20' },
      { input: '[1000000000, 1000000000]', expectedOutput: '2000000000' }
    ],
    starterCode: {
      javascript: `function solve(nums) {\n  // Write your solution here\n  return 0;\n}`,
      python: `def solve(nums):\n    # Write your solution here\n    return 0`,
      java: `import java.util.*;\n\nclass Solution {\n    public int solve(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(nums) {\n  return nums.reduce((sum, num) => sum + num, 0);\n}`
    },
    _validationWarning: null,
    _fallback: true,
    languages: preferredLanguages
  };
};

const generateCodingProblem = async (topic, difficulty, languages = null) => {
  if (!model) {
    console.warn('Gemini model unavailable; using fallback coding problem');
    return getFallbackCodingProblem(topic, difficulty, languages);
  }

  const prompt = `Generate a high-quality, professional programming challenge for a technical interview or coding assessment.
Topic/Pattern: ${topic}
Difficulty: ${difficulty}
${languages ? `Target Languages: ${languages.join(', ')}` : ''}

Strict requirements:
- The problem must be logically sound, clearly described without ambiguities, and challenging but fair.
- The statement must fully specify input/output format — a student should never have to guess formatting.
- Include at least 2 sample cases with explanations and at least 4 hidden cases, including edge cases (empty input, boundary values, largest expected input size).
- The starter code MUST define a function named exactly "solve" (e.g., function solve(...) or def solve(...)). The testing engine expects this exact name.
- Reason through each test case's expected output step by step before finalizing it to ensure absolute correctness.

Return ONLY a valid JSON object, with no markdown fences (\`\`\`) and no preamble.
The JSON object must contain EXACTLY this structure:
{
  "title": "string (Creative title for the problem)",
  "difficulty": "${difficulty}",
  "tags": ["string", "string"],
  "statementMarkdown": "string (Full problem statement with constraints and examples in Markdown)",
  "constraints": "string (Bullet points of constraints)",
  "sampleTestCases": [
    { "input": "string", "expectedOutput": "string", "explanation": "string" }
  ],
  "hiddenTestCases": [
    { "input": "string", "expectedOutput": "string" }
  ],
  "starterCode": {
    "javascript": "string (e.g. function solve(arr) { ... })",
    "python": "string (e.g. def solve(arr): ...)",
    "java": "string (e.g. import java.util.*;\\n\\nclass Solution {\\n    public return_type solve(args) { ... }\\n})",
    "cpp": "string (e.g. #include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\nclass Solution {\\npublic:\\n    return_type solve(args) { ... }\\n};)"
  },
  "referenceSolution": {
    "javascript": "string (A complete, highly optimized, correct working solution)"
  }
}
`;

  let lastError;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const rawText = await response.text();
      const text = rawText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const problem = JSON.parse(text);

      if (!problem.title || !problem.statementMarkdown || !Array.isArray(problem.sampleTestCases) || problem.sampleTestCases.length === 0 || !Array.isArray(problem.hiddenTestCases) || problem.hiddenTestCases.length === 0) {
        throw new Error('Invalid problem format in response: missing test cases');
      }

      return problem;
    } catch (error) {
      const msg = (error && error.message) ? error.message.toLowerCase() : '';
      const isQuotaError = msg.includes('quota') || msg.includes('429') || msg.includes('too many requests') || msg.includes('generate_content_free_tier_requests');
      console.error(`Attempt ${attempt} failed:`, msg || error);
      lastError = error;

      if (attempt < maxRetries) {
        const delay = isQuotaError ? 4000 : 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.warn('Gemini coding generation failed after retries. Using fallback data instead.');
  return getFallbackCodingProblem(topic, difficulty, languages);
};

module.exports = {
  generateCodingProblem
};
