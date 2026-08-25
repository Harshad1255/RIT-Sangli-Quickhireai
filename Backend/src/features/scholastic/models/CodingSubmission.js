const mongoose = require('mongoose');

const codingSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingQuestion',
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    enum: ['cpp', 'java', 'python', 'javascript'],
    required: true,
  },
  status: {
    type: String,
    enum: [
      'Accepted',
      'Wrong Answer',
      'Compilation Error',
      'Runtime Error',
      'Time Limit Exceeded',
      'Memory Limit Exceeded',
      'Presentation Error'
    ],
    required: true,
    index: true,
  },
  executionTimeMs: {
    type: Number,
    default: 0,
  },
  memoryUsageKb: {
    type: Number,
    default: 0,
  },
  testcasesPassed: {
    type: Number,
    default: 0,
  },
  totalTestcases: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  }
}, {
  collection: 'scholastic_coding_submissions'
});

module.exports = mongoose.model('ScholasticCodingSubmission', codingSubmissionSchema);
