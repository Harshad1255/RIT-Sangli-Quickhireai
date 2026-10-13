const { generateContentWithRetry } = require("../../../shared/services/geminiClient");
const { questionsBank, genericBank, getQuestionsForSkill } = require("../../../shared/data/interviewBank");
const evaluationEngine = require("./evaluationEngine");

const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return 0;
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
};

const detectBranch = (skill, explicitBranch = null) => {
  if (explicitBranch && typeof explicitBranch === 'string' && explicitBranch.trim()) {
    const b = explicitBranch.trim().toLowerCase();
    if (b.includes('civil')) return 'Civil';
    if (b.includes('mech')) return 'Mechanical';
    if (b.includes('elec')) return 'Electrical';
    if (b.includes('entc') || b.includes('telecom')) return 'ENTC';
    if (b.includes('cs') || b.includes('it') || b.includes('software')) return 'CS/IT';
  }

  const s = String(skill || '').toLowerCase();
  const civilTokens = ['beam', 'column', 'truss', 'frame', 'soil', 'foundation', 'retaining', 'earthquake', 'road', 'railway', 'traffic', 'airport', 'survey', 'level', 'theodolite', 'gps', 'concrete', 'cement', 'civil', 'slump', 'geotech', 'structural', 'rcc', 'cbr', 'camber'];
  const mechTokens = ['thermo', 'entropy', 'fluid', 'pump', 'turbine', 'hydraulic', 'gear', 'bearing', 'shaft', 'casting', 'welding', 'machining', 'mechanical', 'otto', 'diesel'];
  const elecTokens = ['power system', 'transformer', 'electrical machine', 'dc motor', 'induction motor', 'synchronous', 'transmission line', 'substation', 'relays', 'electrical'];
  const entcTokens = ['analog circuit', 'op-amp', 'modulation', 'demodulation', 'antenna', '8085', '8086', 'microprocessor', 'logic gate', 'flip-flop', 'entc', 'electronics'];

  if (civilTokens.some(t => s.includes(t))) return 'Civil';
  if (mechTokens.some(t => s.includes(t))) return 'Mechanical';
  if (elecTokens.some(t => s.includes(t))) return 'Electrical';
  if (entcTokens.some(t => s.includes(t))) return 'ENTC';
  return 'CS/IT';
};

