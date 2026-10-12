const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  interviewCode: { type: String, required: true, unique: true },
  skills: [String],
  status: { type: String, default: 'active' },
  startTime: { type: Date, default: Date.now },
  currentQuestionIndex: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 5 },
  preparedQuestions: [mongoose.Schema.Types.Mixed],
  finalEvaluation: mongoose.Schema.Types.Mixed,
  lastResponse: mongoose.Schema.Types.Mixed,
  lastAnsweredQuestionId: String,
  processingToken: String,
  processingUntil: Date,
  evaluationStatus: { type: String, default: 'not_started' },
  evaluationJobId: String,
  questions: [mongoose.Schema.Types.Mixed],
  answers: [mongoose.Schema.Types.Mixed],
  currentScore: { type: Number, default: 0 },
  suspiciousActivities: [mongoose.Schema.Types.Mixed],
  activityRiskLevel: { type: String, default: 'low' },
  lastActivityReport: Date
}, { optimisticConcurrency: true });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
