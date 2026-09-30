const {
  AptitudeQuestion,
  CodingQuestion,
  CodingTestCase,
  MockTest,
  Company,
  AptitudeCategory
} = require('../models');

const adminController = {
  /**
   * Add Aptitude Question
   */
  async addAptitudeQuestion(req, res) {
    try {
      const { title, questionText, questionImageUrl, options, correctOptionId, category, difficulty, companies, hint, explanation, tags } = req.body;
      if (!title || !questionText || !options || correctOptionId === undefined || !category) {
        return res.status(400).json({ success: false, error: 'Missing required question fields' });
      }

      const question = await AptitudeQuestion.create({
        title,
        questionText,
        questionImageUrl,
        options,
        correctOptionId: parseInt(correctOptionId, 10),
        category,
        difficulty: difficulty || 'Medium',
        companies: companies || [],
        hint: hint || '',
        explanation: explanation || '',
        tags: tags || [category.toLowerCase()]
      });

      res.status(201).json({
        success: true,
        question
      });
    } catch (error) {
      console.error('Error adding aptitude question:', error);
      res.status(500).json({ success: false, error: 'Failed to add aptitude question' });
    }
  },

  /**
   * Update Aptitude Question
   */
  async updateAptitudeQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await AptitudeQuestion.findByIdAndUpdate(id, req.body, { new: true });
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      res.status(200).json({
        success: true,
        question
      });
    } catch (error) {
      console.error('Error updating aptitude question:', error);
      res.status(500).json({ success: false, error: 'Failed to update question' });
    }
  },

  /**
   * Delete Aptitude Question
   */
  async deleteAptitudeQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await AptitudeQuestion.findByIdAndDelete(id);
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting aptitude question:', error);
      res.status(500).json({ success: false, error: 'Failed to delete question' });
    }
  },

  /**
   * Add Coding Problem + test cases
   */
  async addCodingQuestion(req, res) {
    try {
      const {
        title,
        slug,
        difficulty,
        topic,
        tags,
        companies,
        problemStatement,
        examples,
        constraints,
        hints,
        editorial,
        starterCode,
        testCases = []
      } = req.body;

      if (!title || !slug || !topic || !problemStatement) {
        return res.status(400).json({ success: false, error: 'Missing required coding problem fields' });
      }

      const problem = await CodingQuestion.create({
        title,
        slug,
        difficulty: difficulty || 'Medium',
        topic,
        tags: tags || [topic.toLowerCase()],
        companies: companies || [],
        problemStatement,
        examples: examples || [],
        constraints: constraints || [],
        hints: hints || [],
        editorial: editorial || '',
        starterCode: starterCode || {}
      });

      if (testCases && testCases.length > 0) {
        const testCasesData = testCases.map(tc => ({
          ...tc,
          questionId: problem._id
        }));
        await CodingTestCase.insertMany(testCasesData);
      }

      res.status(201).json({
        success: true,
        problem
      });
    } catch (error) {
      console.error('Error adding coding problem:', error);
      res.status(500).json({ success: false, error: 'Failed to add coding problem' });
    }
  },

  /**
   * Bulk Upload Questions via JSON array
   */
  async bulkUploadJSON(req, res) {
    try {
      const { type = 'aptitude', items = [] } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Items must be a non-empty array' });
      }

      let count = 0;
      if (type === 'aptitude') {
        const result = await AptitudeQuestion.insertMany(items, { ordered: false });
        count = result.length;
      } else if (type === 'coding') {
        const result = await CodingQuestion.insertMany(items, { ordered: false });
        count = result.length;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid type. Use "aptitude" or "coding"' });
      }

      res.status(201).json({
        success: true,
        message: `Successfully bulk uploaded ${count} ${type} questions`,
        count
      });
    } catch (error) {
      console.error('Error in bulk upload:', error);
      res.status(500).json({ success: false, error: 'Bulk upload failed. Some records may be invalid or duplicates.' });
    }
  },

  /**
   * Create Mock Test
   */
  async createMockTest(req, res) {
    try {
      const { title, testType, company, description, durationMinutes, totalMarks, negativeMarking, aptitudeQuestions, codingQuestions } = req.body;
      if (!title || !durationMinutes) {
        return res.status(400).json({ success: false, error: 'Title and durationMinutes are required' });
      }

      const mockTest = await MockTest.create({
        title,
        testType: testType || 'Placement Test',
        company: company || 'General',
        description: description || '',
        durationMinutes: parseInt(durationMinutes, 10),
        totalMarks: parseInt(totalMarks, 10) || 100,
        negativeMarking: !!negativeMarking,
        aptitudeQuestions: aptitudeQuestions || [],
        codingQuestions: codingQuestions || []
      });

      res.status(201).json({
        success: true,
        mockTest
      });
    } catch (error) {
      console.error('Error creating mock test:', error);
      res.status(500).json({ success: false, error: 'Failed to create mock test' });
    }
  },

  /**
   * Delete Mock Test
   */
  async deleteMockTest(req, res) {
    try {
      const { id } = req.params;
      await MockTest.findByIdAndDelete(id);
      res.status(200).json({
        success: true,
        message: 'Mock test deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting mock test:', error);
      res.status(500).json({ success: false, error: 'Failed to delete mock test' });
    }
  }
};

module.exports = adminController;
