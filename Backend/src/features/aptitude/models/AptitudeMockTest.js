const mongoose = require('mongoose');

const { APTITUDE_CATEGORIES } = require('../constants/categories');

const topicMixSchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: Object.keys(APTITUDE_CATEGORIES), 
    required: true 
  },
  subtopics: [{ type: String }],
  questionCount: { type: Number, required: true, min: 1 },
  difficultyDistribution: { 
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  }
}, { _id: false });

const aptitudeMockTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  
  // New unified fields for test blueprints
  testType: { 
    type: String, 
    enum: ['chapter', 'mixed-chapter', 'mixed-subject', 'full-mock', 'company-pyq'],
    default: 'full-mock'
  },
  topicMix: [topicMixSchema],
  generationMode: { 
    type: String, 
    enum: ['fixed', 'randomized-per-attempt'], 
    default: 'fixed' 
  },

  // Legacy fields (kept for backward compatibility, optionally deprecated)
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
