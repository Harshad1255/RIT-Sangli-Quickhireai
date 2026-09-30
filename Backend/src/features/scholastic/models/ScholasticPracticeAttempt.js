const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ScholasticAptitudeQuestion',
    required: true
  },
  selectedOptionId: { 
    type: Number,
    default: null
  },
  isCorrect: { 
    type: Boolean,
    default: false
  },
  timeTakenSeconds: { 
    type: Number,
    default: 0
  }
}, { _id: false });

const scholasticPracticeAttemptSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  practiceSetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ScholasticPracticeSet', 
    required: true,
    index: true
  },
  answers: [answerSchema],
  status: { 
    type: String, 
    enum: ['In Progress', 'Completed'], 
    default: 'In Progress' 
  },
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: {
    type: Date
  },
  submittedAt: { 
    type: Date 
  },
  totalQuestions: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  timeTakenSeconds: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 }
}, {
  collection: 'scholastic_practice_attempts',
  timestamps: true
});

module.exports = mongoose.model('ScholasticPracticeAttempt', scholasticPracticeAttemptSchema);
