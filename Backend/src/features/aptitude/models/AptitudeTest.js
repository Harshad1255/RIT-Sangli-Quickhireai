const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  originalIndex: { type: Number, required: true },
  text: { type: String, required: true }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true, default: 'General' },
  text: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  options: { type: [optionSchema], validate: v => v.length >= 2 },
  correctAnswer: { type: Number, required: true },
  marks: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0.25 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
});

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  timeLimitMinutes: { type: Number, default: 0 } // 0 means test-level time limit applies
}, { _id: false });

const assignedCandidateSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['Not Started', 'In Progress', 'Completed'], 
    default: 'Not Started' 
  },
  dueDate: { type: Date },
  accessGranted: { type: Boolean, default: false },
  joinedViaCode: { type: Boolean, default: false },
  joinedAt: { type: Date, default: null }
}, { _id: false });

const aptitudeTestSchema = new mongoose.Schema({
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  title: { type: String, required: true, trim: true },
  linkedInterviewId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Interview', 
    default: null 
  },
  sections: [sectionSchema],
  totalTimeMinutes: { type: Number, required: true, default: 60 },
  passThreshold: { type: Number, default: 60 }, // Percentage threshold e.g. 60%
  showAnswersAfterSubmit: { type: Boolean, default: true },
  questions: [questionSchema],
  codingProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' }],
  assignedCandidates: [assignedCandidateSchema],
  slots: [require('./TestSlot')],
  schedulingMode: { type: String, enum: ['always_open', 'single_window', 'multi_slot'], default: 'always_open' },
  allowMultipleAttempts: { type: Boolean, default: false },
  maxViolationCount: { type: Number, default: 3 },
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false }, // Track published status
  entranceCode: { 
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  createdAt: { type: Date, default: Date.now }
}, { 
  collection: 'aptitude_tests',
  timestamps: true 
});

module.exports = mongoose.model('AptitudeTest', aptitudeTestSchema);
