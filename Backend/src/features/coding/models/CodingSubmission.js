const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testCaseId: { type: mongoose.Schema.Types.ObjectId },
  input: { type: String },
  expectedOutput: { type: String },
  actualOutput: { type: String },
  passed: { type: Boolean, default: false },
  runtime: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  isSample: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false }
}, { _id: false });

const codingSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem', required: true, index: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingContest' },
  language: { type: String, required: true },
  code: { type: String },
  sourceCode: { type: String },
  verdict: { 
    type: String, 
    enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error', 'Pending'], 
    default: 'Wrong Answer' 
  },
  testResults: [testResultSchema],
  passedTests: { type: Number, default: 0 },
  passedCount: { type: Number, default: 0 },
  totalTests: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  runtime: { type: Number, default: 0 },
  runtimeMs: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  executionLogs: { type: String, default: '' },
  xpEarned: { type: Number, default: 0 },
  isRun: { type: Boolean, default: false },
  isRunOnly: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

codingSubmissionSchema.pre('save', function(next) {
  if (this.userId && !this.studentId) {
    this.studentId = this.userId;
  } else if (this.studentId && !this.userId) {
    this.userId = this.studentId;
  }
  if (this.code && !this.sourceCode) {
    this.sourceCode = this.code;
  } else if (this.sourceCode && !this.code) {
    this.code = this.sourceCode;
  }
  if (this.passedTests !== undefined && !this.passedCount) {
    this.passedCount = this.passedTests;
  } else if (this.passedCount !== undefined && !this.passedTests) {
    this.passedTests = this.passedCount;
  }
  if (this.totalTests !== undefined && !this.totalCount) {
    this.totalCount = this.totalTests;
  } else if (this.totalCount !== undefined && !this.totalTests) {
    this.totalTests = this.totalCount;
  }
  if (this.runtime !== undefined && !this.runtimeMs) {
    this.runtimeMs = this.runtime;
  } else if (this.runtimeMs !== undefined && !this.runtime) {
    this.runtime = this.runtimeMs;
  }
  if (this.isRun !== undefined && !this.isRunOnly) {
    this.isRunOnly = this.isRun;
  } else if (this.isRunOnly !== undefined && !this.isRun) {
    this.isRun = this.isRunOnly;
  }
  next();
});

codingSubmissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

module.exports = mongoose.model('CodingSubmission', codingSubmissionSchema);
