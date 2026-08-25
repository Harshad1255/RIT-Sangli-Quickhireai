const mongoose = require('mongoose');

const userStatisticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  xp: {
    type: Number,
    default: 0,
  },
  coins: {
    type: Number,
    default: 100,
  },
  level: {
    type: Number,
    default: 1,
  },
  badgesEarned: [{
    badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
    earnedAt: { type: Date, default: Date.now }
  }],
  achievementsUnlocked: [{
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now }
  }],
  dailyChallengesCompletedCount: {
    type: Number,
    default: 0,
  },
  spinRewardsClaimed: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'user_statistics'
});

module.exports = mongoose.model('UserStatistics', userStatisticsSchema);
