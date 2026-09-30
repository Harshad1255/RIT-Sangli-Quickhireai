const { GoogleGenerativeAI } = require("@google/generative-ai");

// Check if API key is available
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const getFallbackQuestion = (skill, previousQuestions = []) => {
  const skillSpecificQuestions = {
    'C++': [
      'Explain the difference between stack and heap memory in C++.',
      'How do you handle memory management in C++?',
      'What are smart pointers and how do they help prevent memory leaks?',
      'Explain the concept of RAII in C++.',
      'How do you implement polymorphism in C++?'
    ],
    'MongoDB': [
      'Explain the difference between MongoDB and traditional SQL databases.',
      'How do you design a schema in MongoDB?',
      'What are MongoDB indexes and how do they improve performance?',
      'Explain the concept of sharding in MongoDB.',
      'How do you handle transactions in MongoDB?'
    ],
    'TypeScript': [
      'Explain the benefits of using TypeScript over JavaScript.',
      'How do you handle type definitions in TypeScript?',
      'What are generics in TypeScript and when would you use them?',
      'Explain the concept of interfaces in TypeScript.',
      'How do you handle type checking in TypeScript?'
    ]
  };

  // Get skill-specific questions or use generic ones
  const questions = skillSpecificQuestions[skill] || [
    `Explain the core concepts of ${skill} and their practical applications.`,
    `What are the best practices you follow when working with ${skill}?`,
    `Describe a challenging problem you've solved using ${skill}.`,
    `Compare and contrast different approaches in ${skill}.`,
    `What are the common pitfalls to avoid when working with ${skill}?`
  ];

  // Filter out previously used questions
  const unusedQuestions = questions.filter(q => 
    !previousQuestions.some(prevQ => calculateSimilarity(prevQ, q) > 0.7)
  );

  // If all questions are used, create a variation
  const question = unusedQuestions.length > 0 
    ? unusedQuestions[0]
    : `Tell me about your experience with ${skill} and any recent projects.`;

  return {
    question,
    topic: skill,
    difficulty: "medium",
    expectedDuration: "2-3 minutes",
    category: "experience",
    expectedKeyPoints: ["Technical knowledge", "Practical experience", "Challenges faced"],
    id: Math.random().toString(36).substring(2, 10),
    skill,
    questionNumber: previousQuestions.length + 1
  };
};

const generateQuestion = async (skill, previousQuestions = [], questionIndex = 0, customPrompt = null) => {
  try {
    console.log('Generating question for skill:', skill);

    // Backward-compatible handling for older callers that pass a custom prompt as the
    // second argument, e.g. generateQuestion(topic, followUpPrompt).
    if (typeof previousQuestions === 'string') {
      customPrompt = previousQuestions;
      previousQuestions = [];
    }

    console.log('Previous questions:', previousQuestions);

    let prompt;

    // Use custom prompt if provided (for follow-up questions)
    if (customPrompt) {
      prompt = customPrompt;
    } else {
      // Only 1 out of 5 questions should be a code/coding/SQL question
      const isCodeQuestion = questionIndex === 2; // e.g., 3rd question is code/SQL
      prompt = isCodeQuestion ?
      `Generate a direct, realistic technical interview question for the skill: ${skill}.
The question should:
- Require the candidate to write a code snippet or SQL query (choose the most relevant for the skill).
- Be clear and concise, and suitable for a real technical interview.
- Avoid scenario-based or imagination wording.
- Require a specific, factual answer.
- Be different from these previous questions: ${previousQuestions.join(', ')}

Return only the JSON object without markdown:
{
  "question": "direct code/coding/SQL interview question",
  "topic": "specific topic within ${skill}",
  "difficulty": "easy or medium",
  "expectedDuration": "2-3 minutes",
  "category": "coding/sql",
  "expectedKeyPoints": ["2-3 key points"]
}`
      :
      `Generate a direct, realistic technical interview question for the skill: ${skill}.
The question should:
- Be clear and concise.
- Be suitable for a real technical interview (not a scenario or imagination).
- Test the candidate's knowledge of ${skill} directly.
- Avoid "imagine", "describe a project", or scenario-based wording.
- Require a specific, factual answer.
- Be different from these previous questions: ${previousQuestions.join(', ')}

Return only the JSON object without markdown:
{
  "question": "direct, factual technical interview question",
  "topic": "specific topic within ${skill}",
  "difficulty": "easy or medium",
  "expectedDuration": "1-2 minutes",
  "category": "fundamentals/concepts/principles",
  "expectedKeyPoints": ["2-3 key discussion points"]
}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text
    const jsonStr = text.replace(/```json\n|\n```|```/g, '').trim();
    
    try {
      const question = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!question.question || !question.topic || !question.difficulty) {
        throw new Error('Invalid question format');
      }

      // Check if question is too similar to previous questions
      const isDuplicate = previousQuestions.some(prevQ => {
        const similarity = calculateSimilarity(prevQ, question.question);
        return similarity > 0.7; // 70% similarity threshold
      });

      if (isDuplicate) {
        console.log('Duplicate question detected, generating alternative');
        return getFallbackQuestion(skill, previousQuestions);
      }

      return question;
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      console.error('Raw Gemini response text:', text);
      return getFallbackQuestion(skill, previousQuestions);
    }
  } catch (error) {
    console.error('Error generating question:', error);
    return getFallbackQuestion(skill, previousQuestions);
  }
};