const getFallbackQuestion = (skill, previousQuestions = [], focusArea = null, branch = null) => {
  const resolvedBranch = detectBranch(skill, branch);
  const bank = getQuestionsForSkill(skill, resolvedBranch);
  
  const prevQStrings = (previousQuestions || []).map(q => {
    if (!q) return '';
    if (typeof q === 'string') return q.toLowerCase();
    return (q.question || q.text || '').toLowerCase();
  }).filter(Boolean);

  // Filter out any questions that are similar or share key words with previous questions
  const unusedQuestions = bank.filter(bankItem => {
    const bText = (bankItem.question || '').toLowerCase();
    return !prevQStrings.some(prevQ => {
      if (calculateSimilarity(prevQ, bText) > 0.45) return true;
      if (bText.length > 20 && prevQ.includes(bText.substring(0, 25))) return true;
      if (prevQ.length > 20 && bText.includes(prevQ.substring(0, 25))) return true;
      return false;
    });
  });

  let selectedItem;
  if (unusedQuestions.length > 0) {
    selectedItem = unusedQuestions.find(q => q.category === focusArea) || unusedQuestions[0];
  } else {
    // Generate fresh non-repeating question using dynamic templates based on branch
    const salt = (previousQuestions.length || 0) + 1;
    const dynamicTemplates = {
      Civil: [
        `Explain the fundamental structural and material analysis principles for ${skill} in Civil Engineering.`,
        `Describe the step-by-step practical testing procedure or on-site inspection methods used for ${skill}.`,
        `What are the most critical safety factors, load considerations, and code compliance standards for ${skill}?`,
        `How do environmental degradation, moisture, and structural stress affect ${skill} over its design lifespan?`,
        `Discuss the key engineering trade-offs between conventional design and modern advanced techniques for ${skill}.`
      ],
      Mechanical: [
        `Explain the core thermodynamic and mechanical principles governing ${skill}.`,
        `How do you calculate stress distribution, efficiency, or thermal behavior for ${skill}?`,
        `What are common failure modes (fatigue, wear, cavitation) in ${skill} and how are they prevented?`,
        `Discuss design optimization and material selection considerations for ${skill}.`,
        `Describe a practical manufacturing or maintenance procedure for ${skill}.`
      ],
      Electrical: [
        `Explain the operating principles, equivalent circuit, and power flow characteristics for ${skill}.`,
        `How do you analyze stability, losses, and power factor in systems involving ${skill}?`,
        `What protection schemes and safety devices are implemented for ${skill}?`,
        `Discuss testing, calibration, and fault diagnosis procedures for ${skill}.`,
        `Explain recent technological advancements and energy efficiency standards for ${skill}.`
      ],
      ENTC: [
        `Explain signal behavior, noise response, and circuit characteristics for ${skill}.`,
        `How do you design, simulate, or calculate parameters for ${skill}?`,
        `What are the trade-offs between analog and digital implementations of ${skill}?`,
        `Explain timing constraints, frequency response, and stability in ${skill}.`,
        `Describe practical measurement and debugging techniques for ${skill}.`
      ],
      'CS/IT': [
        `Explain the internal working and fundamental principles of ${skill}.`,
        `How do you optimize performance and manage scalability in ${skill}?`,
        `Discuss common security vulnerabilities or memory management issues in ${skill}.`,
        `What are the key trade-offs between ${skill} and alternative technologies?`,
        `Describe how you would design a robust production-grade architecture using ${skill}.`
      ]
    };

    const templates = dynamicTemplates[resolvedBranch] || dynamicTemplates['Civil'];
    const chosenTemplate = templates[(salt - 1) % templates.length];

    selectedItem = {
      question: chosenTemplate,
      category: focusArea || 'fundamentals'
    };
  }

  const result = {
    question: typeof selectedItem === 'string' ? selectedItem : selectedItem.question,
    topic: skill,
    difficulty: "medium",
    expectedDuration: "2-3 minutes",
    category: selectedItem.category || focusArea || "fundamentals",
    expectedKeyPoints: ["Technical knowledge", "Practical applications", "Engineering standards"],
    id: Math.random().toString(36).substring(2, 10),
    skill,
    branch: resolvedBranch,
    source: 'fallback'
  };
  
  console.log(`[geminiService] Served unique fallback question for ${skill} (${resolvedBranch})`);
  return result;
};

