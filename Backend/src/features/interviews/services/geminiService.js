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

    const questionText = typeof question === 'object' ? (question.question || question.text || JSON.stringify(question)) : question;
    const prompt = `You are a lenient but technically responsible technical interview evaluator.
Your goal is to assess what the candidate actually demonstrated, not whether their answer is perfectly worded.

Evaluate the candidate on:
1. Technical Knowledge
2. Coding Ability
3. Communication Skills
4. Problem Solving

IMPORTANT EVALUATION RULES:
- Award partial credit.
- Do not require a perfect answer.
- Minor factual mistakes should reduce marks, not automatically result in zero.
- Incomplete answers should receive partial marks if they contain relevant knowledge.
- Grammar mistakes should not heavily reduce the score.
- Speech-to-text mistakes should not be interpreted as lack of knowledge when the intended technical meaning is reasonably clear.
- Do not penalize accent.
- Do not require perfect English.
- Recognize relevant technical terminology even if speech transcription contains minor errors.
- Give communication marks when the candidate successfully communicates a technical idea.
- Give problem-solving marks when the candidate demonstrates a reasonable approach.
- Give coding marks for correct logic, algorithmic approach, pseudocode, or implementation understanding when applicable.
- Do not give zero merely because the candidate did not mention every expected point.
- A completely irrelevant answer may receive very low marks.
- Never fabricate information that the candidate did not provide.

The question is:
${questionText}

The candidate's original speech transcript is:
${answer}

Evaluate the candidate's demonstrated knowledge.

Return ONLY valid JSON:
{
  "technicalKnowledge": 0,
  "codingAbility": 0,
  "communicationSkills": 0,
  "problemSolving": 0,
  "overallScore": 0,
  "feedback": "",
  "strengths": [],
  "improvements": []
}

Scores must be integers or decimals from 0 to 10. Use partial credit.
The feedback must explain what the candidate did correctly and what could be improved.
Do not return "Evaluation failed" as candidate feedback.

CRITICAL INSTRUCTIONS:
- You MUST return ONLY a valid JSON object.
- Do NOT wrap the JSON in markdown code blocks (e.g. \`\`\`json).
- Do NOT output any conversational text before or after the JSON.`;

    console.log(`
================================================
INTERVIEW EVALUATION DEBUG
================================================
AI request started for question: "${question.substring(0, 50)}..."
Candidate Answer Length: ${answer.length}
Candidate Answer: "${answer.substring(0, 100)}..."
================================================
`);

    // Retry evaluation once internally
    const response = await generateContentWithRetry(prompt, { isJson: true, maxRetries: 2 });
    if (response.ok && response.data) {
      const data = response.data;
      const evaluation = {
        score: data.overallScore ?? data.score ?? 0,
        feedback: data.feedback ?? '',
        technicalKnowledge: data.technicalKnowledge ?? data.technicalAccuracy ?? 0,
        codingAbility: data.codingAbility ?? 0,
        communicationSkills: data.communicationSkills ?? data.communication ?? 0,
        problemSolving: data.problemSolving ?? 0,
        improvements: data.improvements ?? [],
        strengths: data.strengths ?? []
      };
      console.log(`[GeminiService] Evaluation Success: Score ${evaluation.score}/10`);
      return evaluation;
    }
    
    console.error(`[GeminiService] Failed to analyze answer with AI. Code: ${response.errorCode} Msg: ${response.errorMessage}`);
    return { 
      evaluationFailed: true, 
      score: null, 
      feedback: "Evaluation failed",
      errorCode: response.errorCode || 'EVALUATION_ERROR',
      errorMessage: response.errorMessage || 'Unknown AI Error'
    };
  } catch (error) {
    console.error("[INTERVIEW AI EVALUATION ERROR]", {
       questionId: typeof question === 'object' ? question.id : undefined,
       questionText: typeof question === 'object' ? question.question : question,
       errorName: error?.name,
       errorMessage: error?.message,
       status: error?.response?.status,
       response: error?.response?.data
    });
    return { 
      evaluationFailed: true, 
      score: null, 
      feedback: "Evaluation failed",
      errorCode: 'INTERNAL_EXCEPTION',
      errorMessage: error.message
    };
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
  const computedScores = calculateSkillScores(answers);
  const isZero = computedScores.overallScore === 0;

  try {
    if (!answers || answers.length === 0 || isZero) {
      return createDefaultFinalEvaluation(answers, computedScores);
    }

    const answersText = answers.map((ans, index) => 
      `Question ${index + 1}: ${ans.question}\nAnswer: ${ans.answer}\nScore: ${ans.analysis?.score || 'N/A'}`
    ).join('\n\n');

    const prompt = `Based on these interview answers, provide a comprehensive final evaluation feedback.
${answersText}

Provide a detailed evaluation in this JSON format:
{
  "strengths": ["list of candidate's strengths"],
  "weaknesses": ["areas for improvement"],
  "recommendations": ["specific recommendations for growth"],
  "overallFeedback": "comprehensive feedback on the candidate's performance",
  "hiringRecommendation": "strongly recommend/recommend/consider/not recommend"
}`;

    const response = await generateContentWithRetry(prompt, { isJson: true });
    if (response.ok && response.data) {
      const data = response.data;
      return {
        overallScore: computedScores.overallScore,
        skillAssessment: {
          technicalKnowledge: computedScores.technicalKnowledge,
          codingAbility: computedScores.codingAbility,
          communicationSkills: computedScores.communicationSkills,
          problemSolving: computedScores.problemSolving
        },
        strengths: data.strengths ?? [],
        weaknesses: data.weaknesses ?? data.areas_for_improvement ?? data.improvements ?? [],
        recommendations: data.recommendations ?? [],
        overallFeedback: data.overallFeedback ?? data.overall_feedback ?? data.feedback ?? '',
        hiringRecommendation: data.hiringRecommendation ?? data.hiring_recommendation ?? 'consider'
      };
    }
    
    return createDefaultFinalEvaluation(answers, computedScores);
  } catch (error) {
    console.error('Error generating final evaluation:', error);
    return createDefaultFinalEvaluation(answers, computedScores);
  }
};

