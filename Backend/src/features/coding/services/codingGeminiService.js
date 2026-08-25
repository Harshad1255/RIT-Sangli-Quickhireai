const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }) : null;

const generateCodingProblem = async (topic, difficulty, languages = null) => {
  if (!model) {
    throw new Error('AI generation is temporarily unavailable — please add questions manually');
  }

  const prompt = `Generate a high-quality, professional programming challenge for a technical interview or coding assessment.
Topic/Pattern: ${topic}
Difficulty: ${difficulty}
${languages ? `Target Languages: ${languages.join(', ')}` : ''}

Strict requirements:
- The problem must be logically sound, clearly described without ambiguities, and challenging but fair.
- The statement must fully specify input/output format — a student should never have to guess formatting.
- Include at least 2 sample cases with explanations and at least 4 hidden cases, including edge cases (empty input, boundary values, largest expected input size).
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
    "python": "string (e.g. def solve(arr): ...)"
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
      let text = response.text();
      
      // Clean up JSON markdown block
      text = text.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      
      const problem = JSON.parse(text);
      
      // Validate required fields
      if (!problem.title || !problem.statementMarkdown || !Array.isArray(problem.sampleTestCases) || !Array.isArray(problem.hiddenTestCases)) {
        throw new Error('Invalid problem format in response');
      }

      return problem;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  throw new Error('Failed to generate high-quality coding problem after multiple attempts. Please try again or add it manually.');
};

module.exports = {
  generateCodingProblem
};
