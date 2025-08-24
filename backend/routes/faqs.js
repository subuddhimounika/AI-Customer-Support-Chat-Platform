const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const router = express.Router();
const FAQ = require('../models/FAQ');
const CompanyData = require('../models/CompanyData');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all FAQs with filtering
router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    const faqs = await FAQ.find(query).sort({ createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get FAQ by ID
router.get('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new FAQ
router.post('/', async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    
    const faq = new FAQ({
      question,
      answer,
      category: category || 'General',
      keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
      isActive: isActive !== undefined ? isActive : true
    });
    
    const savedFAQ = await faq.save();
    res.status(201).json(savedFAQ);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update FAQ
router.put('/:id', async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    
    const updatedFAQ = await FAQ.findByIdAndUpdate(
      req.params.id,
      {
        question,
        answer,
        category,
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
        isActive
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedFAQ) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    res.json(updatedFAQ);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete FAQ
router.delete('/:id', async (req, res) => {
  try {
    const deletedFAQ = await FAQ.findByIdAndDelete(req.params.id);
    
    if (!deletedFAQ) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload FAQ from file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    let text = '';
    
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else if (req.file.mimetype === 'text/plain') {
      text = fs.readFileSync(req.file.path, 'utf8');
    }
    
    // Save as CompanyData for contextual responses
    const companyData = new CompanyData({
      title: req.file.originalname,
      content: text,
      type: req.file.mimetype === 'application/pdf' ? 'pdf' : 'text',
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
    
    await companyData.save();
    
    // Also extract FAQs from the text
    const faqs = extractFAQsFromText(text, req.file.originalname);
    
    if (faqs.length > 0) {
      await FAQ.insertMany(faqs);
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      message: `File processed successfully`,
      faqsExtracted: faqs.length,
      companyDataId: companyData._id
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get FAQ categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await FAQ.distinct('category', { isActive: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search FAQs by keyword
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const faqs = await FAQ.find({
      isActive: true,
      $text: { $search: query }
    }, {
      score: { $meta: "textScore" }
    }).sort({ score: { $meta: "textScore" } });
    
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to extract FAQs from text
function extractFAQsFromText(text, filename) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const faqs = [];
  let currentQuestion = '';
  let currentAnswer = '';

  for (const line of lines) {
    if (line.match(/^(Q:|Question:|#\s*)/i)) {
      // If we have a previous Q&A, save it
      if (currentQuestion && currentAnswer) {
        faqs.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.trim(),
          category: `From ${filename}`,
          source: 'file_upload',
          keywords: extractKeywords(currentQuestion + ' ' + currentAnswer)
        });
      }
      currentQuestion = line.replace(/^(Q:|Question:|#\s*)/i, '').trim();
      currentAnswer = '';
    } else if (line.match(/^(A:|Answer:|-\s*)/i)) {
      currentAnswer += line.replace(/^(A:|Answer:|-\s*)/i, '').trim() + ' ';
    } else if (currentQuestion) {
      currentAnswer += line.trim() + ' ';
    }
  }

  // Add the last FAQ
  if (currentQuestion && currentAnswer) {
    faqs.push({
      question: currentQuestion.trim(),
      answer: currentAnswer.trim(),
      category: `From ${filename}`,
      source: 'file_upload',
      keywords: extractKeywords(currentQuestion + ' ' + currentAnswer)
    });
  }

  return faqs;
}

// Helper function to extract keywords
function extractKeywords(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Remove duplicates and common words
  const commonWords = ['what', 'when', 'where', 'why', 'how', 'the', 'and', 'for', 'with', 'this', 'that'];
  return [...new Set(words)].filter(word => !commonWords.includes(word)).slice(0, 10);
}

module.exports = router;