const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// Get all conversations for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific conversation
router.get('/:userId/:conversationId', async (req, res) => {
  try {
    const { userId, conversationId } = req.params;
    const conversation = await Conversation.findOne({ _id: conversationId, userId });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a conversation
router.delete('/:userId/:conversationId', async (req, res) => {
  try {
    const { userId, conversationId } = req.params;
    const conversation = await Conversation.findOneAndDelete({ _id: conversationId, userId });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;