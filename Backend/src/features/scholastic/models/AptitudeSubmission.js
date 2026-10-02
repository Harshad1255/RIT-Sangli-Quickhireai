const mongoose = require('mongoose');

const aptitudeSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AptitudeQuestion',
    required: true,
    index: true,
  },
  selectedOptionId: {
    type: Number,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  timeTakenSeconds: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  }
}, {
  collection: 'scholastic_aptitude_submissions'
});

// Idempotency: Create a unique compound index so a user cannot have duplicate accepted records for the same question
// Actually, they can try multiple times, but we only want to track if they solved it.
// We can just rely on the controller querying for a prior 'isCorrect: true' submission.

module.exports = mongoose.model('ScholasticAptitudeSubmission', aptitudeSubmissionSchema);
