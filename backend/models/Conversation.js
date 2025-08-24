const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  title: {
    type: String,
    default: 'New Conversation'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate title from first user message if it's a new conversation
  if (this.isNew && this.messages.length > 0 && this.title === 'New Conversation') {
    const firstUserMessage = this.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      this.title = firstUserMessage.content.substring(0, 30) + 
                  (firstUserMessage.content.length > 30 ? '...' : '');
    }
  }
  
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);