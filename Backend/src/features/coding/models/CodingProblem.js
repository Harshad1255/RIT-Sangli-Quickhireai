const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isSample: { type: Boolean, default: false }, // true = sample/visible, false = hidden
  isHidden: { type: Boolean, default: false },
  timeLimitMs: { type: Number, default: 2000 },
  memoryLimitMb: { type: Number, default: 256 },
  explanation: { type: String, default: '' }
}, { _id: true });

const exampleSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: '' }
}, { _id: false });

const codingProblemSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  statementMarkdown: { type: String, default: '' },
  examples: [exampleSchema],
  constraints: [{ type: String }],
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  category: { type: String, default: 'Algorithms' },
  isDailyChallenge: { type: Boolean, default: false, index: true },
  dailyLabel: { type: String, default: '' },
  tags: [{ type: String }],
  hints: [{ type: String }],
  editorial: { type: String, default: '' },
  entryFunction: { type: String, default: 'solve', trim: true },
  starterCode: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      javascript: 'function solve(nums, target) {\n  return [];\n}',
      python: 'def solve(nums, target):\n    return []',
      java: '// Write Java solution here\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}\n',
      cpp: '// Write C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n'
    }
  },
  testCases: [testCaseSchema],
  linkedInterviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', default: null },
  timeLimit: { type: Number, default: 2000 },
  memoryLimit: { type: Number, default: 256 },
  acceptanceRate: { type: Number, default: 0 },
  totalSubmissions: { type: Number, default: 0 },
  totalAccepted: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

codingProblemSchema.pre('save', function(next) {
  if (this.isDailyChallenge && !this.dailyLabel) {
    this.dailyLabel = 'Daily DSA';
  }
  if (!this.isDailyChallenge && this.category === 'Daily DSA') {
    this.isDailyChallenge = true;
    this.dailyLabel = 'Daily DSA';
  }
  if (this.statementMarkdown && !this.description) {
    this.description = this.statementMarkdown;
  } else if (this.description && !this.statementMarkdown) {
    this.statementMarkdown = this.description;
  }
  if (this.createdBy && !this.companyId) {
    this.companyId = this.createdBy;
  } else if (this.companyId && !this.createdBy) {
    this.createdBy = this.companyId;
  }
  next();
});

codingProblemSchema.index({ difficulty: 1, category: 1 });
codingProblemSchema.index({ title: 'text', description: 'text', statementMarkdown: 'text' });

module.exports = mongoose.model('CodingProblem', codingProblemSchema);
