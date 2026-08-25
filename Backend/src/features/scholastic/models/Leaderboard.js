const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  university: {
    type: String,
    default: 'General',
    index: true,
  },
  totalXP: {
    type: Number,
    default: 0,
    index: true,
  },
  contestRating: {
    type: Number,
    default: 1200,
    index: true,
  },
  aptitudeSolvedCount: {
    type: Number,
    default: 0,
  },
  codingSolvedCount: {
    type: Number,
    default: 0,
  },
  totalSolvedCount: {
    type: Number,
    default: 0,
  },
  streakDays: {
    type: Number,
    default: 0,
  },
  medals: {
    gold: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    bronze: { type: Number, default: 0 }
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'leaderboards'
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
