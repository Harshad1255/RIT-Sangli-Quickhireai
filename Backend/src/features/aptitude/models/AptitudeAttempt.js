const mongoose = require('mongoose');
const { PRACTICE_MODES } = require('../constants/categories');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion' },
  questionIndex: { type: Number }, // Index of the question in AptitudeTest.questions
  selectedAnswer: { type: Number }, // Unified answer key
  isCorrect: { type: Boolean, default: false },
  markedForReview: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 }
}, { _id: false });

const sectionScoreSchema = new mongoose.Schema({
  sectionName: { type: String, required: true },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  score: { type: Number, default: 0 }
}, { _id: false });

const aptitudeAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeTest', index: true },
  mode: { type: String, enum: PRACTICE_MODES, default: 'practice' },
  category: { type: String },
  subtopic: { type: String },
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeMockTest' },
  answers: [answerSchema],
  codingAnswers: [{
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' },
    code: { type: String, default: '' },
    language: { type: String, default: 'javascript' },
    status: { type: String, default: 'Not Attempted' },
    score: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 }
  }],
  sectionScores: [sectionScoreSchema],
  score: { type: Number, default: 0 },
  codingScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  attemptedCount: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  timeRemainingSnapshot: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  autoSubmitted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  completedAt: { type: Date },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeSlot', default: null },
  slotStartTime: { type: Date, default: null },
  slotEndTime: { type: Date, default: null },
  attemptDeadline: { type: Date, default: null },
  lastHeartbeatAt: { type: Date, default: null },
  activeSessionId: { type: String, default: null },
  serverNowAtStart: { type: Date, default: null },
  maxViolationCount: { type: Number, default: 3 },
  suspicious: { type: Boolean, default: false },
  questionOrder: { type: [Number], default: [] },
  optionOrders: { type: [[Number]], default: [] },
  
  // Security and Exam Mode tracking
  sessionId: { type: String },
  fullscreenExitCount: { type: Number, default: 0 },
  tabSwitchCount: { type: Number, default: 0 },
  windowBlurCount: { type: Number, default: 0 },
  copyAttemptCount: { type: Number, default: 0 },
  pasteAttemptCount: { type: Number, default: 0 },
  cutAttemptCount: { type: Number, default: 0 },
  violationEvents: [{
    type: { type: String }, // 'fullscreen_exit', 'tab_switch', 'copy', 'paste', 'cut'
    message: { type: String },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  lastActivityAt: { type: Date },
  serverStartTime: { type: Date },
  serverDeadline: { type: Date },
  submissionStatus: { type: String, enum: ['in_progress', 'submitted', 'auto_submitted', 'terminated_violation'], default: 'in_progress' },
  securitySummary: {
    totalViolations: { type: Number, default: 0 },
    highestSeverity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    lastViolationAt: { type: Date }
  },
  
  // Webcam Proctoring fields
  referencePhotoUrl: { type: String, default: null },
  idCardPhotoUrl: { type: String, default: null },
  consentAccepted: { type: Boolean, default: false },
  consentAcceptedAt: { type: Date, default: null },
  hmacSecret: { type: String, default: null },
  suspicionScore: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save hook to mirror userId and studentId for backward compatibility
aptitudeAttemptSchema.pre('save', function(next) {
  if (this.userId && !this.studentId) {
    this.studentId = this.userId;
  } else if (this.studentId && !this.userId) {
    this.userId = this.studentId;
  }
  if (this.score !== undefined && this.totalScore === 0) {
    this.totalScore = this.score;
  } else if (this.totalScore !== undefined && this.score === 0) {
    this.score = this.totalScore;
  }
  next();
});

module.exports = mongoose.model('AptitudeAttempt', aptitudeAttemptSchema);
