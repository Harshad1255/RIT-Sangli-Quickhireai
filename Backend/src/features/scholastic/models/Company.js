const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  logoUrl: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  industry: {
    type: String,
    default: 'Technology',
  },
  difficultyLevel: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
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
  collection: 'companies'
});

module.exports = mongoose.model('ScholasticCompany', companySchema);