const generateQuestion = async (skill, previousQuestions = [], questionIndex = 0, focusArea = null, branch = null) => {
  try {
    const resolvedBranch = detectBranch(skill, branch);
    console.log(`Generating question for skill: ${skill}, branch: ${resolvedBranch}, index: ${questionIndex}, focus: ${focusArea}`);
    
    const prevQStrings = (previousQuestions || []).map(q => {
      if (!q) return '';
      if (typeof q === 'string') return q;
      return q.question || q.text || '';
    }).filter(Boolean);
    
    let prompt;
    const isCSE = resolvedBranch === 'CS/IT';
    const isCodeQuestion = isCSE && questionIndex === 2; // ONLY 3rd question of CS/IT is code/SQL

    if (isCodeQuestion) {
      prompt = `Generate a direct, realistic technical interview question for the skill: ${skill} in Computer Science / IT.
The question should:
- Require the candidate to write a code snippet or SQL query.
- Be clear and concise, and suitable for a real software technical interview.
- Avoid scenario-based or imagination wording.
- Require a specific, factual answer.
- Focus area: ${focusArea || 'coding'}
- Be completely different from these previous questions: ${prevQStrings.join(' | ')}

Return only the JSON object:
{
  "question": "direct code/coding/SQL interview question",
  "topic": "${skill}",
  "difficulty": "medium",
  "expectedDuration": "2-3 minutes",
  "category": "coding",
  "expectedKeyPoints": ["2-3 key points"]
}`;
    } else if (resolvedBranch === 'Civil') {
      prompt = `Generate a direct, realistic technical interview question for the Civil Engineering subject/topic: "${skill}".
IMPORTANT RULES:
- This is a CIVIL ENGINEERING interview.
- STRICTLY DO NOT ask any programming, software development, coding, Python, JavaScript, or computer science questions.
- Focus on practical structural engineering, soil mechanics, concrete technology, transportation, highway design, surveying, foundation engineering, or site execution.
- Question index: ${questionIndex + 1}. Focus area: ${focusArea || 'fundamentals'}.
${questionIndex === 2 ? '- Require a practical engineering calculation, formula explanation, or design step (e.g. bending moment, bearing capacity, slump, CBR, or camber calculation).' : '- Ask a direct, factual technical concept or practical on-site application.'}
- Be completely different from these previous questions: ${prevQStrings.join(' | ')}

Return only the JSON object:
{
  "question": "direct Civil Engineering technical interview question",
  "topic": "${skill}",
  "difficulty": "medium",
  "expectedDuration": "2-3 minutes",
  "category": "${focusArea || 'fundamentals'}",
  "expectedKeyPoints": ["2-3 key technical points"]
}`;
    } else if (resolvedBranch === 'Mechanical' || resolvedBranch === 'Electrical' || resolvedBranch === 'ENTC') {
      prompt = `Generate a direct, realistic technical interview question for ${resolvedBranch} Engineering topic: "${skill}".
IMPORTANT RULES:
- This is an engineering interview for ${resolvedBranch} Engineering.
- STRICTLY DO NOT ask computer programming or software coding questions.
- Focus on core ${resolvedBranch} engineering principles, mechanisms, calculations, and industrial applications.
- Focus area: ${focusArea || 'fundamentals'}.
${questionIndex === 2 ? '- Include an engineering calculation, formula derivation, or practical design scenario.' : '- Ask a direct, factual technical question.'}
- Be completely different from these previous questions: ${prevQStrings.join(' | ')}

Return only the JSON object:
{
  "question": "direct ${resolvedBranch} Engineering technical interview question",
  "topic": "${skill}",
  "difficulty": "medium",
  "expectedDuration": "2-3 minutes",
  "category": "${focusArea || 'fundamentals'}",
  "expectedKeyPoints": ["2-3 key technical points"]
}`;
    } else {
      prompt = `Generate a direct, realistic technical interview question for the skill: "${skill}".
The question should:
- Test candidate's knowledge of ${skill} directly.
- Be clear and concise, suitable for a technical interview.
- Focus area: ${focusArea || 'fundamentals'}.
- Be completely different from these previous questions: ${prevQStrings.join(' | ')}

Return only the JSON object:
{
  "question": "direct technical interview question",
  "topic": "${skill}",
  "difficulty": "medium",
  "expectedDuration": "1-2 minutes",
  "category": "${focusArea || 'fundamentals'}",
  "expectedKeyPoints": ["2-3 key discussion points"]
}`;
    }

    let attempts = 0;
    while (attempts < 2) {
      const response = await generateContentWithRetry(prompt, { isJson: true });
      if (response.ok && response.data) {
        const question = response.data;
        
        if (!question.question || !question.topic) {
          throw new Error('Invalid question format from AI');
        }

        // Anti-repetition check
        const isDuplicate = prevQStrings.some(prevQ => {
          if (calculateSimilarity(prevQ, question.question) > 0.55) return true;
          const qLower = question.question.toLowerCase();
          const pLower = prevQ.toLowerCase();
          return qLower.includes(pLower.substring(0, 30)) || pLower.includes(qLower.substring(0, 30));
        });

        if (isDuplicate) {
          console.log(`[geminiService] Duplicate question detected for ${skill}, retrying... (Attempt ${attempts+1})`);
          attempts++;
          continue;
        }

        question.id = Math.random().toString(36).substring(2, 10);
        question.skill = skill;
        question.branch = resolvedBranch;
        question.source = 'ai';
        console.log(`[geminiService] Generated AI question for ${skill} [${resolvedBranch}] (source: ai)`);
        return question;
      } else {
        break;
      }
    }
    
    return getFallbackQuestion(skill, previousQuestions, focusArea, resolvedBranch);
  } catch (error) {
    console.error('Error generating question, using fallback bank:', error.message);
    return getFallbackQuestion(skill, previousQuestions, focusArea, branch);
  }
};

/**
 * Analyzes answer with Gemini AI, guaranteed to award fair partial marks.
 * Automatically falls back to deterministic evaluationEngine if AI fails,
 * times out, is quota-limited, or returns invalid responses.
 */
