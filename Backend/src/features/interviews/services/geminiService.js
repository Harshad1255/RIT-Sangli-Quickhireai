const { generateContentWithRetry } = require("../../../shared/services/geminiClient");
const { questionsBank, genericBank } = require("../../../shared/data/interviewBank");

const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return 0;
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
};

const getFallbackQuestion = (skill, previousQuestions = [], focusArea = null) => {
  const bank = questionsBank[skill] || genericBank;
  
  // Filter out previously used questions
  const unusedQuestions = bank.filter(bankItem => 
    !previousQuestions.some(prevQ => {
      const qText = typeof prevQ === 'string' ? prevQ : prevQ.question;
      return calculateSimilarity(qText, bankItem.question) > 0.7;
    })
  );

  let selectedItem;
  if (unusedQuestions.length > 0) {
    // Try to match focus area if provided
    selectedItem = unusedQuestions.find(q => q.category === focusArea) || unusedQuestions[0];
  } else {
    // Ultimate fallback if bank is exhausted
    selectedItem = {
      question: `Tell me about your experience with ${skill} and any recent projects.`,
      category: 'experience'
    };
  }

  const result = {
    question: typeof selectedItem === 'string' ? selectedItem : selectedItem.question,
    topic: skill,
    difficulty: "medium",
    expectedDuration: "2-3 minutes",
    category: selectedItem.category || "fundamentals",
    expectedKeyPoints: ["Technical knowledge", "Practical experience", "Challenges faced"],
    id: Math.random().toString(36).substring(2, 10),
    skill,
    source: 'fallback'
  };
  
  console.log(`[geminiService] Served fallback question for skill ${skill} (source: fallback)`);
  return result;
};

const generateQuestion = async (skill, previousQuestions = [], questionIndex = 0, focusArea = null) => {
  try {
    console.log(`Generating question for skill: ${skill}, index: ${questionIndex}, focus: ${focusArea}`);
    
    // Extract question strings for similarity and prompt
    const prevQStrings = previousQuestions.map(q => typeof q === 'string' ? q : q.question);
    
    let prompt;
    const isCodeQuestion = questionIndex === 2; // 3rd question is code/SQL

    if (isCodeQuestion) {
      prompt = `Generate a direct, realistic technical interview question for the skill: ${skill}.
The question should:
- Require the candidate to write a code snippet or SQL query (choose the most relevant for the skill).
- Be clear and concise, and suitable for a real technical interview.
- Avoid scenario-based or imagination wording.
- Require a specific, factual answer.
- Focus area: ${focusArea || 'coding'}
- Be different from these previous questions: ${prevQStrings.join(' | ')}

Return only the JSON object:
{
  "question": "direct code/coding/SQL interview question",
  "topic": "specific topic within ${skill}",
  "difficulty": "medium",
  "expectedDuration": "2-3 minutes",
  "category": "coding",
  "expectedKeyPoints": ["2-3 key points"]
}`;
    } else {
      prompt = `Generate a direct, realistic technical interview question for the skill: ${skill}.
The question should:
- Be clear and concise.
- Be suitable for a real technical interview (not a scenario or imagination).
- Test the candidate's knowledge of ${skill} directly.
- Avoid "imagine", "describe a project", or scenario-based wording.
- Require a specific, factual answer.
- Focus area: ${focusArea || 'fundamentals'}
- Be different from these previous questions: ${prevQStrings.join(' | ')}

Return only the JSON object:
{
  "question": "direct, factual technical interview question",
  "topic": "specific topic within ${skill}",
  "difficulty": "medium",
  "expectedDuration": "1-2 minutes",
  "category": "${focusArea || 'fundamentals'}",
  "expectedKeyPoints": ["2-3 key discussion points"]
}`;
    }

    let attempts = 0;
    while (attempts < 3) {
      const response = await generateContentWithRetry(prompt, { isJson: true });
      if (response.ok && response.data) {
        const question = response.data;
        
        if (!question.question || !question.topic) {
          throw new Error('Invalid question format from AI');
        }

        const isDuplicate = prevQStrings.some(prevQ => calculateSimilarity(prevQ, question.question) > 0.7);
        if (isDuplicate) {
          console.log(`[geminiService] Duplicate question generated, retrying... (Attempt ${attempts+1})`);
          attempts++;
          continue;
        }

        question.id = Math.random().toString(36).substring(2, 10);
        question.skill = skill;
        question.source = 'ai';
        console.log(`[geminiService] Generated AI question for ${skill} (source: ai)`);
        return question;
      } else {
        // Break on AI failure (e.g. quota, timeout) to use fallback
        break;
      }
    }
    
    // If we exhaust retries or AI fails outright
    return getFallbackQuestion(skill, previousQuestions, focusArea);
  } catch (error) {
    console.error('Error generating question:', error);
    return getFallbackQuestion(skill, previousQuestions, focusArea);
  }
};

