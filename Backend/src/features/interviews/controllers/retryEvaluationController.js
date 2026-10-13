const Interview = require('../models/Interview');
const Session = require('../models/InterviewSession');
const service = require('../services/geminiService');
const { serializeAnswer } = require('../services/evaluationUtils');
const { answersComplete, validReport } = require('../services/sessionCompletion');
const { reportTotals } = require('../services/fallbackEvaluation');

// Company ownership is checked before acquiring the same lease used by answer submission.
module.exports = async (req, res) => {
 const code = req.params.interviewCode;
 const token = require('crypto').randomUUID();
 let claimed = false;
 try {
  const owner = await Interview.findOne({'candidates.code':code, company:req.user.id});
  if (!owner) return res.status(404).json({success:false,error:'Interview not found'});
  const session = await Session.findOneAndUpdate({interviewCode:code,$or:[{processingUntil:{$exists:false}},{processingUntil:{$lte:new Date()}}]},{$set:{processingToken:token,processingUntil:new Date(Date.now()+300000)},$inc:{__v:1}},{new:true});
  if (!session) return res.status(409).json({success:false,error:'Interview evaluation is already running or session is unavailable'});
  claimed = true;
  if (!answersComplete(session)) return res.status(409).json({success:false,error:'Finish the interview before retrying its provisional scores'});
  // A bounded batch keeps retries within the browser/server request budget.
  for (const answer of session.answers.filter(a=>a.analysis?.status==='provisional').slice(0,2)) {
   const question = session.questions.find(q=>q.id === answer.questionId);
   const analysis = await service.analyzeAnswer(answer.answer || answer.code,question,{code:answer.code,maxAttempts:1,sessionId:String(session._id),requestId:req.requestId});
   if (analysis.status === 'evaluated') {answer.analysis=analysis;answer.status=analysis.status;}
  }
  session.markModified('answers');
  const report = await service.generateFinalEvaluation(session.answers);
  if (!validReport(report)) throw new Error('Invalid report');
  session.finalEvaluation=report;
  session.currentScore=report.overallScore;
  session.evaluationStatus=report.evaluationStatus;
  session.lastResponse={...session.lastResponse,evaluation:report,finalScore:report.overallScore,evaluationStatus:report.evaluationStatus,answers:session.answers};
  // Save session first; repeating the endpoint safely repairs a company report write failure.
  await session.save();
  const results={...reportTotals(session.answers),...report,...report.skillAssessment,technicalScore:report.skillAssessment.technicalKnowledge,communicationScore:report.skillAssessment.communicationSkills,problemSolvingScore:report.skillAssessment.problemSolving,feedback:report.overallFeedback,answers:session.answers.map(serializeAnswer)};
  await Interview.updateOne({_id:owner._id,'candidates.code':code},{$set:{'candidates.$.results':results}},{runValidators:true});
  return res.json({success:true,evaluation:report,evaluationStatus:report.evaluationStatus});
 } catch {return res.status(500).json({success:false,error:'Unable to persist the refreshed report. Retry safely.'});}
 finally {if (claimed) await Session.updateOne({interviewCode:code,processingToken:token},{$unset:{processingToken:1,processingUntil:1}}).catch(()=>{});}
};
