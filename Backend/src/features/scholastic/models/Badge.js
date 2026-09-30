const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'fas fa-medal',
  },
  color: {
    type: String,
    default: '#f59e0b',
  },
  criteria: {
    metric: {
      type: String,
      enum: [
        'lifetime_solved_total',
        'lifetime_solved_aptitude',
        'lifetime_solved_coding',
        'daily_solved_count',
        'daily_streak',
        'perfect_score_count',
        'combo_day',
        'subject_mastery_count'
      ]
    },
    threshold: {
      type: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'badges'
});

module.exports = mongoose.model('Badge', badgeSchema);
