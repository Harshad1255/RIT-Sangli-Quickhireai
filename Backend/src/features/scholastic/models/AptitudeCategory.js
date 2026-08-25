const mongoose = require('mongoose');

const aptitudeCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  section: {
    type: String,
    enum: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation', 'Puzzles', 'General'],
    default: 'Quantitative Aptitude'
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'fas fa-brain',
  },
  questionCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'aptitude_categories'
});

module.exports = mongoose.model('AptitudeCategory', aptitudeCategorySchema);
