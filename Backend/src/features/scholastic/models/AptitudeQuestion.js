const mongoose = require('mongoose');

const aptitudeQuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  questionImageUrl: {
    type: String,
    default: ''
  },
  options: [{
    id: Number,
    text: String
  }],
  correctOptionId: {
    type: Number,
    required: false,
    default: null
  },
  questionType: {
    type: String,
    enum: ['Multiple Choice', 'Multiple Select', 'True/False'],
    default: 'Multiple Choice'
  },
  correctOptionIds: [{
    type: Number
  }],
  category: {
    type: String,
    required: true, // e.g., 'Quantitative Aptitude', 'Logical Reasoning', etc.
    index: true
  },
  subCategory: {
    type: String,
    default: '',
    index: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
    index: true
  },
  companies: [{
    type: String, // e.g. ['TCS', 'Infosys', 'Amazon']
    index: true
  }],
  hint: {
    type: String,
    default: ''
  },
  explanation: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  accuracy: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  correctAttempts: {
    type: Number,
    default: 0
  },
  averageTimeSeconds: {
    type: Number,
    default: 60
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  // PYQ Metadata
  isPYQ: { type: Boolean, default: false },
  pyqMeta: {
    company: { type: String },
    year: { type: Number },
    round: { type: String }
  },
  source: { type: String, enum: ['manual', 'ai-generated'], default: 'manual' },
  xp: {
    type: Number,
    default: 10
  }
}, {
  collection: 'aptitude_questions'
});

module.exports = mongoose.model('ScholasticAptitudeQuestion', aptitudeQuestionSchema, 'aptitude_questions');
