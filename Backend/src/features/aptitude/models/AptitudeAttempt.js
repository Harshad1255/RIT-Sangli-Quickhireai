const mongoose = require('mongoose');
const { PRACTICE_MODES } = require('../constants/categories');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion' },
  questionIndex: { type: Number }, // Index of the question in AptitudeTest.questions
  selectedAnswer: { type: String }, // Used in practice mode
  selectedIndex: { type: Number }, // Used in test mode
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
  sectionScores: [sectionScoreSchema],
  score: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  timeRemainingSnapshot: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  autoSubmitted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  completedAt: { type: Date }
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
