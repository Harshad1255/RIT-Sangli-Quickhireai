const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  interviewCode: { type: String, required: true, unique: true },
  skills: [String],
  status: { type: String, default: 'active' },
  startTime: { type: Date, default: Date.now },
  currentQuestionIndex: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 5 },
  questions: [mongoose.Schema.Types.Mixed],
  answers: [mongoose.Schema.Types.Mixed],
  currentScore: { type: Number, default: 0 },
  suspiciousActivities: [mongoose.Schema.Types.Mixed],
  activityRiskLevel: { type: String, default: 'low' },
  lastActivityReport: Date
});

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