const analyzeAnswer = async (answer, question) => {
  try {
    if (!answer || answer.toLowerCase().includes('skipped') || answer.trim() === '') {
      return {
        score: 0,
        feedback: 'Question was skipped',
        technicalAccuracy: 0,
        communication: 0,
        improvements: ['Please provide a detailed answer']
      };
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

    // Retry evaluation once internally
    const response = await generateContentWithRetry(prompt, { isJson: true, maxRetries: 1 });
    if (response.ok && response.data && response.data.score !== undefined) {
      return response.data;
    }
    
    console.error('Failed to analyze answer with AI. Returning evaluation failure.');
    return { evaluationFailed: true, score: null };
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return { evaluationFailed: true, score: null };
  }
};

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

Return only the JSON object:
{
  "question": "follow-up question",
  "topic": "${originalQuestion.topic}",
  "difficulty": "medium",
  "type": "follow-up",
  "originalQuestionId": "${originalQuestion.id}"
}`;

    const response = await generateContentWithRetry(prompt, { isJson: true });
    
    if (response.ok && response.data && response.data.question) {
      const followUp = response.data;
      followUp.source = 'ai';
      
      // Prevent generic follow-up from AI
      if (calculateSimilarity(followUp.question, `Can you elaborate on your answer about ${originalQuestion.topic}?`) > 0.8) {
         console.log('[geminiService] AI returned generic follow-up. Skipping.');
         return null;
      }
      return followUp;
    }
    
    console.log('[geminiService] AI failed to generate follow-up. Skipping follow-up.');
    return null;
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    return null; // Skip follow-up on error
  }
};

const generateFinalEvaluation = async (answers) => {
  try {
    if (!answers || answers.length === 0) {
      return createDefaultFinalEvaluation(answers);
    }

    const answersText = answers.map((ans, index) => 
      `Question ${index + 1}: ${ans.question}\nAnswer: ${ans.answer}\nScore: ${ans.analysis?.score || 'N/A'}`
    ).join('\n\n');

    const prompt = `Based on these interview answers, provide a comprehensive final evaluation. If some scores are N/A, estimate based on the answer text.

${answersText}

Provide a detailed evaluation in this JSON format:
{
  "overallScore": number between 0-10 (give 0 if candidate answered nothing or skipped all),
  "skillAssessment": {
    "technicalKnowledge": number between 0-10,
    "codingAbility": number between 0-10,
    "communicationSkills": number between 0-10,
    "problemSolving": number between 0-10
  },
  "strengths": ["list of candidate's strengths"],
  "weaknesses": ["areas for improvement"],
  "recommendations": ["specific recommendations for growth"],
  "overallFeedback": "comprehensive feedback on the candidate's performance",
  "hiringRecommendation": "strongly recommend/recommend/consider/not recommend"
}`;

    const response = await generateContentWithRetry(prompt, { isJson: true });
    if (response.ok && response.data && response.data.overallScore !== undefined) {
      return response.data;
    }
    
    return createDefaultFinalEvaluation(answers);
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
  
  let totalScore = 0;
  let count = 0;
  
  for (const ans of answers) {
    if (ans.analysis && ans.analysis.score !== null && ans.analysis.score !== undefined) {
      totalScore += ans.analysis.score;
      count++;
    }
  }
  
  return count > 0 ? Math.round(totalScore / count) : 0;
};

module.exports = {
  generateQuestion,
  generateFollowUpQuestion,
  analyzeAnswer,
  generateFinalEvaluation,
  getFallbackQuestion
};