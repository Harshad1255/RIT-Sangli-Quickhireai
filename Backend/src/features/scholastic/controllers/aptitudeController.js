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

      const query = { status: 'Published' };
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
      const question = await AptitudeQuestion.findOne({ _id: id, status: 'Published' })
        .select('-correctOptionId -explanation');
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
        const AptitudeSubmission = require('../models/AptitudeSubmission');
        
        // Idempotency check: has the user solved this question before?
        const priorSolve = await AptitudeSubmission.findOne({ userId, questionId, isCorrect: true });
        const isFirstSolve = !priorSolve;

        // Record this attempt
        await AptitudeSubmission.create({
          userId,
          questionId,
          selectedOptionId: parseInt(selectedOptionId, 10),
          isCorrect,
          timeTakenSeconds: Number(timeTakenSeconds) || 0
        });

        // Only award XP and progress if this is a new correct solve, or if we want to record daily activity
        xpResult = await xpCalculator.updateAfterSolution({
          userId,
          userName,
          questionType: 'aptitude',
          difficulty: question.difficulty,
          isCorrect,
          timeTakenSeconds,
          isFirstSolve
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
      const query = { status: 'Published' };
      if (category && category !== 'All') query.category = category;
      if (difficulty && difficulty !== 'All') query.difficulty = difficulty;

      const count = await AptitudeQuestion.countDocuments(query);
      if (count === 0) {
        return res.status(404).json({ success: false, error: 'No questions found for the given criteria' });
      }

      const randomIdx = Math.floor(Math.random() * count);
      const question = await AptitudeQuestion.findOne(query)
        .select('-correctOptionId -explanation')
        .skip(randomIdx);

      res.status(200).json({
        success: true,
        question
      });
    } catch (error) {
      console.error('Error fetching random question:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch random question' });
    }
  },

  // ---------------------------------------------------------
  // PRACTICE SETS (STUDENT API)
  // ---------------------------------------------------------
  
  async getPracticeSets(req, res) {
    try {
      const sets = await require('../models/ScholasticPracticeSet').find({ status: 'Published' })
        .populate('companyId', 'name companyName profilePicture')
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, practiceSets: sets });
    } catch (error) {
      console.error('Error fetching student practice sets:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch practice sets' });
    }
  },

  async getPracticeSetById(req, res) {
    try {
      const { id } = req.params;
      const set = await require('../models/ScholasticPracticeSet').findById(id)
        .populate('companyId', 'name companyName')
        .populate({
          path: 'questions',
          match: { status: { $ne: 'Archived' } },
          select: '-correctOptionId -explanation'
        });
      
      if (!set || set.status !== 'Published') {
        return res.status(404).json({ success: false, error: 'Practice Set not found or not published' });
      }

      res.status(200).json({ success: true, practiceSet: set });
    } catch (error) {
      console.error('Error fetching practice set:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch practice set' });
    }
  },

  async startPracticeSet(req, res) {
    try {
      const { id } = req.params;
      const studentId = req.user.id || req.user._id;

      const ScholasticPracticeAttempt = require('../models/ScholasticPracticeAttempt');
      const ScholasticPracticeSet = require('../models/ScholasticPracticeSet');
      const practiceSet = await ScholasticPracticeSet.findOne({ _id: id, status: 'Published' }).populate({
        path: 'questions',
        match: { status: { $ne: 'Archived' } },
        select: '_id'
      });
      if (!practiceSet || !practiceSet.questions.length) {
        return res.status(404).json({ success: false, error: 'Practice set not found or unavailable.' });
      }
      
      // Check if one is already in progress
      let attempt = await ScholasticPracticeAttempt.findOne({
        studentId,
        practiceSetId: id,
        status: 'In Progress'
      });

      if (!attempt) {
        const expiresAt = practiceSet.timeLimitMinutes > 0
          ? new Date(Date.now() + practiceSet.timeLimitMinutes * 60 * 1000)
          : undefined;
        attempt = await ScholasticPracticeAttempt.create({
          studentId,
          practiceSetId: id,
          status: 'In Progress',
          startedAt: Date.now(),
          expiresAt
        });
      }

      res.status(200).json({ success: true, attempt });
    } catch (error) {
      console.error('Error starting practice set:', error);
      res.status(500).json({ success: false, error: 'Failed to start practice set' });
    }
  },

  async savePracticeSetAnswer(req, res) {
    try {
      const { attemptId } = req.params;
      const { questionId, selectedOptionId, timeTakenSeconds = 0 } = req.body;
      const studentId = req.user.id || req.user._id;
      const ScholasticPracticeAttempt = require('../models/ScholasticPracticeAttempt');
      if (!questionId || selectedOptionId === undefined) {
        return res.status(400).json({ success: false, error: 'questionId and selectedOptionId are required.' });
      }
      const attempt = await ScholasticPracticeAttempt.findOne({ _id: attemptId, studentId, status: 'In Progress' });
      if (!attempt) return res.status(404).json({ success: false, error: 'Active attempt not found.' });
      if (attempt.expiresAt && new Date() > attempt.expiresAt) {
        return res.status(400).json({ success: false, error: 'This practice attempt has expired.' });
      }
      const answer = attempt.answers.find(item => item.questionId.toString() === questionId.toString());
      if (answer) {
        answer.selectedOptionId = Number(selectedOptionId);
        answer.timeTakenSeconds = Number(timeTakenSeconds) || 0;
      } else {
        attempt.answers.push({ questionId, selectedOptionId: Number(selectedOptionId), timeTakenSeconds: Number(timeTakenSeconds) || 0 });
      }
      await attempt.save();
      res.status(200).json({ success: true, saved: true });
    } catch (error) {
      console.error('Error saving practice answer:', error);
      res.status(500).json({ success: false, error: 'Failed to save answer.' });
    }
  },

  async submitPracticeSet(req, res) {
    try {
      const { attemptId } = req.params;
      const { answers = [], timeTakenSeconds } = req.body;
      const studentId = req.user.id || req.user._id;

      const ScholasticPracticeAttempt = require('../models/ScholasticPracticeAttempt');
      const ScholasticPracticeSet = require('../models/ScholasticPracticeSet');

      const attempt = await ScholasticPracticeAttempt.findOne({ _id: attemptId, studentId });
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }
      if (attempt.status === 'Completed') {
        return res.status(400).json({ success: false, error: 'Attempt already submitted' });
      }
      if (attempt.expiresAt && new Date() > attempt.expiresAt) {
        return res.status(400).json({ success: false, error: 'This practice attempt has expired.' });
      }

      const practiceSet = await ScholasticPracticeSet.findById(attempt.practiceSetId).populate('questions');
      if (!practiceSet) {
        return res.status(404).json({ success: false, error: 'Practice set not found' });
      }

      let correct = 0;
      let incorrect = 0;
      let unattempted = 0;
      const evaluatedAnswers = [];

      for (const q of practiceSet.questions) {
        const submittedAnswer = answers.find(a => a.questionId?.toString() === q._id.toString());
        const savedAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
        const studentAns = submittedAnswer || savedAnswer;
        if (!studentAns || studentAns.selectedOptionId === null || studentAns.selectedOptionId === undefined) {
          unattempted++;
          evaluatedAnswers.push({
            questionId: q._id,
            selectedOptionId: null,
            isCorrect: false
          });
        } else {
          const isCorrect = parseInt(studentAns.selectedOptionId, 10) === q.correctOptionId;
          if (isCorrect) correct++;
          else incorrect++;
          
          evaluatedAnswers.push({
            questionId: q._id,
            selectedOptionId: studentAns.selectedOptionId,
            isCorrect
          });
        }
      }

      const totalQuestions = practiceSet.questions.length;
      const attempted = correct + incorrect;
      const score = correct;
      const percentage = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
      const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

      attempt.answers = evaluatedAnswers;
      attempt.status = 'Completed';
      attempt.submittedAt = Date.now();
      attempt.totalQuestions = totalQuestions;
      attempt.attempted = attempted;
      attempt.unattempted = unattempted;
      attempt.correct = correct;
      attempt.incorrect = incorrect;
      attempt.score = score;
      attempt.percentage = percentage;
      attempt.accuracy = accuracy;
      attempt.timeTakenSeconds = Number(timeTakenSeconds) || Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);

      // Update practice set analytics
      practiceSet.totalAttempts += 1;
      practiceSet.averageScore = ((practiceSet.averageScore * (practiceSet.totalAttempts - 1)) + score) / practiceSet.totalAttempts;
      practiceSet.averageAccuracy = ((practiceSet.averageAccuracy * (practiceSet.totalAttempts - 1)) + accuracy) / practiceSet.totalAttempts;
      await practiceSet.save();

      // XP Integration
      if (studentId) {
        const xpCalculator = require('../utils/xpCalculator');
        const xpResult = await xpCalculator.updateAfterSolution({
          userId: studentId,
          userName: req.user?.name || req.user?.email || 'Student',
          questionType: 'aptitude',
          difficulty: practiceSet.difficulty,
          isCorrect: true, // Award bulk XP
          timeTakenSeconds: timeTakenSeconds || 0,
          customXpReward: practiceSet.xpReward || 50
        });
        if (xpResult && xpResult.xpEarned) {
          attempt.xpEarned = xpResult.xpEarned;
        }
      }

      await attempt.save();
      res.status(200).json({ success: true, attempt });
    } catch (error) {
      console.error('Error submitting practice set:', error);
      res.status(500).json({ success: false, error: 'Failed to submit practice set' });
    }
  },

  async getPracticeSetResult(req, res) {
    try {
      const { attemptId } = req.params;
      const studentId = req.user?.id || req.user?._id;

      const ScholasticPracticeAttempt = require('../models/ScholasticPracticeAttempt');
      const attempt = await ScholasticPracticeAttempt.findOne({ _id: attemptId, studentId })
        .populate({
          path: 'practiceSetId',
          populate: { path: 'questions', select: 'title questionText options correctOptionId explanation' }
        });

      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      res.status(200).json({ success: true, attempt });
    } catch (error) {
      console.error('Error fetching result:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch result' });
    }
  }
};

module.exports = aptitudeController;
