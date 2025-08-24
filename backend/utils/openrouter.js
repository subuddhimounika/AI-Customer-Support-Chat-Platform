const axios = require('axios');

class OpenRouterClient {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.model = "openai/gpt-oss-20b:free" // Use the working model
    this.lastRequestTime = 0;
  }

  async chatCompletion(messages) {
    // Rate limiting - wait at least 1 second between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }
    
    try {
      console.log(`🤖 Using model: ${this.model}`);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-customer-support-chat-platform-1.onrender.com',
          'X-Title': 'Customer Support AI',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.lastRequestTime = Date.now();
      console.log('✅ AI response successful');
      return data;
      
    } catch (error) {
      console.error('❌ AI model failed:', error.message);
      
      // Fallback response when AI fails
      const userMessage = messages[messages.length - 1]?.content || '';
      const lowerMessage = userMessage.toLowerCase();
      
      let fallbackResponse = "I apologize, but I'm currently unable to process your request. " +
                            "Please try again in a few moments.";
      
      // Simple keyword matching for common questions
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        fallbackResponse = "Hello! I'm currently experiencing technical difficulties, but I'm here to help. Please try your question again in a moment.";
      } else if (lowerMessage.includes('help')) {
        fallbackResponse = "I'd be happy to help! Unfortunately, I'm having temporary technical issues. Please try again shortly.";
      } else if (lowerMessage.includes('thank')) {
        fallbackResponse = "You're welcome! Is there anything else I can help you with?";
      }
      
      // Return a mock response
      return {
        choices: [{
          message: {
            content: fallbackResponse,
            role: 'assistant'
          }
        }]
      };
    }
  }
}

module.exports = OpenRouterClient;