const analyzeAnswer = async (answer, question, code = '') => {
  const rawAnswer = typeof answer === 'string' ? answer.trim() : '';
  const rawCode = typeof code === 'string' ? code.trim() : '';
  const combinedAnswer = rawCode ? `${rawAnswer}\n${rawCode}`.trim() : rawAnswer;

  // Safe extraction of question text and id (resolves the question.substring bug)
  const questionText = typeof question === 'object' && question !== null
    ? (question.question || question.text || JSON.stringify(question))
    : String(question || '');

  const questionId = (typeof question === 'object' && question !== null && question.id)
    ? question.id
    : `q_${Date.now()}`;

  // Check if skipped or empty
  if (!combinedAnswer || combinedAnswer === '' || combinedAnswer.toLowerCase().includes('skipped') || combinedAnswer.toLowerCase() === 'skip') {
    return {
      questionId,
      maxMarks: 10,
      awardedMarks: 0,
      score: 0,
      attempted: false,
      feedback: 'Question was skipped',
      technicalKnowledge: 0,
      codingAbility: 0,
      communicationSkills: 0,
      problemSolving: 0,
      relevanceScore: 0,
      strengths: [],
      improvements: ['Attempt all questions to earn marks.'],
      evaluationSource: 'rubric'
    };
  }

  console.log(`
================================================
INTERVIEW EVALUATION DEBUG
================================================
Question: "${questionText.substring(0, 60)}..."
Answer Length: ${combinedAnswer.length}
Answer Preview: "${combinedAnswer.substring(0, 80)}..."
================================================
`);

  // Prompt following the mandatory lenient scoring rubric
  const prompt = `You are a fair, lenient technical interview evaluator.
Your goal is to evaluate what knowledge and understanding the candidate actually demonstrated.

MANDATORY SCORING POLICY:
- Relevant and substantially correct answer: 7.5 to 10.0 marks (out of 10)
- Mostly correct answer with minor mistakes or omissions: 6.0 to 8.0 marks
- Partially correct answer showing some understanding: 3.5 to 6.0 marks
- Relevant attempt with limited knowledge: 1.5 to 3.5 marks
- Meaningful but vague attempt: 0.5 to 2.0 marks
- Empty, completely irrelevant, or nonsense: 0.0 to 0.5 marks

EVALUATION RULES:
1. Always award partial marks for relevant concepts, keywords, examples, reasoning, or understanding.
2. Accept equivalent terminology, alternative approaches, and explanations in simple English.
3. Do NOT require exact wording from a reference answer.
4. Do NOT penalize grammar, accent, filler words, or minor speech-to-text transcription quirks.
5. Incomplete answers must receive partial marks if they contain relevant knowledge.
6. Communication score should reflect clarity of idea, not native English perfection.
7. Problem solving score should reflect logical thought process and trade-offs.

Question:
"${questionText}"

Candidate's Answer (Speech transcript and/or code):
"${combinedAnswer}"

Return ONLY a valid JSON object matching this schema:
{
  "questionId": "${questionId}",
  "maxMarks": 10,
  "awardedMarks": 6.5,
  "overallScore": 6.5,
  "relevanceScore": 7.0,
  "technicalKnowledge": 6.5,
  "codingAbility": 6.0,
  "communicationSkills": 7.0,
  "problemSolving": 6.0,
  "feedback": "Clear explanation of core concept, but could add details on edge cases.",
  "strengths": ["Identified primary concept correctly", "Clear communication"],
  "improvements": ["Explain practical implementation in greater depth"]
}`;

  try {
    const response = await generateContentWithRetry(prompt, { isJson: true, maxRetries: 1 });
    
    if (response.ok && response.data) {
      const data = response.data;
      
      // Validate and clamp all scores safely to 0-10
      const clamp = (val, def = 5) => {
        const num = Number(val);
        if (Number.isNaN(num) || !Number.isFinite(num)) return def;
        return Math.round(Math.min(10, Math.max(0, num)) * 10) / 10;
      };

      const finalScore = clamp(data.awardedMarks ?? data.overallScore ?? data.score, 6.0);
      const finalTech = clamp(data.technicalKnowledge ?? data.technicalAccuracy, finalScore);
      const finalComm = clamp(data.communicationSkills ?? data.communication, finalScore);
      const finalProb = clamp(data.problemSolving, finalScore);
      const finalCoding = clamp(data.codingAbility, finalTech);
      const finalRelevance = clamp(data.relevanceScore, finalScore);

      const evaluation = {
        questionId,
        maxMarks: 10,
        awardedMarks: finalScore,
        score: finalScore,
        attempted: true,
        relevanceScore: finalRelevance,
        technicalKnowledge: finalTech,
        codingAbility: finalCoding,
        communicationSkills: finalComm,
        problemSolving: finalProb,
        feedback: data.feedback || 'Good attempt with relevant points discussed.',
        strengths: Array.isArray(data.strengths) && data.strengths.length > 0 
          ? data.strengths 
          : ['Demonstrated technical understanding'],
        improvements: Array.isArray(data.improvements) && data.improvements.length > 0
          ? data.improvements
          : ['Continue practicing detailed implementation trade-offs'],
        evaluationSource: 'ai'
      };

      // Safeguard: If AI mistakenly scored 0 on an attempted answer with > 5 words, apply rubric floor
      if (evaluation.score === 0 && combinedAnswer.split(/\s+/).length >= 4) {
        console.warn('[GeminiService] AI awarded zero for attempted answer. Applying rubric fallback floor.');
        const fallbackEval = evaluationEngine.evaluateAnswer(combinedAnswer, question, { code: rawCode });
        return {
          ...evaluation,
          score: Math.max(evaluation.score, fallbackEval.score),
          awardedMarks: Math.max(evaluation.awardedMarks, fallbackEval.awardedMarks),
          technicalKnowledge: Math.max(evaluation.technicalKnowledge, fallbackEval.technicalKnowledge),
          feedback: fallbackEval.feedback,
          evaluationSource: 'ai-verified'
        };
      }

      console.log(`[GeminiService] Evaluation Success: Score ${evaluation.score}/10 (Source: AI)`);
      return evaluation;
    }

    console.warn(`[GeminiService] AI evaluation unavailable (${response.errorCode || 'Error'}). Activating deterministic fallback evaluator.`);
    return evaluationEngine.evaluateAnswer(combinedAnswer, question, { code: rawCode });

  } catch (error) {
    console.error("[GeminiService] Exception during AI evaluation. Invoking fallback engine:", error.message);
    return evaluationEngine.evaluateAnswer(combinedAnswer, question, { code: rawCode });
  }
};

