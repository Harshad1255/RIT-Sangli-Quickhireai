const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: 'Solve today\'s challenge to earn XP and coins!',
  },
  questionType: {
    type: String,
    enum: ['aptitude', 'coding'],
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  xpReward: {
    type: Number,
    default: 50,
  },
  coinReward: {
    type: Number,
    default: 20,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'daily_challenges'
});

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
