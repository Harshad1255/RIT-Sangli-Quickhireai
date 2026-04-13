const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  },
  code: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'expired'],
    default: 'pending'
  },
  results: {
    technicalScore: {
      type: Number,
      min: 0,
      max: 10
    },
    communicationScore: {
      type: Number,
      min: 0,
      max: 10
    },
    problemSolvingScore: {
      type: Number,
      min: 0,
      max: 10
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 10
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 10
    },
    strengths: [String],
    weaknesses: [String],
    feedback: String,
    answers: [{
      question: String,
      answer: String,
      score: Number,
      feedback: String
    }]
  },
  startedAt: Date,
  completedAt: Date
});

const interviewSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  skills: [{
    type: String,
    required: true
  }],
  duration: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  },
  interviewCode: {
    type: String,
    unique: true
  },
  candidates: [CandidateSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

interviewSchema.index({ "candidates.code": 1 }, { unique: true, sparse: true });

// Generate unique interview code
interviewSchema.pre('save', async function(next) {
  if (!this.interviewCode) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.interviewCode = code;
  }
  next();
});

// Generate unique candidate code
interviewSchema.methods.generateCandidateCode = function() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Calculate overall score
interviewSchema.methods.calculateOverallScore = function(technical, communication, problemSolving, confidence) {
  return Math.round(
    (technical * 0.4) + 
    (communication * 0.3) + 
    (problemSolving * 0.2) + 
    (confidence * 0.1)
  );
};

module.exports = mongoose.model('Interview', interviewSchema); 