// Add a simple similarity check function
const calculateSimilarity = (str1, str2) => {
  const words1 = str1.toLowerCase().split(/\W+/);
  const words2 = str2.toLowerCase().split(/\W+/);
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
};

const analyzeAnswer = async (answer, question) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set, using default evaluation');
      return getDefaultEvaluation(answer, question);
    }

    const prompt = `Evaluate this interview answer:
    Question: ${question}
    Answer: ${answer}
    
    Provide a detailed evaluation in this JSON format:
    {
      "score": number between 0-10,
      "feedback": "detailed feedback on the answer",
      "technicalAccuracy": number between 0-10,
      "communication": number between 0-10,
      "improvements": ["specific areas for improvement"]
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text
    const jsonStr = text.replace(/```json\n|\n```|```/g, '').trim();
    
    try {
      const evaluation = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!evaluation.score || !evaluation.feedback) {
        throw new Error('Invalid evaluation format');
      }

      return evaluation;
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      return getDefaultEvaluation(answer, question);
    }
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return getDefaultEvaluation(answer, question);
  }
};

const getDefaultEvaluation = (answer, question) => {
  // Skip if answer is empty or "Question skipped"
  if (!answer || answer.toLowerCase().includes('skipped')) {
    return {
      score: 0,
      feedback: 'Question was skipped',
      technicalAccuracy: 0,
      communication: 0,
      improvements: ['Please provide a detailed answer']
    };
  }

  // Basic evaluation based on answer length and content
  const answerLength = answer.length;
  const hasTechnicalTerms = /(function|class|method|variable|loop|condition|algorithm|data structure|database|api|framework)/i.test(answer);
  
  let score = 5; // Default score
  let technicalAccuracy = 5;
  let communication = 5;
  
  // Adjust score based on answer length
  if (answerLength > 100) score += 2;
  else if (answerLength > 50) score += 1;
  else score -= 1;
  
  // Adjust technical accuracy based on technical terms
  if (hasTechnicalTerms) technicalAccuracy += 2;
  
  // Adjust communication based on clarity indicators
  const hasStructure = /(first|second|third|finally|however|therefore|because|since)/i.test(answer);
  if (hasStructure) communication += 1;
  
  // Cap scores at 10
  score = Math.min(10, Math.max(0, score));
  technicalAccuracy = Math.min(10, Math.max(0, technicalAccuracy));
  communication = Math.min(10, Math.max(0, communication));
  
  return {
    score,
    feedback: `Answer provided with ${answerLength} characters. ${hasTechnicalTerms ? 'Contains technical terminology.' : 'Could include more technical details.'}`,
    technicalAccuracy,
    communication,
    improvements: [
      'Provide more specific examples',
      'Include technical details where relevant',
      'Structure your response clearly'
    ]
  };
};

const createDefaultEvaluation = () => {
  return {
    score: 5,
    feedback: "Unable to analyze answer. Please try again.",
    technicalAccuracy: 5,
    communication: 5,
    improvements: ["Provide a more detailed answer", "Include specific examples", "Explain your reasoning"]
  };
};

const generateFinalEvaluation = async (answers) => {
  try {
    if (!answers || answers.length === 0) {
      return createDefaultFinalEvaluation(answers);
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set, using default final evaluation');
      return createDefaultFinalEvaluation(answers);
    }

    const answersText = answers.map((ans, index) => 
      `Question ${index + 1}: ${ans.question}\nAnswer: ${ans.answer}\nScore: ${ans.analysis?.score || 0}`
    ).join('\n\n');

    const prompt = `Based on these interview answers, provide a comprehensive final evaluation:

${answersText}

Provide a detailed evaluation in this JSON format:
{
  "overallScore": number between 0-10 (give 0 if candidate answered nothing or skipped all),
  "skillAssessment": {
    "technicalKnowledge": number between 0-10 (give 0 if skipped),
    "codingAbility": number between 0-10 (give 0 if skipped),
    "communicationSkills": number between 0-10 (give 0 if skipped),
    "problemSolving": number between 0-10 (give 0 if skipped)
  },
  "strengths": ["list of candidate's strengths"],
  "weaknesses": ["areas for improvement"],
  "recommendations": ["specific recommendations for growth"],
  "overallFeedback": "comprehensive feedback on the candidate's performance",
  "hiringRecommendation": "strongly recommend/recommend/consider/not recommend"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text
    const jsonStr = text.replace(/```json\n|\n```|```/g, '').trim();
    
    try {
      const evaluation = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!evaluation.overallScore || !evaluation.skillAssessment) {
        throw new Error('Invalid evaluation format');
      }

      return evaluation;
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      return createDefaultFinalEvaluation(answers);
    }
  } catch (error) {
    console.error('Error generating final evaluation:', error);
    return createDefaultFinalEvaluation(answers);
  }
};

