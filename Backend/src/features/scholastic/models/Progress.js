const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  dailyStreak: {
    type: Number,
    default: 0,
  },
  lastActiveDate: {
    type: Date,
    default: Date.now,
  },
  questionsSolved: {
    aptitude: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    coding: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  },
  overallAccuracy: {
    type: Number,
    default: 0,
  },
  topicProficiency: [{
    topic: String,
    category: { type: String, enum: ['aptitude', 'coding'] },
    solvedCount: Number,
    accuracy: Number,
    level: { type: String, enum: ['Weak', 'Moderate', 'Strong'], default: 'Moderate' }
  }],
  heatmap: [{
    date: { type: String }, // 'YYYY-MM-DD'
    count: { type: Number, default: 0 },
    aptitudeCount: { type: Number, default: 0 },
    codingCount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],
  dailySolved: [{ 
    date: String, 
    aptitude: { type: Number, default: 0 }, 
    coding: { type: Number, default: 0 } 
  }],
  bestDailySolvedCount: { type: Number, default: 0 },
  perfectScoreCount: { type: Number, default: 0 },
  averageTimeSeconds: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'progress'
});

module.exports = mongoose.model('ScholasticProgress', progressSchema);
