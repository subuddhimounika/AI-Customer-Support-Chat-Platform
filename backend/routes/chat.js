const express = require('express');
const OpenRouterClient = require('../utils/openrouter');
const router = express.Router();
const Conversation = require('../models/Conversation');
const FAQ = require('../models/FAQ');

// Initialize OpenRouter client
const openrouter = new OpenRouterClient();

// System prompt for the AI
const SYSTEM_PROMPT = `You are a helpful and friendly customer support agent for a company. 
Your goal is to assist customers with their questions and issues in a professional and efficient manner.
Always be polite, empathetic, and focused on providing solutions.

If you don't know the answer to a question, honestly say so and offer to escalate the issue to a human agent.
Keep your responses concise but helpful.`;

// Get response from AI
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, conversationId } = req.body;

    console.log(`💬 Chat request from user: ${userId}`);
    console.log(`📝 Message: ${message}`);
    console.log(`💾 Conversation ID: ${conversationId || 'NEW'}`);

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Find or create conversation
    let conversation;
    if (conversationId) {
      // Load existing conversation
      console.log(`🔍 Loading existing conversation: ${conversationId}`);
      conversation = await Conversation.findOne({ _id: conversationId, userId });
      
      if (!conversation) {
        console.log(`❌ Conversation not found: ${conversationId}`);
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      console.log(`✅ Found existing conversation: ${conversation.title}`);
    } else {
      // Create new conversation
      console.log('🆕 Creating new conversation');
      conversation = new Conversation({ 
        userId: userId,
        messages: [],
        title: 'New Conversation'
      });
    }

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    console.log(`✉️ Added user message to conversation`);

    
    // Add at the top with other imports
const ContextHelper = require('../utils/contextHelper');

// Then modify the part where you prepare messages for AI:
// Replace the FAQ checking section with:

// Get relevant context from FAQs and company data
console.log('🔍 Searching for relevant context...');
const context = await ContextHelper.getRelevantContext(message);
console.log('📚 Context found:', context ? 'Yes' : 'No');

// Check if we have a direct answer from FAQs
const directAnswer = await ContextHelper.findDirectAnswer(message);
if (directAnswer) {
  console.log('🎯 Found direct answer in FAQs');
  
  // Add AI response to conversation
  conversation.messages.push({
    role: 'assistant',
    content: directAnswer,
    timestamp: new Date()
  });

  // Save conversation
  await conversation.save();
  
  return res.json({ 
    response: directAnswer, 
    conversationId: conversation._id,
    source: 'faq'
  });
}

let faqContext = '';
if (context) {
  faqContext = `Based on our knowledge base:\n${context}\nPlease use this information to answer the user's question:`;
}

// Prepare messages for OpenRouter with context
const messagesForAI = [
  { 
    role: 'system', 
    content: `${SYSTEM_PROMPT}\n\n${faqContext}\n\nIf the information above doesn't answer the user's question, use your general knowledge to provide a helpful response.` 
  },
  ...conversation.messages.slice(-6).map(msg => ({
    role: msg.role,
    content: msg.content
  }))
];

    // Get response from OpenRouter
    console.log('🤖 Getting AI response...');
    let completion;
    try {
      completion = await openrouter.chatCompletion(messagesForAI);
    } catch (aiError) {
      console.error('❌ AI service completely unavailable:', aiError.message);
      // Use a basic fallback response
      completion = {
        choices: [{
          message: {
            content: "I'm currently experiencing technical difficulties. Please try again in a few moments.",
            role: 'assistant'
          }
        }]
      };
    }

    const aiResponse = completion.choices[0].message.content;
    console.log('✅ AI response received:', aiResponse.substring(0, 50) + '...');

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    console.log('✉️ Added AI response to conversation');

    // Update conversation title if it's a new conversation
    if (!conversationId && conversation.messages.length >= 2) {
      try {
        const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          conversation.title = firstUserMessage.content.substring(0, 30) + 
                              (firstUserMessage.content.length > 30 ? '...' : '');
          console.log(`🏷️ Set conversation title: ${conversation.title}`);
        }
      } catch (error) {
        console.error('Error generating title:', error);
      }
    }

    // Save conversation - THIS IS THE CRITICAL PART
    console.log('💾 Saving conversation to database...');
    try {
      const savedConversation = await conversation.save();
      console.log(`✅ Conversation saved successfully with ID: ${savedConversation._id}`);
      console.log(`📊 Total messages: ${savedConversation.messages.length}`);
      
      // Verify the save worked by checking the database
      const verifiedConv = await Conversation.findById(savedConversation._id);
      if (verifiedConv) {
        console.log(`✅ Verification: Found ${verifiedConv.messages.length} messages in saved conversation`);
      } else {
        console.log('❌ Verification: Conversation not found after save');
      }
      
      res.json({ 
        response: aiResponse, 
        conversationId: savedConversation._id
      });
      
    } catch (saveError) {
      console.error('❌ Failed to save conversation:', saveError.message);
      console.error('Save error details:', saveError);
      
      // Even if save fails, still return the response
      res.json({ 
        response: aiResponse,
        conversationId: conversationId || 'temp',
        error: 'Failed to save conversation'
      });
    }

  } catch (error) {
    console.error('❌ Error in chat endpoint:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Error processing your message',
      error: error.message 
    });
  }
});

module.exports = router;
