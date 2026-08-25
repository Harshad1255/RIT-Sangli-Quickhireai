const mongoose = require('mongoose');
const { APTITUDE_CATEGORIES, DIFFICULTIES, COMPANY_TAGS } = require('../constants/categories');

const allTopics = Object.keys(APTITUDE_CATEGORIES);
const allSubtopics = Object.values(APTITUDE_CATEGORIES).flat();

const aptitudeQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [{ label: String, value: String }],
    required: true,
    validate: [v => v.length >= 2, 'At least 2 options required']
  },
  correctAnswer: { type: String, required: true },
  difficulty: { type: String, enum: DIFFICULTIES, default: 'Medium' },
  category: { type: String, enum: allTopics, required: true },
  subtopic: { type: String, enum: allSubtopics, required: true },
  explanation: { type: String, default: '' },
  hints: [{ type: String }],
  timeLimit: { type: Number, default: 60 },
  companyTags: [{ type: String, enum: COMPANY_TAGS }],
  negativeMarking: { type: Number, default: 0.25 },
  marks: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

aptitudeQuestionSchema.index({ category: 1, subtopic: 1, difficulty: 1 });
aptitudeQuestionSchema.index({ companyTags: 1 });
aptitudeQuestionSchema.index({ question: 'text' });

module.exports = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);
