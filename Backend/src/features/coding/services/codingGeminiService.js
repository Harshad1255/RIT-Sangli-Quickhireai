const geminiClient = require('../../../shared/services/geminiClient');
const { getFallbackCodingProblem, normalizeCategory } = require('../data/codingProblemBank');

const generateCodingProblem = async (topic = 'Strings', difficulty = 'Easy', languages = null, excludeTitles = []) => {
  const normalizedCategory = normalizeCategory(topic);
  const prompt = `Generate a high-quality, professional programming challenge for a technical interview or coding assessment.
Requested Topic/Pattern: ${topic}
Target Category: ${normalizedCategory}
Difficulty: ${difficulty}
${languages ? `Target Languages: ${languages.join(', ')}` : ''}

Strict requirements:
- The problem MUST strictly and directly test the concept of "${topic}" (${normalizedCategory}). For example, if the topic is Strings, the problem MUST involve string processing, characters, palindromes, anagrams, reversing, or substrings. DO NOT substitute an unrelated topic like an array of integers.
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
  "category": "${normalizedCategory}",
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
    "javascript": "string (e.g. function solve(s) { ... })",
    "python": "string (e.g. def solve(s): ...)",
    "java": "string (e.g. import java.util.*;\\n\\nclass Solution {\\n    public return_type solve(args) { ... }\\n})",
    "cpp": "string (e.g. #include <iostream>\\n#include <string>\\nusing namespace std;\\n\\nclass Solution {\\npublic:\\n    return_type solve(args) { ... }\\n};)"
  },
  "referenceSolution": {
    "javascript": "string (A complete, highly optimized, correct working solution)"
  }
}
`;

  try {
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) {
      throw new Error(result.errorMessage || result.error || 'Gemini generation failed');
    }

    const problem = result.data;
    if (
      !problem ||
      !problem.title ||
      !problem.statementMarkdown ||
      !Array.isArray(problem.sampleTestCases) ||
      problem.sampleTestCases.length === 0 ||
      !Array.isArray(problem.hiddenTestCases) ||
      problem.hiddenTestCases.length === 0
    ) {
      throw new Error('Invalid problem format in response: missing test cases');
    }

    // Sanity check: if topic is Strings, ensure problem actually tests strings and is not an array of numbers
    if (normalizedCategory === 'Strings') {
      const lowerStmt = (problem.statementMarkdown || '').toLowerCase();
      const lowerTitle = (problem.title || '').toLowerCase();
      const isStringRelated = lowerStmt.includes('string') || lowerStmt.includes('character') || lowerStmt.includes('word') || lowerStmt.includes('palindrome') || lowerStmt.includes('anagram') || lowerTitle.includes('string') || lowerTitle.includes('palindrome');
      if (!isStringRelated && lowerStmt.includes('array of integers')) {
        throw new Error('AI generated array problem instead of requested string problem');
      }
    }

    problem.category = problem.category || normalizedCategory;
    return problem;
  } catch (error) {
    console.warn(`[CodingGeminiService] AI generation for "${topic}" failed: ${error.message}. Using topic-aware bank.`);
    return getFallbackCodingProblem(topic, difficulty, languages, excludeTitles);
  }
};

module.exports = {
  generateCodingProblem,
  getFallbackCodingProblem
};
