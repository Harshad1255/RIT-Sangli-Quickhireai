const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'fas fa-medal',
  },
  color: {
    type: String,
    default: '#f59e0b',
  },
  criteria: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'badges'
});

module.exports = mongoose.model('Badge', badgeSchema);