const generateFollowUpQuestion = async (originalQuestion, userAnswer, answerQuality) => {
  try {
    const qText = typeof originalQuestion === 'object' ? (originalQuestion.question || originalQuestion.text) : originalQuestion;
    const topic = typeof originalQuestion === 'object' ? (originalQuestion.topic || originalQuestion.skill || 'technical') : 'technical';
    const qId = typeof originalQuestion === 'object' ? originalQuestion.id : `q_${Date.now()}`;

    const prompt = `Based on this interview exchange:
    
Original Question: "${qText}"
User's Answer: "${userAnswer}"
Answer Quality Score: ${answerQuality?.score || 5}/10

Generate a follow-up question that:
- Is specific to the user's answer
- Probes deeper into the topic
- Asks for clarification, examples, or practical implementation
- Is appropriate for the skill: ${topic}

Return only the JSON object:
{
  "question": "follow-up question",
  "topic": "${topic}",
  "difficulty": "medium",
  "type": "follow-up",
  "originalQuestionId": "${qId}"
}`;

    const response = await generateContentWithRetry(prompt, { isJson: true });
    
    if (response.ok && response.data && response.data.question) {
      const followUp = response.data;
      followUp.source = 'ai';
      
      if (calculateSimilarity(followUp.question, `Can you elaborate on your answer about ${topic}?`) > 0.8) {
         console.log('[geminiService] AI returned generic follow-up. Skipping.');
         return null;
      }
      return followUp;
    }
    
    console.log('[geminiService] AI follow-up skipped.');
    return null;
  } catch (error) {
    console.warn('Error generating follow-up question:', error.message);
    return null;
  }
};

/**
 * Calculates aggregate skill scores safely without NaN or undefined
 */
