const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  itemType: {
    type: String,
    enum: ['aptitude', 'coding', 'mocktest'],
    required: true,
  },
  itemId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true,
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'bookmarks'
});

// Ensure one bookmark per user per item
bookmarkSchema.index({ userId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
