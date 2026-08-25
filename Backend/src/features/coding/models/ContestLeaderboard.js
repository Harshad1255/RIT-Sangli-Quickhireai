const mongoose = require('mongoose');

const contestRankingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  score: { type: Number, default: 0 },
  penalty: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  problemsSolved: { type: Number, default: 0 },
  finishTime: { type: Date }
}, { _id: false });

const contestLeaderboardSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingContest', required: true },
  rankings: [contestRankingSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

contestLeaderboardSchema.index({ contestId: 1 }, { unique: true });

module.exports = mongoose.model('ContestLeaderboard', contestLeaderboardSchema);