const createDefaultFinalEvaluation = (answers) => {
  const avgScore = calculateAverageScore(answers);
  
  const isZero = avgScore === 0;
  
  return {
    overallScore: avgScore,
    skillAssessment: {
      technicalKnowledge: avgScore,
      codingAbility: avgScore,
      communicationSkills: avgScore,
      problemSolving: avgScore
    },
    strengths: isZero ? ['None observed'] : ['Demonstrated willingness to participate', 'Provided answers to questions'],
    weaknesses: isZero ? ['Did not answer questions', 'Skipped interview portions'] : ['Could improve technical depth', 'More specific examples needed'],
    recommendations: isZero ? ['Please attempt to answer the questions in the future'] : ['Continue learning and practicing', 'Work on providing detailed explanations'],
    overallFeedback: isZero ? 'Candidate skipped or did not provide answers to the questions.' : 'Candidate participated in the interview and provided answers to questions.',
    hiringRecommendation: isZero ? 'not recommend' : 'consider'
  };
};

const calculateAverageScore = (answers) => {
  if (!answers || answers.length === 0) return 0;
  const totalScore = answers.reduce((sum, ans) => {
    const score = ans.analysis?.score !== undefined ? ans.analysis.score : 0;
    return sum + score;
  }, 0);
  return Math.round(totalScore / answers.length);
};

const generateRecommendations = (evaluation) => {
  const recommendations = [];
  
  if (evaluation.skillAssessment.technicalKnowledge < 7) {
    recommendations.push('Focus on strengthening technical fundamentals');
  }
  
  if (evaluation.skillAssessment.communicationSkills < 7) {
    recommendations.push('Practice explaining technical concepts clearly');
  }
  
  if (evaluation.skillAssessment.problemSolving < 7) {
    recommendations.push('Work on structured problem-solving approaches');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue building on current strengths');
  }
  
  return recommendations;
};

const generateOverallFeedback = (evaluation) => {
  const score = evaluation.overallScore;
  
  if (score >= 8) {
    return 'Excellent performance with strong technical knowledge and communication skills.';
  } else if (score >= 6) {
    return 'Good performance with room for improvement in specific areas.';
  } else if (score >= 4) {
    return 'Fair performance with significant areas for improvement.';
  } else {
    return 'Needs substantial improvement in technical knowledge and communication.';
  }
};

// Function to generate follow-up questions
const generateFollowUpQuestion = async (originalQuestion, userAnswer, answerQuality) => {
  try {
    const prompt = `Based on this interview exchange:
    
Original Question: "${originalQuestion.question}"
User's Answer: "${userAnswer}"
Answer Quality Score: ${answerQuality.score}/10

Generate a follow-up question that:
- Is specific to the user's answer
- Probes deeper into the topic
- Asks for clarification, examples, or practical implementation
- Is appropriate for the skill: ${originalQuestion.topic}

Return only the JSON object without markdown:
{
  "question": "follow-up question",
  "topic": "${originalQuestion.topic}",
  "difficulty": "medium",
  "type": "follow-up",
  "originalQuestionId": "${originalQuestion.id}"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text
    const jsonStr = text.replace(/```json\n|\n```|```/g, '').trim();
    
    try {
      const followUpQuestion = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!followUpQuestion.question || !followUpQuestion.topic) {
        throw new Error('Invalid follow-up question format');
      }

      return followUpQuestion;
    } catch (e) {
      console.error('Failed to parse follow-up question response:', e);
      return {
        question: `Can you provide a practical example of this concept in ${originalQuestion.topic}?`,
        topic: originalQuestion.topic,
        difficulty: 'medium',
        type: 'follow-up',
        originalQuestionId: originalQuestion.id
      };
    }
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    return {
      question: `Can you elaborate on your answer about ${originalQuestion.topic}?`,
      topic: originalQuestion.topic,
      difficulty: 'medium',
      type: 'follow-up',
      originalQuestionId: originalQuestion.id
    };
  }
};

module.exports = {
  generateQuestion,
  generateFollowUpQuestion,
  analyzeAnswer,
  generateFinalEvaluation,
  getFallbackQuestion,
  getDefaultEvaluation,
  createDefaultEvaluation
}; 