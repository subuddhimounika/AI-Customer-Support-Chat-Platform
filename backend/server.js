const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
// app.use(cors());
app.use(cors({
  origin: [
    "https://ai-customer-support-chat-platform-1.onrender.com" // your deployed frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;

console.log('🔗 Attempting to connect to MongoDB...');
console.log('📝 Connection string:', mongoURI);

mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });

// Get Mongoose connection object
const db = mongoose.connection;

// Event handlers for connection
db.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});

db.once('open', () => {
  console.log('✅ MongoDB connection established');
});

db.on('disconnected', () => {
  console.log('❌ MongoDB connection disconnected');
});

// Import routes
const conversationRoutes = require('./routes/Conversations');
const chatRoutes = require('./routes/chat');
const faqRoutes = require('./routes/faqs'); // Add this line

// Use routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/faqs', faqRoutes); // Add this line

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMessages = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  try {
    // Try to perform a simple database operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    res.json({ 
      message: 'Server is running',
      database: {
        status: statusMessages[dbStatus] || 'unknown',
        name: mongoose.connection.name,
        collections: collectionNames
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      message: 'Server is running but database may have issues',
      database: {
        status: statusMessages[dbStatus] || 'unknown',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint to check if we can save to MongoDB
app.post('/api/test-db', async (req, res) => {
  try {
    const Conversation = require('./models/Conversation');
    const testConversation = new Conversation({
      userId: 'test_user_' + Date.now(),
      title: 'Test Conversation',
      messages: [
        { role: 'user', content: 'Test message from API' },
        { role: 'assistant', content: 'Test response from API' }
      ]
    });
    
    const savedConversation = await testConversation.save();
    
    res.json({
      success: true,
      message: 'Test conversation saved successfully',
      conversationId: savedConversation._id
    });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test conversation',
      error: error.message
    });
  }
});

// Test FAQ endpoint
app.get('/api/test-faqs', async (req, res) => {
  try {
    const FAQ = require('./models/FAQ');
    
    // Check if FAQ model exists and can be queried
    const faqCount = await FAQ.countDocuments();
    res.json({
      success: true,
      message: 'FAQ endpoint is working',
      faqCount: faqCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'FAQ endpoint error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📋 MongoDB connection state:', mongoose.connection.readyState);
  console.log('🌐 Health check available at: https://ai-customer-support-chat-platform.onrender.com ' + '/api/health');
  console.log('🧪 Test DB endpoint: POST https://ai-customer-support-chat-platform.onrender.com' + '/api/test-db');
  console.log('📚 Test FAQ endpoint: GET https://ai-customer-support-chat-platform.onrender.com'+ '/api/test-faqs');
  console.log('📝 FAQ endpoints:');
  console.log('   - GET https://ai-customer-support-chat-platform.onrender.com' + '/api/faqs');
  console.log('   - POST https://ai-customer-support-chat-platform.onrender.com' + '/api/faqs');
  console.log('   - POST https://ai-customer-support-chat-platform.onrender.com' + '/api/faqs/upload');
});
