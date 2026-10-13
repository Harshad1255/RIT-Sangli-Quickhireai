const dimensions = ['technicalKnowledge','codingAbility','communicationSkills','problemSolving'];
const validReport = report => !!report && typeof report.overallScore === 'number' && Number.isFinite(report.overallScore) && report.overallScore >= 0 && report.overallScore <= 10 && dimensions.every(key => typeof report.skillAssessment?.[key] === 'number' && Number.isFinite(report.skillAssessment[key]) && report.skillAssessment[key] >= 0 && report.skillAssessment[key] <= 10);
const answersComplete = session => {
  if (!Number.isInteger(session.totalQuestions) || session.totalQuestions < 1) return false;
  const questions = session.questions || [];
  const answers = session.answers || [];
  const main = questions.filter(q => !q.isFollowUp);
  return main.length === session.totalQuestions && new Set(questions.map(q=>q.id)).size === questions.length && questions.every(q => q.id && answers.filter(a=>a.questionId === q.id).length === 1 && ['evaluated','skipped','provisional'].includes(answers.find(a=>a.questionId === q.id)?.analysis?.status));
};
const completedSession = session => session?.status === 'completed' && ['completed','provisional'].includes(session.evaluationStatus) && answersComplete(session) && validReport(session.finalEvaluation) && (!session.answers.some(a=>a.analysis?.status === 'provisional') || (session.evaluationStatus === 'provisional' && session.finalEvaluation.evaluationStatus === 'provisional'));
module.exports = { validReport, answersComplete, completedSession };
