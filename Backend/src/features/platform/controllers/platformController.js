const User = require('../../users/models/User');
const UserProfile = require('../models/UserProfile');
const Company = require('../models/Company');
const AptitudeQuestion = require('../../aptitude/models/AptitudeQuestion');
const AptitudeAttempt = require('../../aptitude/models/AptitudeAttempt');
const CodingProblem = require('../../coding/models/CodingProblem');
const CodingSubmission = require('../../coding/models/CodingSubmission');
const CodingContest = require('../../coding/models/CodingContest');
const AptitudeProgress = require('../../aptitude/models/AptitudeProgress');
const { getOrCreateProfile } = require('../services/progressService');
const { generateStudyPlan, analyzeWeakTopics, calculateInterviewReadiness } = require('../services/placementAiService');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await getOrCreateProfile(userId, req.user.name);
    const aptitudeProgress = await AptitudeProgress.findOne({ userId });

    const recentSubmissions = await CodingSubmission.find({ userId, isRun: false })
      .populate('problemId', 'title slug difficulty')
      .sort('-createdAt')
      .limit(5);

    const recentAttempts = await AptitudeAttempt.find({ userId, completed: true })
      .sort('-completedAt')
      .limit(5);

    const readinessScore = calculateInterviewReadiness(
      { accuracy: aptitudeProgress?.overallAccuracy || 0, xp: aptitudeProgress?.xp || 0 },
      { acceptanceRate: profile.acceptanceRate, solvedCount: profile.solvedProblems.length }
    );

    res.json({
      success: true,
      data: {
        profile,
        aptitudeProgress,
        recentSubmissions,
        recentAttempts,
        interviewReadinessScore: readinessScore,
        stats: {
          solvedProblems: profile.solvedProblems.length,
          attemptedProblems: profile.attemptedProblems.length,
          acceptanceRate: profile.acceptanceRate,
          totalXp: profile.totalXp,
          codingStreak: profile.codingStreak,
          aptitudeStreak: profile.aptitudeStreak || aptitudeProgress?.currentStreak || 0,
          level: profile.level,
          contestRating: profile.contestRating
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id, req.user.name);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

exports.getStudyPlan = async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id);
    const aptitudeProgress = await AptitudeProgress.findOne({ userId: req.user._id });
    const weakAreas = aptitudeProgress?.topicProgress.filter(t => t.accuracy < 60) || [];
    const strongAreas = aptitudeProgress?.topicProgress.filter(t => t.accuracy >= 80) || [];

    if (profile.studyPlan) {
      return res.json({ success: true, data: profile.studyPlan });
    }

    const plan = await generateStudyPlan(weakAreas, strongAreas, req.query.companies?.split(','));
    profile.studyPlan = plan;
    await profile.save();
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

exports.analyzeWeakAreas = async (req, res, next) => {
  try {
    const aptitudeProgress = await AptitudeProgress.findOne({ userId: req.user._id });
    const analysis = await analyzeWeakTopics(aptitudeProgress?.topicProgress || []);
    const profile = await getOrCreateProfile(req.user._id);
    profile.weakAreas = analysis.weakAreas;
    profile.strongAreas = analysis.strongAreas;
    profile.interviewReadinessScore = analysis.readinessScore;
    await profile.save();
    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

exports.getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({ isActive: true }).sort('name');
    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const [userCount, aptitudeCount, codingCount, submissionCount, contestCount] = await Promise.all([
      User.countDocuments(),
      AptitudeQuestion.countDocuments({ isActive: true }),
      CodingProblem.countDocuments({ isActive: true }),
      CodingSubmission.countDocuments({ isRun: false }),
      CodingContest.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        users: userCount,
        aptitudeQuestions: aptitudeCount,
        codingProblems: codingCount,
        submissions: submissionCount,
        contests: contestCount
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, userType } = req.query;
    const filter = {};
    if (userType) filter.userType = userType;
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(limit).sort('-createdAt'),
      User.countDocuments(filter)
    ]);
    res.json({ success: true, data: users, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    next(error);
  }
};

exports.createCompany = async (req, res, next) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

exports.updateDailyGoal = async (req, res, next) => {
  try {
    const { dailyGoal } = req.body;
    const profile = await getOrCreateProfile(req.user._id);
    profile.dailyGoal = dailyGoal;
    profile.dailyGoalProgress = 0;
    await profile.save();
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
