import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newFaq, setNewFaq] = useState({ 
    question: '', 
    answer: '', 
    category: 'General', 
    isActive: true 
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeTab, setActiveTab] = useState('faq');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFAQs();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/health`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFAQs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/faqs`);
      setFaqs(response.data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    }
  };

  const handleCreateFaq = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/faqs`, newFaq);
      setNewFaq({ question: '', answer: '', category: 'General', isActive: true });
      fetchFAQs();
      alert('FAQ created successfully!');
    } catch (error) {
      console.error('Error creating FAQ:', error);
      alert('Error creating FAQ');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      setUploadStatus('Uploading...');
      const response = await axios.post(`${API_BASE_URL}/api/faqs/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadStatus(`Upload successful! ${response.data.faqsExtracted} FAQs extracted.`);
      setUploadFile(null);
      fetchFAQs();
    } catch (error) {
      setUploadStatus('Upload failed: ' + error.message);
    }
  };

  const handleBackToHome = (e) => {
    e.preventDefault();
    navigate('/');
  };


  if (!stats) return <div className="admin-loading">Loading Admin Panel...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleBackToHome} className="back-to-home-btn">
          ← Back to Home
        </button>
      </header>

      <div className="admin-content-wrapper">
        <div className="admin-stats">
          <h2>System Status</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Database</h3>
              <p>{stats.database?.status || 'Unknown'}</p>
            </div>
            <div className="stat-card">
              <h3>Server</h3>
              <p>Running</p>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="nav-container">
            <button 
              className={activeTab === 'faq' ? 'nav-button active' : 'nav-button'}
              onClick={() => setActiveTab('faq')}
            >
              📋 FAQ Management
            </button>
            <button 
              className={activeTab === 'upload' ? 'nav-button active' : 'nav-button'}
              onClick={() => setActiveTab('upload')}
            >
              📤 Document Upload
            </button>
          </div>
        </nav>

        <div className="admin-content">
          {activeTab === 'faq' && (
            <div className="admin-section">
              <div className="faq-create">
                <h3>Create New FAQ</h3>
                <form onSubmit={handleCreateFaq} className="faq-form">
                  <input
                    type="text"
                    placeholder="Question"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    required
                  />
                  <textarea
                    placeholder="Answer"
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newFaq.category}
                    onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={newFaq.isActive}
                      onChange={(e) => setNewFaq({ ...newFaq, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                  <button type="submit">Add FAQ</button>
                </form>
              </div>

              <div className="faq-list">
                <h3>Existing FAQs</h3>
                {faqs.length === 0 ? (
                  <p className="no-data">No FAQs found</p>
                ) : (
                  faqs.map(faq => (
                    <div key={faq._id} className="faq-item">
                      <h4>{faq.question}</h4>
                      <p>{faq.answer}</p>
                      <div className="faq-meta">
                        <span>Category: {faq.category}</span>
                        <span>Status: {faq.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="admin-section">
              <form onSubmit={handleFileUpload} className="upload-form">
                <div className="file-input">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  {uploadFile && <span>Selected: {uploadFile.name}</span>}
                </div>
                <button type="submit" disabled={!uploadFile}>
                  Upload Document
                </button>
              </form>
              {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
              
              <div className="upload-info">
                <h4>Supported Formats:</h4>
                <ul>
                  <li>PDF documents (.pdf)</li>
                  <li>Text files (.txt)</li>
                </ul>
                <p>Documents will be processed and added to the knowledge base for contextual responses.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;