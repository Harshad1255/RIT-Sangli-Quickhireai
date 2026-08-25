const {
  UserStatistics,
  Leaderboard,
  Progress,
  Badge,
  Achievement,
  Notification
} = require('../models');

/**
 * Utility to update User XP, Coins, Level, Daily Streak, and check Badges/Achievements
 */
class XPCalculator {
  async updateAfterSolution({ userId, userName, university, questionType, difficulty, isCorrect, timeTakenSeconds }) {
    if (!userId) return null;

    // Calculate XP and Coin reward
    let xpGain = 0;
    let coinGain = 0;

    if (isCorrect) {
      if (questionType === 'aptitude') {
        xpGain = difficulty === 'Hard' ? 30 : difficulty === 'Medium' ? 20 : 10;
        coinGain = difficulty === 'Hard' ? 15 : difficulty === 'Medium' ? 10 : 5;
      } else if (questionType === 'coding') {
        xpGain = difficulty === 'Hard' ? 100 : difficulty === 'Medium' ? 50 : 25;
        coinGain = difficulty === 'Hard' ? 50 : difficulty === 'Medium' ? 25 : 10;
      }
    }

    // 1. Update UserStatistics
    let stats = await UserStatistics.findOne({ userId });
    if (!stats) {
      stats = new UserStatistics({ userId });
    }
    stats.xp += xpGain;
    stats.coins += coinGain;
    // Simple level formula: Level = floor(xp / 200) + 1
    stats.level = Math.floor(stats.xp / 200) + 1;
    stats.updatedAt = new Date();
    await stats.save();

    // 2. Update Progress (solved count, streak, accuracy)
    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = new Progress({ userId });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const diffKey = difficulty ? difficulty.toLowerCase() : 'medium';

    if (isCorrect) {
      if (questionType === 'aptitude' && progress.questionsSolved.aptitude[diffKey] !== undefined) {
        progress.questionsSolved.aptitude[diffKey] += 1;
        progress.questionsSolved.aptitude.total += 1;
      } else if (questionType === 'coding' && progress.questionsSolved.coding[diffKey] !== undefined) {
        progress.questionsSolved.coding[diffKey] += 1;
        progress.questionsSolved.coding.total += 1;
      }
    }

    // Check streak
    const now = new Date();
    const lastActive = new Date(progress.lastActiveDate || now);
    const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      progress.dailyStreak += 1;
    } else if (diffDays > 1) {
      progress.dailyStreak = 1;
    } else if (progress.dailyStreak === 0) {
      progress.dailyStreak = 1;
    }
    progress.lastActiveDate = now;

    // Update heatmap
    const heatmapEntry = progress.heatmap.find(h => h.date === todayStr);
    if (heatmapEntry) {
      heatmapEntry.count += 1;
    } else {
      progress.heatmap.push({ date: todayStr, count: 1 });
    }

    const totalSolved = (progress.questionsSolved.aptitude.total || 0) + (progress.questionsSolved.coding.total || 0);
    progress.overallAccuracy = isCorrect ? Math.min(100, (progress.overallAccuracy * 0.9 + 10)) : Math.max(0, progress.overallAccuracy * 0.9);
    progress.updatedAt = now;
    await progress.save();

    // 3. Update Leaderboard
    let leaderboard = await Leaderboard.findOne({ userId });
    if (!leaderboard) {
      leaderboard = new Leaderboard({
        userId,
        userName: userName || 'Student',
        university: university || 'General'
      });
    }
    leaderboard.totalXP = stats.xp;
    leaderboard.aptitudeSolvedCount = progress.questionsSolved.aptitude.total;
    leaderboard.codingSolvedCount = progress.questionsSolved.coding.total;
    leaderboard.totalSolvedCount = totalSolved;
    leaderboard.streakDays = progress.dailyStreak;
    leaderboard.updatedAt = now;
    await leaderboard.save();

    // 4. Check badges unlocking
    await this.checkBadges(userId, stats, progress);

    return {
      xpGain,
      coinGain,
      newXP: stats.xp,
      newCoins: stats.coins,
      level: stats.level,
      dailyStreak: progress.dailyStreak
    };
  }

  async checkBadges(userId, stats, progress) {
    try {
      const allBadges = await Badge.find({});
      const earnedBadgeIds = stats.badgesEarned.map(b => b.badgeId.toString());

      for (const badge of allBadges) {
        if (earnedBadgeIds.includes(badge._id.toString())) continue;

        let shouldUnlock = false;
        if (badge.key === 'first_solve' && (progress.questionsSolved.aptitude.total + progress.questionsSolved.coding.total) >= 1) {
          shouldUnlock = true;
        } else if (badge.key === 'streak_3' && progress.dailyStreak >= 3) {
          shouldUnlock = true;
        } else if (badge.key === 'streak_7' && progress.dailyStreak >= 7) {
          shouldUnlock = true;
        } else if (badge.key === 'quant_10' && progress.questionsSolved.aptitude.total >= 10) {
          shouldUnlock = true;
        } else if (badge.key === 'code_wizard' && progress.questionsSolved.coding.total >= 10) {
          shouldUnlock = true;
        }

        if (shouldUnlock) {
          stats.badgesEarned.push({ badgeId: badge._id, earnedAt: new Date() });
          await Notification.create({
            userId,
            title: 'Badge Unlocked! 🎉',
            message: `Congratulations! You unlocked the badge: "${badge.name}"`,
            type: 'badge'
          });
        }
      }
      await stats.save();
    } catch (err) {
      console.error('Error checking badges:', err.message);
    }
  }
}

module.exports = new XPCalculator();
