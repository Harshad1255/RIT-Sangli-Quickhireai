const mongoose = require('mongoose');
const { APTITUDE_CATEGORIES, DIFFICULTIES, COMPANY_TAGS } = require('../constants/categories');

const allTopics = Object.keys(APTITUDE_CATEGORIES);
const allSubtopics = Object.values(APTITUDE_CATEGORIES).flat();

const aptitudeQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  questionImageUrl: { type: String, default: '' },
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
  
  // PYQ Metadata
  isPYQ: { type: Boolean, default: false },
  pyqMeta: {
    company: { type: String },
    year: { type: Number },
    round: { type: String }
  },

  negativeMarking: { type: Number, default: 0.25 },
  marks: { type: Number, default: 1 },
  source: { type: String, enum: ['manual', 'ai-generated'], default: 'manual' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

aptitudeQuestionSchema.index({ category: 1, subtopic: 1, difficulty: 1 });
aptitudeQuestionSchema.index({ companyTags: 1 });
aptitudeQuestionSchema.index({ question: 'text' });

module.exports = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);
