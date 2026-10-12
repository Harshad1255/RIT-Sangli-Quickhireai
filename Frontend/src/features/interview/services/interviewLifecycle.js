const dimensions = ['technicalKnowledge', 'codingAbility', 'communicationSkills', 'problemSolving'];
export const validReport = report => !!report && [report.overallScore, ...dimensions.map(key=>report.skillAssessment?.[key])].every(score=>typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 10);
export const completedSession = (session, code) => {
  if (!session?.sessionId || session.interviewCode !== code || session.status !== 'completed' || session.evaluationStatus !== 'completed' || !validReport(session.finalEvaluation)) return false;
  const questions = session.questions || [];
  const answers = session.answers || [];
  return Number.isInteger(session.totalQuestions) && session.totalQuestions > 0 && questions.filter(q=>!q.isFollowUp).length === session.totalQuestions && new Set(questions.map(q=>q.id)).size === questions.length && questions.every(q=>q.id && answers.filter(a=>a.questionId === q.id).length === 1 && ['evaluated','skipped'].includes(answers.find(a=>a.questionId === q.id)?.analysis?.status));
};
export const completedResponse = (response, code, sessionId) => response?.success === true && response.isComplete === true && response.status === 'completed' && response.evaluationStatus === 'completed' && response.interviewCode === code && response.sessionId === sessionId && validReport(response.evaluation);
export const persistedAnswers = response => response.answers.map(answer=>({...answer,question:response.questions.find(q=>q.id === answer.questionId) || {id:answer.questionId,question:answer.question},evaluation:answer.analysis}));
export const newMockAttempt = label => `mock-${String(label || 'practice').replace(/^mock-/, '').trim()}-${crypto.randomUUID()}`;
