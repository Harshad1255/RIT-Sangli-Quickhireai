const mongoose = require('mongoose');

const codingQuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
    index: true,
  },
  topic: {
    type: String,
    required: true,
    index: true,
  },
  tags: [{
    type: String,
    index: true,
  }],
  companies: [{
    type: String,
    index: true,
  }],
  problemStatement: {
    type: String,
    required: true,
  },
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  constraints: [{
    type: String
  }],
  hints: [{
    type: String
  }],
  editorial: {
    type: String,
    default: ''
  },
  starterCode: {
    cpp: { type: String, default: '' },
    java: { type: String, default: '' },
    python: { type: String, default: '' },
    javascript: { type: String, default: '' }
  },
  acceptanceRate: {
    type: Number,
    default: 75.0
  },
  totalSubmissions: {
    type: Number,
    default: 0
  },
  acceptedSubmissions: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'coding_questions'
});

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
