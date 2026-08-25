const mongoose = require('mongoose');

const heatmapEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  count: { type: Number, default: 0 }
}, { _id: false });

const solvedProblemSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' },
  solvedAt: { type: Date, default: Date.now },
  language: { type: String },
  runtime: { type: Number, default: 0 }
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: { type: String },
  totalXp: { type: Number, default: 0 },
  aptitudeXp: { type: Number, default: 0 },
  codingXp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  codingStreak: { type: Number, default: 0 },
  aptitudeStreak: { type: Number, default: 0 },
  longestCodingStreak: { type: Number, default: 0 },
  longestAptitudeStreak: { type: Number, default: 0 },
  lastCodingDate: { type: Date },
  lastAptitudeDate: { type: Date },
  dailyGoal: { type: Number, default: 5 },
  dailyGoalProgress: { type: Number, default: 0 },
  solvedProblems: [solvedProblemSchema],
  attemptedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' }],
  acceptanceRate: { type: Number, default: 0 },
  contestRating: { type: Number, default: 1500 },
  ranking: { type: Number, default: 0 },
  badges: [{ type: String }],
  certificates: [{
    title: String,
    type: String,
    issuedAt: { type: Date, default: Date.now },
    url: String
  }],
  heatmap: [heatmapEntrySchema],
  weakAreas: [{ category: String, subtopic: String, accuracy: Number }],
  strongAreas: [{ category: String, subtopic: String, accuracy: Number }],
  interviewReadinessScore: { type: Number, default: 0 },
  studyPlan: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);