const createDefaultFinalEvaluation = (answers, computedScores) => {
  const isZero = computedScores.overallScore === 0;
  const answeredCount = answers.filter(a => a.answer && a.answer.trim().length > 0 && !a.answer.toLowerCase().includes('skipped')).length;
  const hasAnswers = answeredCount > 0;
  
  let strengths = ['None observed'];
  let weaknesses = ['Did not answer questions', 'Skipped interview portions'];
  let recommendations = ['Please attempt to answer the questions in the future'];
  let overallFeedback = 'Candidate skipped or did not provide answers to the questions.';
  
  if (hasAnswers && isZero) {
    strengths = ['Attempted questions', 'Participated in the interview'];
    weaknesses = ['Evaluation service failed to score responses'];
    recommendations = ['Manual review of answers required'];
    overallFeedback = 'Candidate provided answers, but the AI evaluation service failed to process them. Please review the transcribed answers manually.';
  } else if (!isZero) {
    strengths = ['Demonstrated willingness to participate', 'Provided answers to questions'];
    weaknesses = ['Could improve technical depth', 'More specific examples needed'];
    recommendations = ['Continue learning and practicing', 'Work on providing detailed explanations'];
    overallFeedback = 'Candidate participated in the interview and provided answers to questions.';
  }

  return {
    overallScore: computedScores.overallScore,
    skillAssessment: {
      technicalKnowledge: computedScores.technicalKnowledge,
      codingAbility: computedScores.codingAbility,
      communicationSkills: computedScores.communicationSkills,
      problemSolving: computedScores.problemSolving
    },
    strengths,
    weaknesses,
    recommendations,
    overallFeedback,
    hiringRecommendation: isZero && !hasAnswers ? 'not recommend' : 'consider'
  };
};

const calculateSkillScores = (answers) => {
  if (!answers || answers.length === 0) {
    return { overallScore: 0, technicalKnowledge: 0, codingAbility: 0, communicationSkills: 0, problemSolving: 0 };
  }
  
  let totals = { score: 0, tech: 0, comm: 0 };
  let counts = { score: 0, tech: 0, comm: 0 };
  
  for (const ans of answers) {
    const analysis = ans.analysis;
    if (analysis && !analysis.evaluationFailed) {
      if (typeof analysis.score === 'number') { totals.score += analysis.score; counts.score++; }
      if (typeof analysis.technicalAccuracy === 'number') { totals.tech += analysis.technicalAccuracy; counts.tech++; }
      if (typeof analysis.communication === 'number') { totals.comm += analysis.communication; counts.comm++; }
    }
  }
  
  const avgScore = counts.score > 0 ? totals.score / counts.score : 0;
  const avgTech = counts.tech > 0 ? totals.tech / counts.tech : avgScore;
  const avgComm = counts.comm > 0 ? totals.comm / counts.comm : avgScore;
  
  // Format to 1 decimal place
  const formatScore = (val) => Math.round(val * 10) / 10;
  
  return {
    overallScore: formatScore(avgScore),
    technicalKnowledge: formatScore(avgTech),
    codingAbility: formatScore(avgTech), // derived from tech if not separate
    communicationSkills: formatScore(avgComm),
    problemSolving: formatScore(avgScore) // derived from overall if not separate
  };
};

module.exports = {
  generateQuestion,
  generateFollowUpQuestion,
  analyzeAnswer,
  generateFinalEvaluation,
  getFallbackQuestion
};