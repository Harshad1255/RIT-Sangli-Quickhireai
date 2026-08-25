const mongoose = require('mongoose');

const aptitudeLeaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  totalXp: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  weeklyXp: { type: Number, default: 0 },
  monthlyXp: { type: Number, default: 0 },
  category: { type: String, default: 'overall' },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'all-time'], default: 'all-time' }
}, { timestamps: true });

aptitudeLeaderboardSchema.index({ period: 1, category: 1, totalXp: -1 });
aptitudeLeaderboardSchema.index({ userId: 1, period: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('AptitudeLeaderboard', aptitudeLeaderboardSchema);
