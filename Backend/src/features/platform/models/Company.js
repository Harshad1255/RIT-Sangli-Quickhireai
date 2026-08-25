const mongoose = require('mongoose');
const { COMPANY_TAGS } = require('../../aptitude/constants/categories');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, enum: COMPANY_TAGS },
  logo: { type: String, default: '' },
  description: { type: String, default: '' },
  aptitudeQuestionCount: { type: Number, default: 0 },
  codingQuestionCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
