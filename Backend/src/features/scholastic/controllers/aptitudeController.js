const { AptitudeCategory, AptitudeQuestion, Bookmark } = require('../models');
const xpCalculator = require('../utils/xpCalculator');

const aptitudeController = {
  /**
   * Get all aptitude categories with question counts
   */
  async getCategories(req, res) {
    try {
      const categories = await AptitudeCategory.find({}).sort({ name: 1 });
      res.status(200).json({
        success: true,
        count: categories.length,
        categories
      });
    } catch (error) {
      console.error('Error fetching aptitude categories:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
  },

  /**
   * Get aptitude questions with filtering, search, and pagination
   */
  async getQuestions(req, res) {
    try {
      const {
        category,
        difficulty,
        company,
        search,
        page = 1,
        limit = 15
      } = req.query;

      const query = {};
      if (category && category !== 'All') {
        query.category = category;
      }
      if (difficulty && difficulty !== 'All') {
        query.difficulty = difficulty;
      }
      if (company && company !== 'All') {
        query.companies = { $in: [company] };
      }
      if (search && search.trim()) {
        query.$or = [
          { title: { $regex: search.trim(), $options: 'i' } },
          { questionText: { $regex: search.trim(), $options: 'i' } },
          { tags: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [questions, total] = await Promise.all([
        AptitudeQuestion.find(query)
          .select('-correctOptionId -explanation') // Hide correct answers in listing
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10)),
        AptitudeQuestion.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        questions
      });
    } catch (error) {
      console.error('Error fetching aptitude questions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch questions' });
    }
  },

  /**
   * Get single aptitude question by ID
   */
  async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const question = await AptitudeQuestion.findById(id);
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      res.status(200).json({
        success: true,
        question
      });
    } catch (error) {
      console.error('Error fetching aptitude question:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch question' });
    }
  },

  /**
   * Submit an answer to an aptitude question
   */
  async submitAnswer(req, res) {
    try {
      const { questionId, selectedOptionId, timeTakenSeconds = 30 } = req.body;
      const userId = req.user?.id || req.user?._id;
      const userName = req.user?.name || req.user?.email || 'Student';

      if (!questionId || selectedOptionId === undefined) {
        return res.status(400).json({ success: false, error: 'questionId and selectedOptionId are required' });
      }

      const question = await AptitudeQuestion.findById(questionId);
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      const isCorrect = parseInt(selectedOptionId, 10) === question.correctOptionId;

      // Update question stats
      question.totalAttempts += 1;
      if (isCorrect) {
        question.correctAttempts += 1;
      }
      question.accuracy = Math.round((question.correctAttempts / question.totalAttempts) * 100);
      await question.save();

      // Calculate XP and progress if user is logged in
      let xpResult = null;
      if (userId) {
        xpResult = await xpCalculator.updateAfterSolution({
          userId,
          userName,
          questionType: 'aptitude',
          difficulty: question.difficulty,
          isCorrect,
          timeTakenSeconds
        });
      }

      res.status(200).json({
        success: true,
        isCorrect,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        accuracy: question.accuracy,
        xpReward: xpResult
      });
    } catch (error) {
      console.error('Error submitting aptitude answer:', error);
      res.status(500).json({ success: false, error: 'Failed to submit answer' });
    }
  },

  /**
   * Get random question (optionally by category or difficulty)
   */
  async getRandomQuestion(req, res) {
    try {
      const { category, difficulty } = req.query;
      const query = {};
      if (category && category !== 'All') query.category = category;
      if (difficulty && difficulty !== 'All') query.difficulty = difficulty;

      const count = await AptitudeQuestion.countDocuments(query);
      if (count === 0) {
        return res.status(404).json({ success: false, error: 'No questions found for the given criteria' });
      }

      const randomIdx = Math.floor(Math.random() * count);
      const question = await AptitudeQuestion.findOne(query).skip(randomIdx);

      res.status(200).json({
        success: true,
        question
      });
    } catch (error) {
      console.error('Error fetching random question:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch random question' });
    }
  }
};

module.exports = aptitudeController;
