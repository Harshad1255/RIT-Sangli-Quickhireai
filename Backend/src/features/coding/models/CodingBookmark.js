const mongoose = require('mongoose');

const codingBookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

codingBookmarkSchema.index({ userId: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model('CodingBookmark', codingBookmarkSchema);
