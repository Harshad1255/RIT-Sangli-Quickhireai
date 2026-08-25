const mongoose = require('mongoose');

const contestProblemSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  points: { type: Number, default: 100 },
  order: { type: Number, default: 0 }
}, { _id: false });

const codingContestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['weekly', 'monthly', 'marathon', 'virtual'], default: 'weekly' },
  problems: [contestProblemSchema],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, default: 7200 },
  isVirtual: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  participants: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

codingContestSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('CodingContest', codingContestSchema);
