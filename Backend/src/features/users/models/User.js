const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['student', 'company'],
    required: true,
  },
  // Common fields
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  // Student specific fields
  name: {
    type: String,
    required: function() {
      return this.userType === 'student';
    },
  },
  university: {
    type: String,
    required: function() {
      return this.userType === 'student';
    },
  },
  graduationYear: {
    type: Number,
    required: function() {
      return this.userType === 'student';
    },
  },
  hiddenAptitudeTests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeTest' }],
  // Company specific fields
  companyName: {
    type: String,
    required: function() {
      return this.userType === 'company';
    },
  },
  industry: {
    type: String,
    required: function() {
      return this.userType === 'company';
    },
  },
  companySize: {
    type: String,
    required: function() {
      return this.userType === 'company';
    },
    enum: ['1-50', '51-200', '201-500', '501-1000', '1000+'],
  },
});

// Update lastLogin timestamp on login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  await this.save();
};

module.exports = mongoose.model('User', userSchema); 