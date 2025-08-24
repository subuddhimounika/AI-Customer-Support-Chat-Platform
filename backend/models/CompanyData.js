const mongoose = require('mongoose');

const companyDataSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pdf', 'text', 'html', 'document'],
    required: true
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  category: {
    type: String,
    default: 'General'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: String,
    default: 'Admin'
  }
}, {
  timestamps: true
});

// Text index for content search
companyDataSchema.index({ content: 'text', title: 'text' });

module.exports = mongoose.model('CompanyData', companyDataSchema);