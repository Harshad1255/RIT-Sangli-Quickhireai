const mongoose = require('mongoose');

const scholasticPracticeSetSchema = new mongoose.Schema({
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    default: ''
  },
  category: { 
    type: String,
    required: true
  },
  topics: [{ 
    type: String 
  }],
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  questions: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ScholasticAptitudeQuestion' 
  }],
  timeLimitMinutes: { 
    type: Number, 
    default: 0 // 0 means no time limit
  },
  xpReward: { 
    type: Number, 
    default: 50 
  },
  status: { 
    type: String, 
    enum: ['Draft', 'Published', 'Archived'], 
    default: 'Draft',
    index: true
  },
  totalAttempts: { 
    type: Number, 
    default: 0 
  },
  averageScore: {
    type: Number,
    default: 0
  },
  averageAccuracy: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  collection: 'scholastic_practice_sets',
  timestamps: true 
});

module.exports = mongoose.model('ScholasticPracticeSet', scholasticPracticeSetSchema);
