const mongoose = require('mongoose');

const topicProgressSchema = new mongoose.Schema({
  subtopic: { type: String, required: true },
  category: { type: String, required: true },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  lastPracticed: { type: Date }
}, { _id: false });

const aptitudeProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalAttempted: { type: Number, default: 0 },
  totalCorrect: { type: Number, default: 0 },
  overallAccuracy: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: Date },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }],
  topicProgress: [topicProgressSchema],
  adaptiveDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' }
}, { timestamps: true });

module.exports = mongoose.model('AptitudeProgress', aptitudeProgressSchema);
