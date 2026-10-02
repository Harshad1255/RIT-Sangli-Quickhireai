const geminiClient = require('../../../shared/services/geminiClient');

const getFallbackCodingProblem = (topic, difficulty, languages = []) => {
  const baseTopic = topic || 'Arrays';
  const preferredLanguages = Array.isArray(languages) && languages.length ? languages : ['javascript'];

  return {
    title: `${baseTopic} Pattern Mastery`,
    difficulty,
    tags: [baseTopic, 'Arrays', 'Interview Practice'],
    statementMarkdown: `## Problem\nGiven an array of integers \`nums\`, return the sum of all elements in the array.\n\nWrite a function that takes an array as input and returns the total sum. The function should handle positive, negative, and zero values.\n\n### Example\nInput: \`[1, -2, 3, 4]\`\nOutput: \`6\`\n\n### Explanation\nThe sum of the elements is 1 + (-2) + 3 + 4 = 6.\n\n### Constraints\n- 1 <= nums.length <= 10^5\n- -10^9 <= nums[i] <= 10^9\n- The answer fits in a 64-bit signed integer.\n`,
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

  try {
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);

    const problem = result.data;
    if (!problem.title || !problem.statementMarkdown || !Array.isArray(problem.sampleTestCases) || problem.sampleTestCases.length === 0 || !Array.isArray(problem.hiddenTestCases) || problem.hiddenTestCases.length === 0) {
      throw new Error('Invalid problem format in response: missing test cases');
    }

    return problem;
  } catch (error) {
    console.warn('Gemini coding generation failed:', error.message);
    return getFallbackCodingProblem(topic, difficulty, languages);
  }
};

module.exports = {
  generateCodingProblem
};
