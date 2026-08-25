const mongoose = require('mongoose');

const contestRegistrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
    index: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  score: {
    type: Number,
    default: 0,
  },
  rank: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Registered', 'Participated', 'Completed'],
    default: 'Registered',
  }
}, {
  collection: 'contest_registrations'
});

contestRegistrationSchema.index({ userId: 1, contestId: 1 }, { unique: true });

module.exports = mongoose.model('ContestRegistration', contestRegistrationSchema);
