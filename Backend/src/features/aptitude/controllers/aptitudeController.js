const AptitudeQuestion = require('../models/AptitudeQuestion');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const AptitudeBookmark = require('../models/AptitudeBookmark');
const AptitudeMockTest = require('../models/AptitudeMockTest');
const AptitudeProgress = require('../models/AptitudeProgress');
const AptitudeLeaderboard = require('../models/AptitudeLeaderboard');
const { APTITUDE_CATEGORIES, COMPANY_TAGS } = require('../constants/categories');
const { paginate, paginationMeta } = require('../../../shared/utils/pagination');
const { updateAptitudeProgress, getOrCreateAptitudeProgress } = require('../../platform/services/progressService');
const { explainAptitudeSolution } = require('../../platform/services/placementAiService');

exports.getCategories = (req, res) => {
  res.json({ success: true, data: { categories: APTITUDE_CATEGORIES, companies: COMPANY_TAGS } });
};

exports.getQuestions = async (req, res, next) => {
  try {
    const { category, subtopic, difficulty, company, page = 1, limit = 10, search, sort = '-createdAt' } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (subtopic) filter.subtopic = subtopic;
    if (difficulty) filter.difficulty = difficulty;
    if (company) filter.companyTags = company;
    if (search) filter.$text = { $search: search };

    const total = await AptitudeQuestion.countDocuments(filter);
    const questions = await paginate(
      AptitudeQuestion.find(filter).select('-correctAnswer'),
      { page, limit, sort }
    );

    res.json({ success: true, data: questions, meta: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

exports.getRandomQuestion = async (req, res, next) => {
  try {
    const { category, subtopic, difficulty, company, adaptive } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (subtopic) filter.subtopic = subtopic;
    if (company) filter.companyTags = company;

    if (adaptive === 'true' && req.user) {
      const progress = await getOrCreateAptitudeProgress(req.user._id);
      filter.difficulty = progress.adaptiveDifficulty;
    } else if (difficulty) {
      filter.difficulty = difficulty;
    }

    const count = await AptitudeQuestion.countDocuments(filter);
    if (count === 0) {
      return res.status(404).json({ success: false, error: 'No questions found for this topic' });
    }

    const random = Math.floor(Math.random() * count);
    const question = await AptitudeQuestion.findOne(filter).skip(random).select('-correctAnswer');
    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await AptitudeQuestion.findById(req.params.id).select('-correctAnswer');
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

exports.checkAnswer = async (req, res, next) => {
  try {
    const { questionId, selectedAnswer, timeTaken = 0, hintsUsed = 0, mode = 'practice' } = req.body;
    const question = await AptitudeQuestion.findById(questionId);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

    const isCorrect = question.correctAnswer === selectedAnswer;
    let xpEarned = 0;

    if (req.user) {
      const result = await updateAptitudeProgress(req.user._id, {
        category: question.category,
        subtopic: question.subtopic,
        isCorrect,
        difficulty: question.difficulty
      });
      xpEarned = result.xpEarned;
    }

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        hints: question.hints,
        xpEarned,
        marks: isCorrect ? question.marks : -question.negativeMarking
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.startAttempt = async (req, res, next) => {
  try {
    const { mode, category, subtopic, mockTestId, questionCount = 10 } = req.body;
    let questionIds = [];

    if (mockTestId) {
      const mockTest = await AptitudeMockTest.findById(mockTestId);
      if (!mockTest) return res.status(404).json({ success: false, error: 'Mock test not found' });
      questionIds = mockTest.questionIds;
    } else {
      const filter = { isActive: true };
      if (category) filter.category = category;
      if (subtopic) filter.subtopic = subtopic;
      const questions = await AptitudeQuestion.aggregate([
        { $match: filter },
        { $sample: { size: Math.min(questionCount, 50) } },
        { $project: { _id: 1 } }
      ]);
      questionIds = questions.map(q => q._id);
    }

    const attempt = await AptitudeAttempt.create({
      userId: req.user._id,
      mode: mode || 'practice',
      category,
      subtopic,
      mockTestId,
      totalQuestions: questionIds.length
    });

    const questions = await AptitudeQuestion.find({ _id: { $in: questionIds } }).select('-correctAnswer');
    res.json({ success: true, data: { attempt, questions } });
  } catch (error) {
    next(error);
  }
};

exports.submitAttempt = async (req, res, next) => {
  try {
    const { attemptId, answers, timeSpent = 0 } = req.body;
    const attempt = await AptitudeAttempt.findOne({ _id: attemptId, userId: req.user._id });
    if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });

    let score = 0;
    let correctCount = 0;
    const processedAnswers = [];

    for (const ans of answers) {
      const question = await AptitudeQuestion.findById(ans.questionId);
      if (!question) continue;
      const isCorrect = question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) {
        correctCount++;
        score += question.marks;
      } else {
        score -= question.negativeMarking;
      }
      processedAnswers.push({ ...ans, isCorrect });
    }

    attempt.answers = processedAnswers;
    attempt.score = Math.max(0, score);
    attempt.correctCount = correctCount;
    attempt.accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
    attempt.timeSpent = timeSpent;
    attempt.completed = true;
    attempt.completedAt = new Date();
    attempt.xpEarned = correctCount * 15;
    await attempt.save();

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const { questionId, notes } = req.body;
    const existing = await AptitudeBookmark.findOne({ userId: req.user._id, questionId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, data: { bookmarked: false } });
    }
    await AptitudeBookmark.create({ userId: req.user._id, questionId, notes });
    res.json({ success: true, data: { bookmarked: true } });
  } catch (error) {
    next(error);
  }
};

exports.getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await AptitudeBookmark.find({ userId: req.user._id })
      .populate('questionId', '-correctAnswer')
      .sort('-createdAt');
    res.json({ success: true, data: bookmarks });
  } catch (error) {
    next(error);
  }
};

exports.getProgress = async (req, res, next) => {
  try {
    const progress = await getOrCreateAptitudeProgress(req.user._id);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all-time', limit = 50 } = req.query;
    const leaderboard = await AptitudeLeaderboard.find({ period, category: 'overall' })
      .sort({ totalXp: -1 })
      .limit(Number(limit));
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

exports.getMockTests = async (req, res, next) => {
  try {
    const tests = await AptitudeMockTest.find({ isActive: true }).sort('-createdAt');
    res.json({ success: true, data: tests });
  } catch (error) {
    next(error);
  }
};

exports.startChapterTest = async (req, res, next) => {
  try {
    const { category, subtopic } = req.body;
    const AptitudeMockTest = require('../models/AptitudeMockTest');
    const AptitudeAttempt = require('../models/AptitudeAttempt');
    const { generateQuestionSet } = require('../services/testGenerationService');

    let blueprint = await AptitudeMockTest.findOne({
      testType: 'chapter',
      'topicMix.0.category': category,
      'topicMix.0.subtopics': subtopic
    });

    if (!blueprint) {
      blueprint = await AptitudeMockTest.create({
        title: `${subtopic} - Chapter Test`,
        testType: 'chapter',
        generationMode: 'randomized-per-attempt',
        topicMix: [{
          category,
          subtopics: [subtopic],
          questionCount: 10,
          difficultyDistribution: { easy: 4, medium: 4, hard: 2 }
        }],
        duration: 1200,
        totalMarks: 10,
        isActive: true
      });
    }

    const result = await generateQuestionSet(blueprint.topicMix, { dryRun: false });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.errors.join(', ') });
    }

    const attempt = await AptitudeAttempt.create({
      studentId: req.user._id || req.user.id,
      mockTestId: blueprint._id,
      answers: result.questions.map(q => ({
        questionId: q._id,
        questionText: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        negativeMarks: q.negativeMarking || 0.25,
        selectedAnswer: null,
        timeSpentSeconds: 0
      })),
      startTime: new Date(),
      completed: false
    });

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

exports.getPYQCompanies = async (req, res, next) => {
  try {
    const AptitudeQuestion = require('../models/AptitudeQuestion');
    const companies = await AptitudeQuestion.aggregate([
      { $match: { isPYQ: true, isActive: true } },
      { $group: { 
        _id: '$pyqMeta.company', 
        questionCount: { $sum: 1 },
        years: { $addToSet: '$pyqMeta.year' }
      } },
      { $project: { company: '$_id', questionCount: 1, years: 1, _id: 0 } },
      { $sort: { company: 1 } }
    ]);
    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

exports.getPYQForCompany = async (req, res, next) => {
  try {
    const AptitudeQuestion = require('../models/AptitudeQuestion');
    const company = req.params.company;
    
    // This could just return metadata, or we could generate a blueprint here as requested by phase 1.
    // The prompt says: "Allow candidates to generate a company-pyq test blueprint from the Phase 1 test generator."
    // Let's just return the available questions/metadata for this company's PYQ.
    
    const questions = await AptitudeQuestion.find({
      isPYQ: true,
      isActive: true,
      'pyqMeta.company': company
    }).select('question category subtopic pyqMeta difficulty');
    
    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

exports.startPYQTest = async (req, res, next) => {
  try {
    const { company, year } = req.body;
    const AptitudeMockTest = require('../models/AptitudeMockTest');
    const AptitudeAttempt = require('../models/AptitudeAttempt');
    const { generateQuestionSet } = require('../services/testGenerationService');
    const AptitudeQuestion = require('../models/AptitudeQuestion');

    let blueprint = await AptitudeMockTest.findOne({
      testType: 'company-pyq',
      title: `${company} PYQ Test` + (year ? ` ${year}` : '')
    });

    if (!blueprint) {
      // Find out how many questions exist
      const query = { isPYQ: true, isActive: true, 'pyqMeta.company': company };
      if (year) query['pyqMeta.year'] = year;
      
      const counts = await AptitudeQuestion.aggregate([
        { $match: query },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
      ]);
      
      const diffCounts = { easy: 0, medium: 0, hard: 0 };
      let total = 0;
      counts.forEach(c => {
        const diff = c._id.toLowerCase();
        diffCounts[diff] = c.count;
        total += c.count;
      });

      if (total === 0) {
        return res.status(404).json({ success: false, error: 'No PYQs found for this company/year' });
      }

      blueprint = await AptitudeMockTest.create({
        title: `${company} PYQ Test` + (year ? ` ${year}` : ''),
        testType: 'company-pyq',
        generationMode: 'randomized-per-attempt',
        topicMix: [{
          category: 'Quantitative Aptitude', // Using this as a dummy because PYQ cuts across categories
          subtopics: [],
          questionCount: total,
          difficultyDistribution: diffCounts
        }],
        duration: total * 120, // 2 mins per question avg
        totalMarks: total,
        isActive: true
      });
    }

    // Pass pyqMeta to generateQuestionSet
    const result = await generateQuestionSet(blueprint.topicMix, { 
      dryRun: false,
      pyqMeta: { company, year }
    });
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.errors.join(', ') });
    }

    const attempt = await AptitudeAttempt.create({
      studentId: req.user._id || req.user.id,
      testId: blueprint._id,
      answers: result.questions.map(q => ({
        questionId: q._id,
        questionText: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        negativeMarks: q.negativeMarking || 0.25,
        selectedAnswer: null,
        timeSpentSeconds: 0
      })),
      startTime: new Date(),
      completed: false
    });

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

exports.explainWithAI = async (req, res, next) => {
  try {
    const { questionId, userAnswer } = req.body;
    const question = await AptitudeQuestion.findById(questionId);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    const explanation = await explainAptitudeSolution(
      question.question, question.options, question.correctAnswer, userAnswer
    );
    res.json({ success: true, data: explanation });
  } catch (error) {
    next(error);
  }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const question = await AptitudeQuestion.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await AptitudeQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    await AptitudeQuestion.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Question deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.createMockTest = async (req, res, next) => {
  try {
    const mockTest = await AptitudeMockTest.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: mockTest });
  } catch (error) {
    next(error);
  }
};
