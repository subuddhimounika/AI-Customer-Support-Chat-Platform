const FAQ = require('../models/FAQ');
const CompanyData = require('../models/CompanyData');

class ContextHelper {
  static async getRelevantContext(userMessage) {
    try {
      const relevantFAQs = await FAQ.find({
        isActive: true,
        $text: { $search: userMessage }
      }, {
        score: { $meta: "textScore" }
      })
      .sort({ score: { $meta: "textScore" } })
      .limit(3);

      const relevantContent = await CompanyData.find({
        isActive: true,
        $text: { $search: userMessage }
      }, {
        score: { $meta: "textScore" }
      })
      .sort({ score: { $meta: "textScore" } })
      .limit(2);

      let context = '';

      if (relevantFAQs.length > 0) {
        context += 'Relevant FAQ Information:\n';
        relevantFAQs.forEach((faq, index) => {
          context += `${index + 1}. Q: ${faq.question}\nA: ${faq.answer}\n\n`;
        });
      }

      if (relevantContent.length > 0) {
        context += 'Relevant Company Information:\n';
        relevantContent.forEach((content, index) => {
          const excerpt = content.content.substring(0, 200) + 
                         (content.content.length > 200 ? '...' : '');
          context += `${index + 1}. ${content.title}: ${excerpt}\n\n`;
        });
      }

      return context;
    } catch (error) {
      console.error('Error getting context:', error);
      return '';
    }
  }

  static async findDirectAnswer(userMessage) {
    try {
      // Look for exact matches in FAQs
      const exactMatch = await FAQ.findOne({
        isActive: true,
        $text: { $search: `"${userMessage}"` }
      });

      if (exactMatch) {
        return exactMatch.answer;
      }

      // Look for very high similarity
      const similarFAQs = await FAQ.find({
        isActive: true,
        $text: { $search: userMessage }
      }, {
        score: { $meta: "textScore" }
      })
      .sort({ score: { $meta: "textScore" } })
      .limit(1);

      if (similarFAQs.length > 0 && similarFAQs[0].score > 2.0) {
        return similarFAQs[0].answer;
      }

      return null;
    } catch (error) {
      console.error('Error finding direct answer:', error);
      return null;
    }
  }
}

module.exports = ContextHelper;