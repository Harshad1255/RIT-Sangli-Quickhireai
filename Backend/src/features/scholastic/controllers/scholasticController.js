const {
  Company,
  Leaderboard,
  Progress,
  Bookmark,
  MockTest,
  MockAttempt,
  Contest,
  ContestRegistration,
  DailyChallenge,
  UserStatistics,
  Badge,
  Achievement
} = require('../models');

const scholasticController = {
  /**
   * Get list of companies
   */
  async getCompanies(req, res) {
    try {
      const companies = await Company.find({}).sort({ questionCount: -1, name: 1 });
      res.status(200).json({
        success: true,
        count: companies.length,
        companies
      });
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch companies' });
    }
  },

  /**
   * Get Leaderboard based on tab filter
   */
  async getLeaderboard(req, res) {
    try {
      const { tab = 'Global', page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      let sortField = { totalXP: -1 };
      if (tab === 'Contest') {
        sortField = { contestRating: -1 };
      } else if (tab === 'Weekly') {
        sortField = { streakDays: -1, totalXP: -1 };
      }

      const [leaderboard, total] = await Promise.all([
        Leaderboard.find({})
          .sort(sortField)
          .skip(skip)
          .limit(parseInt(limit, 10)),
        Leaderboard.countDocuments({})
      ]);

      res.status(200).json({
        success: true,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        leaderboard
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
  },

  /**
   * Get User Progress & Analytics
   */
  async getProgress(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const [progress, stats, leaderboard, badges, achievements] = await Promise.all([
        Progress.findOne({ userId }),
        UserStatistics.findOne({ userId }).populate('badgesEarned.badgeId').populate('achievementsUnlocked.achievementId'),
        Leaderboard.findOne({ userId }),
        Badge.find({}),
        Achievement.find({})
      ]);

      res.status(200).json({
        success: true,
        progress: progress || {
          dailyStreak: 0,
          questionsSolved: {
            aptitude: { easy: 0, medium: 0, hard: 0, total: 0 },
            coding: { easy: 0, medium: 0, hard: 0, total: 0 }
          },
          overallAccuracy: 0,
          topicProficiency: [],
          heatmap: []
        },
        stats: stats || { xp: 0, coins: 100, level: 1, badgesEarned: [], achievementsUnlocked: [] },
        leaderboard: leaderboard || { totalXP: 0, contestRating: 1200, streakDays: 0 },
        allBadges: badges,
        allAchievements: achievements
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch progress' });
    }
  },

  /**
   * Get Bookmarks
   */
  async getBookmarks(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { itemType } = req.query;
      const query = { userId };
      if (itemType) {
        query.itemType = itemType;
      }

      const bookmarks = await Bookmark.find(query).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: bookmarks.length,
        bookmarks
      });
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
    }
  },

  /**
   * Toggle Bookmark (Add/Remove)
   */
  async toggleBookmark(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { itemType, itemId, notes = '' } = req.body;
      if (!itemType || !itemId) {
        return res.status(400).json({ success: false, error: 'itemType and itemId are required' });
      }

      const existing = await Bookmark.findOne({ userId, itemId });
      if (existing) {
        await Bookmark.deleteOne({ _id: existing._id });
        return res.status(200).json({
          success: true,
          bookmarked: false,
          message: 'Bookmark removed'
        });
      } else {
        const bookmark = await Bookmark.create({
          userId,
          itemType,
          itemId,
          notes
        });
        return res.status(201).json({
          success: true,
          bookmarked: true,
          bookmark,
          message: 'Bookmark added'
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle bookmark' });
    }
  },

  /**
   * Get Mock Tests
   */
  async getMockTests(req, res) {
    try {
      const { testType, company } = req.query;
      const query = {};
      if (testType && testType !== 'All') {
        query.testType = testType;
      }
      if (company && company !== 'All') {
        query.company = company;
      }

      const tests = await MockTest.find(query)
        .select('-aptitudeQuestions -codingQuestions') // Exclude question arrays for overview cards
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: tests.length,
        tests
      });
    } catch (error) {
      console.error('Error fetching mock tests:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mock tests' });
    }
  },

  /**
   * Get Mock Test by ID with populated questions for taking test
   */
  async getMockTestById(req, res) {
    try {
      const { id } = req.params;
      const test = await MockTest.findById(id)
        .populate('aptitudeQuestions', '-correctOptionId -explanation')
        .populate('codingQuestions', '-starterCode.cpp -starterCode.java');

      if (!test) {
        return res.status(404).json({ success: false, error: 'Mock test not found' });
      }

      res.status(200).json({
        success: true,
        test
      });
    } catch (error) {
      console.error('Error fetching mock test:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mock test' });
    }
  },

  /**
   * Submit Mock Test Attempt & Calculate Score/Analysis
   */
  async submitMockTest(req, res) {
    try {
      const { id } = req.params; // mockTestId
      const userId = req.user?.id || req.user?._id;
      const { answers = [], timeTakenSeconds = 0 } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const mockTest = await MockTest.findById(id).populate('aptitudeQuestions');
      if (!mockTest) {
        return res.status(404).json({ success: false, error: 'Mock test not found' });
      }

      let correctCount = 0;
      let totalQuestions = mockTest.aptitudeQuestions.length + (mockTest.codingQuestions?.length || 0);
      let score = 0;

      const processedAnswers = [];
      for (const ans of answers) {
        let isCorrect = false;
        if (ans.questionType === 'aptitude') {
          const qObj = mockTest.aptitudeQuestions.find(q => q._id.toString() === ans.questionId.toString());
          if (qObj && ans.selectedOptionId === qObj.correctOptionId) {
            isCorrect = true;
            correctCount++;
            score += 2;
          } else if (mockTest.negativeMarking && ans.selectedOptionId !== undefined && ans.selectedOptionId !== null) {
            score -= mockTest.negativeMarkValue || 0.25;
          }
        }
        processedAnswers.push({
          ...ans,
          isCorrect
        });
      }

      const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const attempt = await MockAttempt.create({
        userId,
        mockTestId: id,
        status: 'Completed',
        score: Math.max(0, score),
        accuracy,
        timeTakenSeconds,
        answers: processedAnswers,
        completedAt: new Date()
      });

      mockTest.totalAttemptsCount += 1;
      await mockTest.save();

      res.status(200).json({
        success: true,
        attemptId: attempt._id,
        score: Math.max(0, score),
        accuracy,
        correctCount,
        totalQuestions,
        timeTakenSeconds
      });
    } catch (error) {
      console.error('Error submitting mock test:', error);
      res.status(500).json({ success: false, error: 'Failed to submit mock test' });
    }
  },

  /**
   * Get Mock Test Attempt Analysis
   */
  async getMockTestAnalysis(req, res) {
    try {
      const { id } = req.params; // attemptId
      const attempt = await MockAttempt.findById(id)
        .populate('mockTestId')
        .populate('answers.questionId');

      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      res.status(200).json({
        success: true,
        attempt
      });
    } catch (error) {
      console.error('Error fetching mock test analysis:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch attempt analysis' });
    }
  },

  /**
   * Get Contests
   */
  async getContests(req, res) {
    try {
      const contests = await Contest.find({}).sort({ startTime: -1 });
      res.status(200).json({
        success: true,
        count: contests.length,
        contests
      });
    } catch (error) {
      console.error('Error fetching contests:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch contests' });
    }
  },

  /**
   * Register for a Contest
   */
  async registerForContest(req, res) {
    try {
      const { id } = req.params; // contestId
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const contest = await Contest.findById(id);
      if (!contest) {
        return res.status(404).json({ success: false, error: 'Contest not found' });
      }

      const existing = await ContestRegistration.findOne({ userId, contestId: id });
      if (existing) {
        return res.status(200).json({
          success: true,
          alreadyRegistered: true,
          registration: existing
        });
      }

      const registration = await ContestRegistration.create({
        userId,
        contestId: id
      });

      contest.participantCount += 1;
      await contest.save();

      res.status(201).json({
        success: true,
        registration
      });
    } catch (error) {
      console.error('Error registering for contest:', error);
      res.status(500).json({ success: false, error: 'Failed to register for contest' });
    }
  },

  /**
   * Get Daily Challenge
   */
  async getDailyChallenge(req, res) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      let challenge = await DailyChallenge.findOne({ date: todayStr });

      if (!challenge) {
        // Fallback to most recent challenge if today's is not found
        challenge = await DailyChallenge.findOne({}).sort({ date: -1 });
      }

      res.status(200).json({
        success: true,
        challenge
      });
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch daily challenge' });
    }
  }
};

module.exports = scholasticController;
