const mongoose = require('mongoose');

const mockAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  mockTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockTest',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Timed Out'],
    default: 'In Progress',
  },
  score: {
    type: Number,
    default: 0,
  },
  accuracy: {
    type: Number,
    default: 0,
  },
  timeTakenSeconds: {
    type: Number,
    default: 0,
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    questionType: { type: String, enum: ['aptitude', 'coding'] },
    selectedOptionId: Number,
    codeSubmitted: String,
    language: String,
    isCorrect: Boolean,
    timeTakenSeconds: Number
  }],
  topicBreakdown: [{
    topic: String,
    total: Number,
    correct: Number,
    accuracy: Number
  }],
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date
  }
}, {
  collection: 'mock_attempts'
});

module.exports = mongoose.model('MockAttempt', mockAttemptSchema);