const calculateSkillScores = (answers) => {
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return { overallScore: 0, technicalKnowledge: 0, codingAbility: 0, communicationSkills: 0, problemSolving: 0 };
  }
  
  let totals = { score: 0, tech: 0, comm: 0, prob: 0, code: 0 };
  let count = 0;
  
  for (const ans of answers) {
    // Resolve evaluation data from analysis or evaluation object
    let analysis = ans.evaluation || ans.analysis;
    if (!analysis || analysis.score === null || analysis.score === undefined || analysis.evaluationFailed) {
      // Evaluate on the fly if missing
      analysis = evaluationEngine.evaluateAnswer(ans.answer, ans.question, { code: ans.code });
      ans.analysis = analysis;
      ans.evaluation = analysis;
    }

    const s = typeof analysis.score === 'number' ? analysis.score : (analysis.awardedMarks || 0);
    const t = typeof analysis.technicalKnowledge === 'number' ? analysis.technicalKnowledge : (analysis.technicalAccuracy || s);
    const c = typeof analysis.communicationSkills === 'number' ? analysis.communicationSkills : (analysis.communication || s);
    const p = typeof analysis.problemSolving === 'number' ? analysis.problemSolving : s;
    const cd = typeof analysis.codingAbility === 'number' ? analysis.codingAbility : t;

    totals.score += s;
    totals.tech += t;
    totals.comm += c;
    totals.prob += p;
    totals.code += cd;
    count++;
  }
  
  const safeCount = count > 0 ? count : 1;
  const round1 = (val) => Math.round(val * 10) / 10;
  
  return {
    overallScore: round1(totals.score / safeCount),
    technicalKnowledge: round1(totals.tech / safeCount),
    codingAbility: round1(totals.code / safeCount),
    communicationSkills: round1(totals.comm / safeCount),
    problemSolving: round1(totals.prob / safeCount)
  };
};

/**
 * Generates final comprehensive evaluation with AI or fallback engine
 */
const generateFinalEvaluation = async (answers = []) => {
  const computedScores = calculateSkillScores(answers);
  const round1 = (val) => Math.round(val * 10) / 10;

  try {
    if (!answers || answers.length === 0) {
      return evaluationEngine.generateFinalEvaluation(answers);
    }

    const answersText = answers.map((ans, index) => {
      const qText = typeof ans.question === 'object' ? (ans.question.question || ans.question.text || '') : ans.question;
      const score = ans.evaluation?.score ?? ans.analysis?.score ?? 'N/A';
      return `Question ${index + 1}: ${qText}\nAnswer: ${ans.answer || ''}\nScore: ${score}/10`;
    }).join('\n\n');

    const prompt = `Based on these technical interview answers, generate comprehensive final evaluation feedback.
${answersText}

Provide a detailed evaluation in this JSON format:
{
  "strengths": ["list of 3 specific candidate strengths observed"],
  "weaknesses": ["list of 3 constructive areas for improvement"],
  "recommendations": ["list of 3 concrete learning recommendations"],
  "overallFeedback": "detailed professional summary of performance",
  "hiringRecommendation": "strongly recommend/recommend/consider/not recommend"
}`;

    const response = await generateContentWithRetry(prompt, { isJson: true, maxRetries: 1 });
    
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
        strengths: Array.isArray(data.strengths) && data.strengths.length > 0 
          ? data.strengths 
          : ['Demonstrated understanding of core concepts', 'Engaged actively with technical questions'],
        weaknesses: Array.isArray(data.weaknesses) && data.weaknesses.length > 0 
          ? data.weaknesses 
          : (data.improvements || ['Provide deeper system implementation details']),
        recommendations: Array.isArray(data.recommendations) && data.recommendations.length > 0
          ? data.recommendations
          : ['Continue practicing hands-on system architecture and coding.'],
        overallFeedback: data.overallFeedback || data.feedback || `Candidate completed the interview with an overall score of ${computedScores.overallScore}/10.`,
        hiringRecommendation: data.hiringRecommendation || (computedScores.overallScore >= 6.5 ? 'recommend' : 'consider'),
        careerReadiness: {
          level: computedScores.overallScore >= 7.5 ? 'Job Ready (Advanced)' : (computedScores.overallScore >= 5.0 ? 'Developing' : 'Needs Practice'),
          recommendation: computedScores.overallScore >= 6.5 ? 'Suitable for interview shortlisting.' : 'Recommended for continued practice.'
        },
        evaluationSource: 'ai'
      };
    }

    console.log('[geminiService] AI final evaluation unavailable. Using deterministic fallback generator.');
    return evaluationEngine.generateFinalEvaluation(answers);

  } catch (error) {
    console.error('Error generating final evaluation with AI. Falling back to deterministic engine:', error.message);
    return evaluationEngine.generateFinalEvaluation(answers);
  }
};

module.exports = {
  generateQuestion,
  generateFollowUpQuestion,
  analyzeAnswer,
  generateFinalEvaluation,
  getFallbackQuestion,
  calculateSkillScores
};