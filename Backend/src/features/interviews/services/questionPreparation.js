const InterviewSession = require('../models/InterviewSession');
const gemini = require('./geminiService');
const preparations = new Map();
const starts = new Map();
const prepare = session => {
  if (session.status !== 'active' || session.preparedQuestions?.length || preparations.has(session.interviewCode)) return preparations.get(session.interviewCode);
  const task = (async () => {
    const started = Date.now();
    const questions = await gemini.generateQuestionBatch(session.skills, session.questions, session.totalQuestions);
    await InterviewSession.updateOne({ interviewCode: session.interviewCode, status: 'active' }, { $set: { preparedQuestions: questions } });
    console.info('[interview timing]', {stage:'question_batch', durationMs:Date.now()-started});
  })().catch(error => console.error('[interview question preparation]', {message:error.message})).finally(()=>preparations.delete(session.interviewCode));
  preparations.set(session.interviewCode, task);
  return task;
};
const nextPrepared = async (session, number) => {
  const cached = session.preparedQuestions?.find(q => q.questionNumber === number);
  if (cached) return cached;
  if (!preparations.has(session.interviewCode)) return null;
  await preparations.get(session.interviewCode);
  const refreshed = await InterviewSession.findOne({interviewCode:session.interviewCode}, {preparedQuestions:1});
  return refreshed?.preparedQuestions?.find(q => q.questionNumber === number) || null;
};
module.exports = { prepare, nextPrepared, starts };
