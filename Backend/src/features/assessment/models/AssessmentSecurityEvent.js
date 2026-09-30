const mongoose = require('mongoose');

const assessmentSecurityEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  assessmentType: {
    type: String,
    enum: ['aptitude', 'coding', 'practice', 'interview'],
    required: true,
    index: true
  },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, index: true },
  attemptId: { type: mongoose.Schema.Types.ObjectId, index: true },
  sessionId: { type: String, index: true },
  eventId: { type: String, unique: true, sparse: true, index: true },
  eventSequence: { type: Number, default: 0 },
  eventType: { type: String, required: true, index: true },
  message: { type: String, required: true },
  snapshotUrl: { type: String, default: null },
  occurredAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

assessmentSecurityEventSchema.index({ attemptId: 1, eventType: 1, eventId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('AssessmentSecurityEvent', assessmentSecurityEventSchema);
