const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'manual'
  },
  createdBy: {
    type: String,
    default: 'Admin'
  }
}, {
  timestamps: true
});

// Add text index for searching
faqSchema.index({ question: 'text', answer: 'text', keywords: 'text' });

// Add compound index for better query performance
faqSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('FAQ', faqSchema);