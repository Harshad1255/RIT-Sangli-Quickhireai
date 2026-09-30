const { CodingQuestion, CodingTestCase, CodingSubmission } = require('../models');
const { runTestCases } = require('../../../shared/services/codeExecution');
const xpCalculator = require('../utils/xpCalculator');

const codingController = {
  /**
   * Get all coding problems with filtering, search, and pagination
   */
  async getQuestions(req, res) {
    try {
      const {
        topic,
        difficulty,
        company,
        search,
        dailyOnly,
        page = 1,
        limit = 15
      } = req.query;

      const query = {};
      if (topic && topic !== 'All') {
        query.topic = topic;
      }
      if (difficulty && difficulty !== 'All') {
        query.difficulty = difficulty;
      }
      if (company && company !== 'All') {
        query.companies = { $in: [company] };
      }
      if (dailyOnly === 'true' || dailyOnly === '1') {
        query.isDailyChallenge = true;
      }
      if (search && search.trim()) {
        query.$or = [
          { title: { $regex: search.trim(), $options: 'i' } },
          { problemStatement: { $regex: search.trim(), $options: 'i' } },
          { tags: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [questions, total] = await Promise.all([
        CodingQuestion.find(query)
          .select('-starterCode') // Exclude heavy starter code from list
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10)),
        CodingQuestion.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        questions
      });
    } catch (error) {
      console.error('Error fetching coding problems:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch coding problems' });
    }
  },

  /**
   * Get single coding problem by ID or Slug
   */
  async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      
      const question = isObjectId 
        ? await CodingQuestion.findById(id)
        : await CodingQuestion.findOne({ slug: id });

      if (!question) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      // Fetch only visible sample test cases for the problem page
      const testCases = await CodingTestCase.find({ 
        questionId: question._id, 
        isHidden: false 
      }).select('input expectedOutput explanation points');

      res.status(200).json({
        success: true,
        question,
        sampleTestCases: testCases
      });
    } catch (error) {
      console.error('Error fetching coding problem:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch coding problem' });
    }
  },

  /**
   * Run Code against visible test cases (Sample Test)
   */
  async runCode(req, res) {
    try {
      const { questionId, code, language, customInput } = req.body;
      if (!questionId || !code || !language) {
        return res.status(400).json({ success: false, error: 'questionId, code, and language are required' });
      }

      let testCases = [];
      if (customInput !== undefined) {
        testCases = [{
          input: customInput,
          expectedOutput: '', // User testing custom output
          isHidden: false,
          points: 0
        }];
      } else {
        testCases = await CodingTestCase.find({ questionId, isHidden: false });
        if (testCases.length === 0) {
          return res.status(422).json({ success: false, error: 'No test cases configured for this problem.' });
        }
      }

      const executionResult = await runTestCases({ language, code, testCases, visibleOnly: true });
      res.status(200).json({
        success: true,
        executionResult
      });
    } catch (error) {
      console.error('Error running code:', error);
      res.status(500).json({ success: false, error: error.message || 'Error executing code' });
    }
  },

  /**
   * Submit Code against all test cases (visible + hidden) & save submission
   */
  async submitCode(req, res) {
    try {
      const { questionId, code, language } = req.body;
      const userId = req.user?.id || req.user?._id;
      const userName = req.user?.name || req.user?.email || 'Student';

      if (!questionId || !code || !language) {
        return res.status(400).json({ success: false, error: 'questionId, code, and language are required' });
      }

      const question = await CodingQuestion.findById(questionId);
      if (!question) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      const testCases = await CodingTestCase.find({ questionId });
      if (testCases.length === 0) {
        return res.status(422).json({ success: false, error: 'No test cases configured for this problem.' });
      }

      const executionResult = await runTestCases({ language, code, testCases, visibleOnly: false });
      const isAccepted = executionResult.verdict === 'Accepted';

      // Update question stats
      question.totalSubmissions += 1;
      if (isAccepted) {
        question.acceptedSubmissions += 1;
      }
      question.acceptanceRate = Math.round((question.acceptedSubmissions / question.totalSubmissions) * 1000) / 10;
      await question.save();

      // Save user submission if authenticated
      let submissionRecord = null;
      let xpResult = null;

      if (userId) {
        submissionRecord = await CodingSubmission.create({
          userId,
          questionId,
          code,
          language,
          status: executionResult.verdict,
          executionTimeMs: executionResult.runtime || 0,
          memoryUsageKb: executionResult.memory || 0,
          testcasesPassed: executionResult.passedTests || 0,
          totalTestcases: executionResult.totalTests || 0,
          errorMessage: executionResult.verdict === 'Accepted' ? '' : executionResult.verdict
        });

        xpResult = await xpCalculator.updateAfterSolution({
          userId,
          userName,
          questionType: 'coding',
          difficulty: question.difficulty,
          isCorrect: isAccepted,
          timeTakenSeconds: Math.round((executionResult.runtime || 0) / 1000) || 60
        });
      }

      res.status(200).json({
        success: true,
        executionResult,
        submission: submissionRecord,
        xpReward: xpResult
      });
    } catch (error) {
      console.error('Error submitting code:', error);
      res.status(500).json({ success: false, error: error.message || 'Error submitting code' });
    }
  },

  /**
   * Get past submissions of a user for a question
   */
  async getSubmissions(req, res) {
    try {
      const { questionId } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const submissions = await CodingSubmission.find({ userId, questionId })
        .sort({ createdAt: -1 })
        .limit(20);

      res.status(200).json({
        success: true,
        count: submissions.length,
        submissions
      });
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
  }
};

module.exports = codingController;
