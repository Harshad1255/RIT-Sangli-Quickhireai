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
  async updateAfterSolution({ userId, userName, university, questionType, difficulty, isCorrect, timeTakenSeconds, isFirstSolve = true }) {
    if (!userId) return null;

    // Calculate XP and Coin reward
    let xpGain = 0;
    let coinGain = 0;

    // Only award XP if the answer is correct AND it's the first time they solve it
    if (isCorrect && isFirstSolve) {
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

    if (isCorrect && isFirstSolve) {
      if (questionType === 'aptitude' && progress.questionsSolved.aptitude[diffKey] !== undefined) {
        progress.questionsSolved.aptitude[diffKey] += 1;
        progress.questionsSolved.aptitude.total += 1;
        progress.markModified('questionsSolved.aptitude');
      } else if (questionType === 'coding' && progress.questionsSolved.coding[diffKey] !== undefined) {
        progress.questionsSolved.coding[diffKey] += 1;
        progress.questionsSolved.coding.total += 1;
        progress.markModified('questionsSolved.coding');
      }
    }

    // Check streak using calendar days
    const now = new Date();
    const lastActive = new Date(progress.lastActiveDate || now);
    
    // Truncate to local date strings to compare actual calendar days
    const todayStrStreak = now.toISOString().split('T')[0];
    const lastActiveStr = lastActive.toISOString().split('T')[0];
    
    if (todayStrStreak !== lastActiveStr) {
      const todayDateOnly = new Date(todayStrStreak);
      const lastActiveDateOnly = new Date(lastActiveStr);
      const diffDays = Math.round((todayDateOnly - lastActiveDateOnly) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        progress.dailyStreak += 1;
      } else if (diffDays > 1) {
        progress.dailyStreak = 1;
      }
    } else if (progress.dailyStreak === 0) {
      progress.dailyStreak = 1;
    }
    progress.lastActiveDate = now;

    // Call the shared daily activity recorder
    await this.recordDailyActivity(userId, { 
      aptitude: questionType === 'aptitude' ? 1 : 0, 
      coding: questionType === 'coding' ? 1 : 0 
    });

    const totalSolved = (progress.questionsSolved.aptitude.total || 0) + (progress.questionsSolved.coding.total || 0);
    
    // Update accuracy based on actual attempts
    progress.totalAttempted = (progress.totalAttempted || 0) + 1;
    if (isCorrect) {
      progress.totalCorrect = (progress.totalCorrect || 0) + 1;
    }
    progress.overallAccuracy = Math.round((progress.totalCorrect / progress.totalAttempted) * 100);
    
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

    // 4. (Check badges is now handled by recordDailyActivity)

    return {
      xpGain,
      coinGain,
      newXP: stats.xp,
      newCoins: stats.coins,
      level: stats.level,
      dailyStreak: progress.dailyStreak
    };
  }

  async recordDailyActivity(userId, { aptitude = 0, coding = 0 }) {
    if (!userId || (aptitude === 0 && coding === 0)) return;

    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = new Progress({ userId });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Update Heatmap
    const heatmapEntry = progress.heatmap.find(h => h.date === todayStr);
    if (heatmapEntry) {
      heatmapEntry.aptitudeCount = (heatmapEntry.aptitudeCount || 0) + aptitude;
      heatmapEntry.codingCount = (heatmapEntry.codingCount || 0) + coding;
      heatmapEntry.total = heatmapEntry.aptitudeCount + heatmapEntry.codingCount;
      heatmapEntry.count = heatmapEntry.total; // Legacy fallback
      progress.markModified('heatmap');
    } else {
      progress.heatmap.push({
        date: todayStr,
        aptitudeCount: aptitude,
        codingCount: coding,
        total: aptitude + coding,
        count: aptitude + coding
      });
    }

    // 2. Update dailySolved
    const dailyEntry = progress.dailySolved.find(d => d.date === todayStr);
    let todayTotal = 0;
    if (dailyEntry) {
      dailyEntry.aptitude = (dailyEntry.aptitude || 0) + aptitude;
      dailyEntry.coding = (dailyEntry.coding || 0) + coding;
      todayTotal = dailyEntry.aptitude + dailyEntry.coding;
      progress.markModified('dailySolved');
    } else {
      progress.dailySolved.push({
        date: todayStr,
        aptitude,
        coding
      });
      todayTotal = aptitude + coding;
    }

    // 3. Update bestDailySolvedCount
    if (todayTotal > (progress.bestDailySolvedCount || 0)) {
      progress.bestDailySolvedCount = todayTotal;
    }

    await progress.save();
    
    // Also trigger badge check here for generic solves (like from main coding module)
    let stats = await UserStatistics.findOne({ userId });
    if (!stats) stats = new UserStatistics({ userId });
    await this.checkBadges(userId, stats, progress);
  }

  async checkBadges(userId, stats, progress) {
    try {
      const allBadges = await Badge.find({});
      const earnedBadgeIds = stats.badgesEarned.map(b => b.badgeId.toString());

      for (const badge of allBadges) {
        if (earnedBadgeIds.includes(badge._id.toString())) continue;

        let shouldUnlock = false;
        
        // Data-driven criteria evaluation
        if (badge.criteria && badge.criteria.metric && badge.criteria.threshold !== undefined) {
          const { metric, threshold } = badge.criteria;
          const totalAptitude = progress.questionsSolved.aptitude.total || 0;
          const totalCoding = progress.questionsSolved.coding.total || 0;

          switch (metric) {
            case 'lifetime_solved_total':
              shouldUnlock = (totalAptitude + totalCoding) >= threshold;
              break;
            case 'lifetime_solved_aptitude':
              shouldUnlock = totalAptitude >= threshold;
              break;
            case 'lifetime_solved_coding':
              shouldUnlock = totalCoding >= threshold;
              break;
            case 'daily_solved_count':
              shouldUnlock = progress.bestDailySolvedCount >= threshold;
              break;
            case 'daily_streak':
              shouldUnlock = progress.dailyStreak >= threshold;
              break;
            case 'perfect_score_count':
              shouldUnlock = (progress.perfectScoreCount || 0) >= threshold;
              break;
            case 'combo_day':
              // Check if there is any day in dailySolved where both aptitude and coding are >= 1
              const hasCombo = progress.dailySolved.some(day => day.aptitude >= 1 && day.coding >= 1);
              shouldUnlock = hasCombo && (threshold <= 1); // Simple threshold check for now
              break;
            case 'subject_mastery_count':
              // Implementation specific to subject mastery
              break;
          }
        } else {
          // Legacy hardcoded fallback just in case old badges exist without valid criteria
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
