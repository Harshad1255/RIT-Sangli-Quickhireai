const dimensions = ['technicalKnowledge', 'codingAbility', 'communicationSkills', 'problemSolving'];
const normalizeTranscript = (text) => {
  const terms = [
    [/\bc\s+plus\s+plus\b/gi, 'C++'], [/\bobject[ -]oriented\b/gi, 'object-oriented'],
    [/\bjava\s*script\b/gi, 'JavaScript'], [/\breact\s+js\b/gi, 'React.js'],
    [/\bnode\s+js\b/gi, 'Node.js'], [/\bmongo\s*db\b/gi, 'MongoDB'],
    [/\bhtml\b/gi, 'HTML'], [/\bcss\b/gi, 'CSS'], [/\bsql\b/gi, 'SQL'],
    [/\bapis?\b/gi, m => m.length === 4 ? 'APIs' : 'API'],
    [/\boop\b/gi, 'OOP'], [/\bdsa\b/gi, 'DSA'], [/\bpython\b/gi, 'Python'], [/\bjava\b/gi, 'Java']
  ];
  return terms.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
};
const weightedScore = (data) => Math.round((data.technicalKnowledge * .4 + data.codingAbility * .2 + data.communicationSkills * .2 + data.problemSolving * .2) * 10) / 10;
const parseEvaluation = (value) => {
  if (typeof value === 'string') {
    const start = value.indexOf('{'), end = value.lastIndexOf('}');
    const json = value.slice(start, end + 1);
    try { value = JSON.parse(json); }
    catch {
      // Remove trailing commas only outside quoted strings.
      let quoted = false, escaped = false, repaired = '';
      for (let i = 0; i < json.length; i++) {
        const c = json[i];
        if (!quoted && c === ',' && /^\s*[}\]]/.test(json.slice(i + 1))) continue;
        repaired += c;
        if (quoted && escaped) escaped = false;
        else if (quoted && c === '\\') escaped = true;
        else if (c === '"') quoted = !quoted;
      }
      value = JSON.parse(repaired);
    }
  }
  if (!value || dimensions.some(key => typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 10) || typeof value.feedback !== 'string' || /evaluation failed/i.test(value.feedback) || !Array.isArray(value.strengths) || !Array.isArray(value.improvements) || [...value.strengths, ...value.improvements].some(v => typeof v !== 'string')) throw new Error('INVALID_EVALUATION_RESPONSE');
  return { ...Object.fromEntries(dimensions.map(key => [key, value[key]])), feedback: value.feedback, strengths: value.strengths, improvements: value.improvements, overallScore: weightedScore(value), score: weightedScore(value), status: 'evaluated' };
};
const unavailable = () => ({ status: 'unavailable', evaluationFailed: true, overallScore: null, score: null, feedback: 'Evaluation service temporarily unavailable', ...Object.fromEntries(dimensions.map(key => [key, null])), strengths: [], improvements: [] });
const skipped = () => ({ status: 'skipped', overallScore: 0, score: 0, feedback: 'Question skipped', ...Object.fromEntries(dimensions.map(key => [key, 0])), strengths: [], improvements: [] });
const serializeAnswer = (ans) => {
  const analysis = ans.analysis || ans.evaluation || {};
  return { questionId: ans.questionId || ans.question?.id, question: typeof ans.question === 'object' ? ans.question.question : ans.question, code: ans.code || "", answer: ans.answer || '', rawTranscript: ans.rawTranscript ?? analysis.rawTranscript ?? ans.answer ?? '', normalizedTranscript: ans.normalizedTranscript ?? analysis.normalizedTranscript ?? ans.answer ?? '', ...analysis, speechConfidence: ans.speechConfidence ?? analysis.speechConfidence ?? null };
};
module.exports = { dimensions, normalizeTranscript, weightedScore, parseEvaluation, unavailable, skipped, serializeAnswer };
