const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

const generateAptitudeQuestions = async (topic, difficulty, count, jobContext = null, contextString = null) => {
  if (!model) {
    throw new Error('AI generation is temporarily unavailable — please add questions manually');
  }

  const prompt = `Generate exactly ${count} high-quality, professional aptitude questions for a corporate assessment.
Topic: ${topic}
Difficulty: ${difficulty}
${jobContext ? `Context: Ensure the questions are highly relevant to this job description/skills: ${jobContext}` : ''}
${contextString ? `\nIMPORTANT NOVELTY REQUIREMENT:\nThe user has recently generated the following questions:\n${contextString}\n\nDO NOT generate any questions that are exact duplicates or use the exact same specific numerical scenarios as the ones above. Ensure fresh concepts and variations.` : ''}

Strict requirements:
- The questions must be challenging, well-formatted, and logically sound.
- Produce exactly one unambiguous correct answer per question.
- Make the 3 incorrect options highly plausible distractors (common mistakes), not obviously wrong filler.
- Avoid duplicate or near-duplicate questions.
- Match the requested difficulty honestly (an "easy" question should be solvable in under 30 seconds; "hard" should require multi-step reasoning).
- Keep numerical/logical questions self-contained and answerable from the text alone.
- Vary the specific subtopic for each question (e.g., if Topic is Quantitative, use Time & Work, Percentages, etc. rather than repeating one concept).
- If the topic is Data Interpretation, include the necessary table or data directly in the question text using clear text formatting (since there is no separate diagram-rendering support).

Return ONLY a valid JSON array of objects, with no markdown fences (\`\`\`) and no preamble.
The JSON array must contain objects with EXACTLY this structure:
{
  "question": "string (the question text, including tabular data if Data Interpretation)",
  "options": ["string", "string", "string", "string"],
  "correctIndex": integer (0 to 3),
  "explanation": "string (detailed rationale for the correct answer)",
  "difficulty": "${difficulty}",
  "subtopic": "string (the specific subtopic tested)",
  "topic": "${topic}"
}
`;

  let lastError;
  const maxRetries = 6; // Increased to 6 to guarantee we can wait out a 60s rate limit window

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;

      // response.text may be a function that returns a Promise/string
      let text = '';
      try {
        if (response && typeof response.text === 'function') {
          text = await response.text();
        } else if (typeof response === 'string') {
          text = response;
        } else if (response && typeof response.toString === 'function') {
          text = response.toString();
        } else {
          text = JSON.stringify(response);
        }
      } catch (txtErr) {
        console.warn('Could not read response text directly:', txtErr);
        text = String(response);
      }

      // Clean up JSON markdown block if Gemini included it despite instructions
      text = text.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();

      let questions;
      try {
        questions = JSON.parse(text);
      } catch (parseErr) {
        // Attempt to extract the first JSON array from the text as a fallback
        try {
          const arrMatch = text.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            questions = JSON.parse(arrMatch[0]);
          } else {
            console.error('Failed to parse JSON. Raw model output:\n', text.substring(0, 2000));
            throw parseErr;
          }
        } catch (fallbackErr) {
          console.error('Fallback JSON extraction failed. Raw model output:\n', text.substring(0, 2000));
          throw parseErr;
        }
      }
      
      // Validate output
      if (!Array.isArray(questions)) {
        throw new Error('Invalid response format: Expected an array');
      }
      
      const validQuestions = questions.map(q => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
          throw new Error('Invalid question format in response');
        }
        return {
          ...q,
          sectionName: q.topic || topic,
          text: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          marks: difficulty === 'Hard' || difficulty === 'hard' ? 2 : 1,
          negativeMarks: difficulty === 'Hard' || difficulty === 'hard' ? 0.5 : 0.25,
          difficulty: q.difficulty || difficulty,
          explanation: q.explanation || ''
        };
      });

      return validQuestions;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error && (error.message || error.toString()));
      const msg = (error && (error.message || '')).toLowerCase();
      const isQuotaError = msg.includes('quota') || msg.includes('429') || msg.includes('too many requests') || msg.includes('generate_content_free_tier_requests');
      
      lastError = error;

      if (attempt < maxRetries) {
        // If it's a quota error, wait significantly longer (15 seconds) to ensure the 60s bucket refills.
        const delay = isQuotaError ? 15000 : 2000;
        if (isQuotaError) console.warn(`Hit Gemini rate limit. Backing off for ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        if (isQuotaError) {
           console.warn('Gemini API quota exceeded. Falling back to hardcoded question bank.');
           return getFallbackQuestions(topic, difficulty, count);
        }
      }
    }
  }
  
  console.warn('Gemini API failed multiple attempts. Falling back to hardcoded question bank.');
  return getFallbackQuestions(topic, difficulty, count);
};

// Fallback question bank to ensure test creation always succeeds
const getFallbackQuestions = (topic, difficulty, count) => {
  const fallbacks = [
    {
      question: "If a train 150m long is running at a speed of 72 km/hr, how long will it take to cross a pole?",
      options: ["5 seconds", "7.5 seconds", "10 seconds", "12.5 seconds"],
      correctIndex: 1,
      explanation: "Speed = 72 km/hr = 72 * (5/18) = 20 m/s. Time = Distance / Speed = 150 / 20 = 7.5 seconds.",
      subtopic: "Time & Distance"
    },
    {
      question: "The sum of ages of 5 children born at the intervals of 3 years each is 50 years. What is the age of the youngest child?",
      options: ["4 years", "8 years", "10 years", "None of these"],
      correctIndex: 0,
      explanation: "Let ages be x, x+3, x+6, x+9, x+12. Sum = 5x + 30 = 50 => 5x = 20 => x = 4.",
      subtopic: "Ages"
    },
    {
      question: "A vendor bought toffees at 6 for a rupee. How many for a rupee must he sell to gain 20%?",
      options: ["3", "4", "5", "6"],
      correctIndex: 2,
      explanation: "CP of 6 toffees = Re 1. SP of 6 toffees = 120% of Re 1 = Rs 1.20. For Re 1, he sells 6 / 1.20 = 5 toffees.",
      subtopic: "Profit & Loss"
    },
    {
      question: "What is the next number in the series? 2, 5, 10, 17, 26, ...",
      options: ["36", "37", "39", "40"],
      correctIndex: 1,
      explanation: "The differences are 3, 5, 7, 9. The next difference is 11. 26 + 11 = 37. (Alternatively: n^2 + 1)",
      subtopic: "Number Series"
    },
    {
      question: "If A is the brother of B; B is the sister of C; and C is the father of D, how D is related to A?",
      options: ["Nephew", "Niece", "Cannot be determined", "Uncle"],
      correctIndex: 2,
      explanation: "D's gender is unknown. Therefore, D can be either nephew or niece to A.",
      subtopic: "Blood Relations"
    }
  ];

  // Shuffle and slice
  const shuffled = fallbacks.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);
  
  // Format them to match the expected schema
  return selected.map(q => ({
    ...q,
    sectionName: topic,
    topic: topic,
    difficulty: difficulty,
    marks: difficulty === 'Hard' || difficulty === 'hard' ? 2 : 1,
    negativeMarks: difficulty === 'Hard' || difficulty === 'hard' ? 0.5 : 0.25,
  }));
};

module.exports = {
  generateAptitudeQuestions
};
