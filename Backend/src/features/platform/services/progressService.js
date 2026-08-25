const UserProfile = require('../models/UserProfile');
const AptitudeProgress = require('../../aptitude/models/AptitudeProgress');
const AptitudeLeaderboard = require('../../aptitude/models/AptitudeLeaderboard');

const XP_REWARDS = { Easy: 10, Medium: 20, Hard: 35 };
const STREAK_BADGES = { 7: 'Week Warrior', 30: 'Monthly Master', 100: 'Century Champion' };

const getOrCreateProfile = async (userId, displayName) => {
  let profile = await UserProfile.findOne({ userId });
  if (!profile) {
    profile = await UserProfile.create({ userId, displayName: displayName || 'Student' });
  }
  return profile;
};

const getOrCreateAptitudeProgress = async (userId) => {
  let progress = await AptitudeProgress.findOne({ userId });
  if (!progress) {
    progress = await AptitudeProgress.create({ userId });
  }
  return progress;
};

const updateStreak = (lastDate, currentStreak) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!lastDate) return 1;
  const last = new Date(lastDate);
  last.setHours(0, 0, 0, 0);
  const diff = (today - last) / (1000 * 60 * 60 * 24);
  if (diff === 0) return currentStreak;
  if (diff === 1) return currentStreak + 1;
  return 1;
};

const updateHeatmap = (heatmap, count = 1) => {
  const today = new Date().toISOString().split('T')[0];
  const entry = heatmap.find(h => h.date === today);
  if (entry) {
    entry.count += count;
  } else {
    heatmap.push({ date: today, count });
  }
  return heatmap.slice(-365);
};

const awardXp = async (userId, amount, type = 'coding', displayName) => {
  const profile = await getOrCreateProfile(userId, displayName);
  profile.totalXp += amount;
  if (type === 'coding') profile.codingXp += amount;
  else profile.aptitudeXp += amount;
  profile.level = Math.floor(profile.totalXp / 500) + 1;

  if (type === 'coding') {
    profile.codingStreak = updateStreak(profile.lastCodingDate, profile.codingStreak);
    profile.longestCodingStreak = Math.max(profile.longestCodingStreak, profile.codingStreak);
    profile.lastCodingDate = new Date();
  } else {
    profile.aptitudeStreak = updateStreak(profile.lastAptitudeDate, profile.aptitudeStreak);
    profile.longestAptitudeStreak = Math.max(profile.longestAptitudeStreak, profile.aptitudeStreak);
    profile.lastAptitudeDate = new Date();
  }

  profile.heatmap = updateHeatmap(profile.heatmap || []);
  profile.dailyGoalProgress = Math.min(profile.dailyGoal, (profile.dailyGoalProgress || 0) + 1);
  await profile.save();
  return profile;
};

const updateAptitudeProgress = async (userId, { category, subtopic, isCorrect, difficulty }) => {
  const progress = await getOrCreateAptitudeProgress(userId);
  progress.totalAttempted += 1;
  if (isCorrect) progress.totalCorrect += 1;
  progress.overallAccuracy = progress.totalAttempted > 0
    ? Math.round((progress.totalCorrect / progress.totalAttempted) * 100) : 0;

  progress.currentStreak = updateStreak(progress.lastPracticeDate, progress.currentStreak);
  progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
  progress.lastPracticeDate = new Date();

  const xp = isCorrect ? (XP_REWARDS[difficulty] || 10) : 2;
  progress.xp += xp;
  progress.level = Math.floor(progress.xp / 500) + 1;

  let topicEntry = progress.topicProgress.find(t => t.subtopic === subtopic);
  if (!topicEntry) {
    topicEntry = { subtopic, category, attempted: 0, correct: 0, accuracy: 0 };
    progress.topicProgress.push(topicEntry);
  }
  topicEntry.attempted += 1;
  if (isCorrect) topicEntry.correct += 1;
  topicEntry.accuracy = Math.round((topicEntry.correct / topicEntry.attempted) * 100);
  topicEntry.lastPracticed = new Date();

  if (progress.currentStreak >= 7 && !progress.badges.includes('Week Warrior')) {
    progress.badges.push('Week Warrior');
  }

  if (progress.overallAccuracy >= 80 && progress.totalAttempted >= 50 && !progress.badges.includes('Accuracy Ace')) {
    progress.badges.push('Accuracy Ace');
  }

  const recentAccuracy = progress.topicProgress.slice(-5).reduce((s, t) => s + t.accuracy, 0) / Math.max(1, Math.min(5, progress.topicProgress.length));
  if (recentAccuracy >= 80) progress.adaptiveDifficulty = 'Hard';
  else if (recentAccuracy >= 50) progress.adaptiveDifficulty = 'Medium';
  else progress.adaptiveDifficulty = 'Easy';

  await progress.save();
  await updateLeaderboard(userId, progress);
  return { progress, xpEarned: xp };
};

const updateLeaderboard = async (userId, progress, userName) => {
  const periods = ['all-time', 'weekly', 'monthly'];
  for (const period of periods) {
    await AptitudeLeaderboard.findOneAndUpdate(
      { userId, period, category: 'overall' },
      {
        userId,
        userName: userName || 'Student',
        totalXp: progress.xp,
        accuracy: progress.overallAccuracy,
        streak: progress.currentStreak,
        period,
        category: 'overall'
      },
      { upsert: true, new: true }
    );
  }
};

const recordCodingSolve = async (userId, problemId, language, runtime, difficulty, displayName) => {
  const profile = await getOrCreateProfile(userId, displayName);
  const alreadySolved = profile.solvedProblems.some(p => p.problemId?.toString() === problemId.toString());
  if (!alreadySolved) {
    profile.solvedProblems.push({ problemId, language, runtime, solvedAt: new Date() });
    const xp = XP_REWARDS[difficulty] || 20;
    await awardXp(userId, xp, 'coding', displayName);
  }
  if (!profile.attemptedProblems.includes(problemId)) {
    profile.attemptedProblems.push(problemId);
  }
  const totalAttempts = profile.attemptedProblems.length;
  const solved = profile.solvedProblems.length;
  profile.acceptanceRate = totalAttempts > 0 ? Math.round((solved / totalAttempts) * 100) : 0;
  await profile.save();
  return profile;
};

module.exports = {
  getOrCreateProfile,
  getOrCreateAptitudeProgress,
  awardXp,
  updateAptitudeProgress,
  updateLeaderboard,
  recordCodingSolve,
  XP_REWARDS
};
