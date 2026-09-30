const mongoose = require('mongoose');

const testSlotSchema = new mongoose.Schema({
  label: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  capacity: { type: Number, default: null }, // null = unlimited
  assignedCandidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['scheduled', 'active', 'closed', 'cancelled'], default: 'scheduled' },
  order: { type: Number, required: true }
}, { _id: true, timestamps: true });

module.exports = testSlotSchema;
