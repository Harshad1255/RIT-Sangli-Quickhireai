const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
  },
  contestType: {
    type: String,
    enum: ['Coding', 'Aptitude', 'Mixed', 'Weekly Challenge'],
    default: 'Mixed',
  },
  codingQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingQuestion'
  }],
  aptitudeQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AptitudeQuestion'
  }],
  participantCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'contests'
});

module.exports = mongoose.model('Contest', contestSchema);
