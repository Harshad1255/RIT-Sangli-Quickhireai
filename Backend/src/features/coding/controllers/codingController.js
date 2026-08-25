const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const CodingBookmark = require('../models/CodingBookmark');
const CodingContest = require('../models/CodingContest');
const ContestLeaderboard = require('../models/ContestLeaderboard');
const { CODING_CATEGORIES, LANGUAGES, COMPANY_TAGS, LANGUAGE_TEMPLATES } = require('../constants/categories');
const { paginate, paginationMeta } = require('../../../shared/utils/pagination');
const { runTestCases, executeCode, wrapCodeForExecution } = require('../services/judgeService');
const { recordCodingSolve, getOrCreateProfile } = require('../../platform/services/progressService');
const { explainCode, suggestOptimizations, generateSimilarProblems } = require('../../platform/services/placementAiService');

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

exports.getCategories = (req, res) => {
  res.json({ success: true, data: { categories: CODING_CATEGORIES, languages: LANGUAGES, companies: COMPANY_TAGS } });
};

exports.getProblems = async (req, res, next) => {
  try {
    const { category, difficulty, company, page = 1, limit = 20, search, sort = 'order' } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (company) filter.companyTags = company;
    if (search) filter.$text = { $search: search };

    const total = await CodingProblem.countDocuments(filter);
    const problems = await paginate(
      CodingProblem.find(filter).select('title slug difficulty category tags companyTags acceptanceRate totalAccepted totalSubmissions'),
      { page, limit, sort }
    );

    let solvedIds = [];
    if (req.user) {
      const profile = await getOrCreateProfile(req.user._id);
      solvedIds = profile.solvedProblems.map(p => p.problemId?.toString());
    }

    const enriched = problems.map(p => ({
      ...p.toObject(),
      solved: solvedIds.includes(p._id.toString())
    }));

    res.json({ success: true, data: enriched, meta: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

exports.getProblemBySlug = async (req, res, next) => {
  try {
    const problem = await CodingProblem.findOne({ slug: req.params.slug, isActive: true });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });

    const visibleTestCases = problem.testCases.filter(tc => !tc.isHidden);
    const data = problem.toObject();
    data.testCases = visibleTestCases;
    data.starterCode = Object.fromEntries(problem.starterCode || new Map());

    if (!data.starterCode || Object.keys(data.starterCode).length === 0) {
      data.starterCode = LANGUAGE_TEMPLATES;
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.runCode = async (req, res, next) => {
  try {
    const { problemId, language, code, customInput } = req.body;
    const problem = await CodingProblem.findById(problemId);
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });

    const wrappedCode = wrapCodeForExecution(language, code, problem);

    if (customInput !== undefined) {
      const result = await executeCode({ language, code: wrappedCode, stdin: customInput, timeLimit: problem.timeLimit });
      return res.json({ success: true, data: result });
    }

    const result = await runTestCases({
      language,
      code: wrappedCode,
      testCases: problem.testCases,
      timeLimit: problem.timeLimit,
      visibleOnly: true
    });

    if (req.user) {
      await CodingSubmission.create({
        userId: req.user._id,
        problemId,
        language,
        code,
        verdict: result.verdict,
        testResults: result.testResults,
        passedTests: result.passedTests,
        totalTests: result.totalTests,
        runtime: result.runtime,
        memory: result.memory,
        executionLogs: result.executionLogs,
        isRun: true
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.submitCode = async (req, res, next) => {
  try {
    const { problemId, language, code, contestId } = req.body;
    const problem = await CodingProblem.findById(problemId);
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });

    const wrappedCode = wrapCodeForExecution(language, code, problem);
    const result = await runTestCases({
      language,
      code: wrappedCode,
      testCases: problem.testCases,
      timeLimit: problem.timeLimit,
      visibleOnly: false
    });

    const xpEarned = result.verdict === 'Accepted' ? (problem.difficulty === 'Hard' ? 35 : problem.difficulty === 'Medium' ? 20 : 10) : 0;

    const submission = await CodingSubmission.create({
      userId: req.user._id,
      problemId,
      contestId,
      language,
      code,
      verdict: result.verdict,
      testResults: result.testResults,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtime: result.runtime,
      memory: result.memory,
      executionLogs: result.executionLogs,
      xpEarned,
      isRun: false
    });

    problem.totalSubmissions += 1;
    if (result.verdict === 'Accepted') {
      problem.totalAccepted += 1;
      await recordCodingSolve(req.user._id, problemId, language, result.runtime, problem.difficulty);
    }
    problem.acceptanceRate = Math.round((problem.totalAccepted / problem.totalSubmissions) * 100);
    await problem.save();

    res.json({ success: true, data: { submission, verdict: result.verdict, xpEarned } });
  } catch (error) {
    next(error);
  }
};

exports.getSubmissions = async (req, res, next) => {
  try {
    const { problemId, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id, isRun: false };
    if (problemId) filter.problemId = problemId;

    const total = await CodingSubmission.countDocuments(filter);
    const submissions = await paginate(CodingSubmission.find(filter).populate('problemId', 'title slug'), { page, limit });

    res.json({ success: true, data: submissions, meta: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const { problemId, notes } = req.body;
    const existing = await CodingBookmark.findOne({ userId: req.user._id, problemId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, data: { bookmarked: false } });
    }
    await CodingBookmark.create({ userId: req.user._id, problemId, notes });
    res.json({ success: true, data: { bookmarked: true } });
  } catch (error) {
    next(error);
  }
};

exports.getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await CodingBookmark.find({ userId: req.user._id })
      .populate('problemId', 'title slug difficulty category')
      .sort('-createdAt');
    res.json({ success: true, data: bookmarks });
  } catch (error) {
    next(error);
  }
};

exports.getContests = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    const now = new Date();
    if (status === 'upcoming') filter.startTime = { $gt: now };
    if (status === 'active') { filter.startTime = { $lte: now }; filter.endTime = { $gte: now }; }
    if (status === 'past') filter.endTime = { $lt: now };

    const contests = await CodingContest.find(filter).sort('startTime');
    res.json({ success: true, data: contests });
  } catch (error) {
    next(error);
  }
};

exports.getContestById = async (req, res, next) => {
  try {
    const contest = await CodingContest.findById(req.params.id).populate('problems.problemId', 'title slug difficulty');
    if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });
    const leaderboard = await ContestLeaderboard.findOne({ contestId: contest._id });
    res.json({ success: true, data: { contest, leaderboard } });
  } catch (error) {
    next(error);
  }
};

exports.explainCode = async (req, res, next) => {
  try {
    const { code, language, problemTitle } = req.body;
    const result = await explainCode(code, language, problemTitle);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.optimizeCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    const result = await suggestOptimizations(code, language);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.similarProblems = async (req, res, next) => {
  try {
    const problem = await CodingProblem.findById(req.params.id);
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    const result = await generateSimilarProblems(problem.title, problem.category, problem.difficulty);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.createProblem = async (req, res, next) => {
  try {
    const slug = req.body.slug || slugify(req.body.title);
    const problem = await CodingProblem.create({ ...req.body, slug, createdBy: req.user._id });
    res.status(201).json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
};

exports.updateProblem = async (req, res, next) => {
  try {
    const problem = await CodingProblem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
};

exports.addTestCases = async (req, res, next) => {
  try {
    const { testCases } = req.body;
    const problem = await CodingProblem.findByIdAndUpdate(
      req.params.id,
      { $push: { testCases: { $each: testCases } } },
      { new: true }
    );
    res.json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
};

exports.createContest = async (req, res, next) => {
  try {
    const contest = await CodingContest.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: contest });
  } catch (error) {
    next(error);
  }
};
