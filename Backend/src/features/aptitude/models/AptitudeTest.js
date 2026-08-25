const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true, default: 'General' },
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true, default: 0 },
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
  email: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Not Started', 'In Progress', 'Completed'], 
    default: 'Not Started' 
  },
  dueDate: { type: Date }
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
  assignedCandidates: [assignedCandidateSchema],
  createdAt: { type: Date, default: Date.now }
}, { 
  collection: 'aptitude_tests',
  timestamps: true 
});

module.exports = mongoose.model('AptitudeTest', aptitudeTestSchema);
