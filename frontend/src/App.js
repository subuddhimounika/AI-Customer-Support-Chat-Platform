import React, { useState, useEffect, useRef} from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminPanel from './components/AdminPanel';
import './App.css';

// Set the base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Main Chat Component
function ChatApp() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [conversations, setConversations] = useState([]);
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize user ID
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      loadConversations(storedUserId);
    } else {
      const newUserId = 'user_' + Date.now();
      localStorage.setItem('userId', newUserId);
      setUserId(newUserId);
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/conversations/${userId}`);
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/conversations/${userId}/${conversationId}`);
      setMessages(response.data.messages);
      setConversationId(conversationId);
      setShowConversations(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId('');
    setShowConversations(false);
  };

  // Add delete conversation function
  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation(); // Prevent triggering the conversation load
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/conversations/${userId}/${conversationId}`);
        
        // Remove the conversation from the local state
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        
        // If the deleted conversation was currently active, clear the chat
        if (conversationId === conversationId) {
          setMessages([]);
          setConversationId('');
        }
        
        console.log('Conversation deleted successfully');
      } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat/${userId}`, {
        message: inputMessage,
        conversationId: conversationId
      });
      
      const aiMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.data.conversationId !== conversationId) {
        setConversationId(response.data.conversationId);
        loadConversations(userId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>AI Customer Support</h1>
        <div className="header-actions">
          <button 
            className="conversations-toggle"
            onClick={() => setShowConversations(!showConversations)}
          >
            {showConversations ? 'Hide' : 'Show'} Conversations
          </button>
          {/* <a href="/admin" className="admin-link">Admin Panel</a> */}
          <button 
  className="admin-link"
  onClick={() => navigate('/admin')}
>
  Admin Panel
</button>
        </div>
      </header>

      <div className="app-container">
        {showConversations && (
          <div className="conversations-sidebar">
            <h2>Your Conversations</h2>
            <button className="new-chat-btn" onClick={startNewConversation}>
              + New Chat
            </button>
            <div className="conversations-list">
              {conversations.map(conv => (
                <div 
                  key={conv._id} 
                  className={`conversation-item ${conv._id === conversationId ? 'active' : ''}`}
                  onClick={() => loadConversation(conv._id)}
                >
                  <div className="conversation-content">
                    <div className="conversation-title">{conv.title}</div>
                    <div className="conversation-date">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    className="delete-conversation-btn"
                    onClick={(e) => deleteConversation(conv._id, e)}
                    title="Delete conversation"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chat-container">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h2>Welcome to Customer Support!</h2>
                <p>How can I help you today?</p>
                <div className="welcome-info">
                  <p>Powered by AI Assistant</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
                >
                  <div className="message-content">
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="message ai-message">
                <div className="message-content loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main App Component with Routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<ChatApp />} />
      </Routes>
    </Router>
  );
}

export default App;