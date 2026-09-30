const mongoose = require('mongoose');

const mockTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  testType: {
    type: String,
    enum: ['Topic Wise', 'Company Wise', 'Mixed', 'Placement Test', 'Coding Test', 'Custom Test'],
    default: 'Placement Test',
    index: true,
  },
  company: {
    type: String,
    default: 'General',
  },
  description: {
    type: String,
    default: '',
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 60,
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 100,
  },
  negativeMarking: {
    type: Boolean,
    default: false,
  },
  negativeMarkValue: {
    type: Number,
    default: 0.25,
  },
  aptitudeQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScholasticAptitudeQuestion'
  }],
  codingQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingQuestion'
  }],
  totalAttemptsCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'mock_tests'
});

module.exports = mongoose.model('MockTest', mockTestSchema);
