const geminiClient = require('../../../shared/services/geminiClient');

const parseJsonResponse = (text) => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
};

const explainCode = async (code, language, problemTitle) => {
  try {
    const prompt = `Explain this ${language} solution for "${problemTitle}" in clear steps. Include time and space complexity.\n\nCode:\n${code}\n\nRespond in JSON: {"explanation":"...","timeComplexity":"...","spaceComplexity":"...","optimizations":["..."]}`;
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  } catch (error) {
    return { explanation: 'Unable to generate explanation.', error: error.message };
  }
};

const suggestOptimizations = async (code, language) => {
  try {
    const prompt = `Analyze and suggest optimizations for this ${language} code:\n${code}\n\nRespond in JSON: {"suggestions":["..."],"optimizedApproach":"...","bugs":[]}`;
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  } catch (error) {
    return { suggestions: [], error: error.message };
  }
};

const explainAptitudeSolution = async (question, options, correctAnswer, userAnswer) => {
  try {
    const prompt = `Explain this aptitude question step by step.\nQuestion: ${question}\nOptions: ${JSON.stringify(options)}\nCorrect: ${correctAnswer}\nUser answered: ${userAnswer || 'skipped'}\n\nRespond in JSON: {"explanation":"...","steps":["..."],"tip":"..."}`;
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  } catch (error) {
    return { explanation: 'Unable to generate explanation.', error: error.message };
  }
};

const generateStudyPlan = async (weakAreas, strongAreas, targetCompanies) => {
  try {
    const prompt = `Create a 4-week personalized placement study plan.\nWeak areas: ${JSON.stringify(weakAreas)}\nStrong areas: ${JSON.stringify(strongAreas)}\nTarget companies: ${targetCompanies?.join(', ') || 'general'}\n\nRespond in JSON: {"weeklyPlan":[{"week":1,"focus":"...","aptitudeTopics":[],"codingTopics":[],"dailyHours":2}],"tips":["..."]}`;
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  } catch (error) {
    return { weeklyPlan: [], tips: ['Practice daily on weak topics'], error: error.message };
  }
};

const analyzeWeakTopics = async (topicProgress) => {
  try {
    const prompt = `Analyze student topic progress and identify weak/strong areas:\n${JSON.stringify(topicProgress)}\n\nRespond in JSON: {"weakAreas":[{"topic":"...","accuracy":0,"recommendation":"..."}],"strongAreas":[{"topic":"...","accuracy":0}],"readinessScore":0}`;
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  } catch (error) {
    return { weakAreas: [], strongAreas: [], readinessScore: 50, error: error.message };
  }
};

const generateSimilarProblems = async (problemTitle, category, difficulty) => {
  try {
    const prompt = `Generate 2 similar coding practice problems like "${problemTitle}" (${category}, ${difficulty}). Respond in JSON: {"problems":[{"title":"...","description":"...","difficulty":"...","category":"..."}]}`;
    const result = await geminiClient.generateContent(prompt);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  } catch (error) {
    return { problems: [], error: error.message };
  }
};

const calculateInterviewReadiness = (aptitudeStats, codingStats) => {
  const aptitudeScore = Math.min(100, (aptitudeStats.accuracy || 0) * 0.4 + (aptitudeStats.xp || 0) / 100);
  const codingScore = Math.min(100, (codingStats.acceptanceRate || 0) * 0.4 + (codingStats.solvedCount || 0) * 2);
  return Math.round(Math.min(100, aptitudeScore + codingScore));
};

module.exports = {
  explainCode,
  suggestOptimizations,
  explainAptitudeSolution,
  generateStudyPlan,
  analyzeWeakTopics,
  generateSimilarProblems,
  calculateInterviewReadiness
};
