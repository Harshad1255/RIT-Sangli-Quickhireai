const mongoose = require('mongoose');

const aptitudeBookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

aptitudeBookmarkSchema.index({ userId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('AptitudeBookmark', aptitudeBookmarkSchema);
