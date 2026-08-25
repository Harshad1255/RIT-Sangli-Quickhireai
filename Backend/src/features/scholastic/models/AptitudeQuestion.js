const mongoose = require('mongoose');

const aptitudeQuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  options: [{
    id: Number,
    text: String
  }],
  correctOptionId: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true, // e.g., 'Quantitative Aptitude', 'Logical Reasoning', etc.
    index: true
  },
  subCategory: {
    type: String,
    default: '',
    index: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
    index: true
  },
  companies: [{
    type: String, // e.g. ['TCS', 'Infosys', 'Amazon']
    index: true
  }],
  hint: {
    type: String,
    default: ''
  },
  explanation: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  accuracy: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  correctAttempts: {
    type: Number,
    default: 0
  },
  averageTimeSeconds: {
    type: Number,
    default: 60
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'aptitude_questions'
});

module.exports = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);
