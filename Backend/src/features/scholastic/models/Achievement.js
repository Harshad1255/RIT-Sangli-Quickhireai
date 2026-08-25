const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'fas fa-trophy',
  },
  xpReward: {
    type: Number,
    default: 100,
  },
  category: {
    type: String,
    enum: ['aptitude', 'coding', 'streak', 'contest', 'general'],
    default: 'general',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'achievements'
});

module.exports = mongoose.model('Achievement', achievementSchema);
