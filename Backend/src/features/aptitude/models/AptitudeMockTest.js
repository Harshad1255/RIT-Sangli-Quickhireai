const mongoose = require('mongoose');

const aptitudeMockTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String },
  subtopics: [{ type: String }],
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion' }],
  duration: { type: Number, default: 3600 },
  totalMarks: { type: Number, default: 0 },
  negativeMarking: { type: Number, default: 0.25 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Mixed'], default: 'Mixed' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AptitudeMockTest', aptitudeMockTestSchema);
