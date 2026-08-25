const mongoose = require('mongoose');

const codingTestCaseSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingQuestion',
    required: true,
    index: true,
  },
  input: {
    type: String,
    required: true,
  },
  expectedOutput: {
    type: String,
    required: true,
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    default: 10,
  },
  explanation: {
    type: String,
    default: '',
  }
}, {
  collection: 'coding_testcases'
});

module.exports = mongoose.model('CodingTestCase', codingTestCaseSchema);
