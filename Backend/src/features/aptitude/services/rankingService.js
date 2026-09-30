const AptitudeAttempt = require('../models/AptitudeAttempt');
const User = require('../../users/models/User');

/**
 * Calculates rank for a given test based on completed attempts.
 * Sort: Score (descending) -> Time Taken (ascending) -> Submission Time (ascending).
 * Identical stats get the same rank number.
 */
async function rankAttemptsForTest(testId) {
  // 1. Fetch completed attempts
  const attempts = await AptitudeAttempt.find({ 
    testId, 
    completed: true 
  }).lean();

  if (!attempts.length) {
    return [];
  }

  // 2. Map candidate IDs to fetch names
  const candidateIds = attempts.map(a => a.studentId);
  const users = await User.find({ _id: { $in: candidateIds } }).lean();
  const userMap = users.reduce((acc, u) => {
    acc[u._id.toString()] = u;
    return acc;
  }, {});

  // 3. Prepare data for sorting
  const rankedData = attempts.map(attempt => {
    let score = 0;
    if (attempt.score !== undefined) {
      score = attempt.score;
    } else {
      // Calculate score if not pre-calculated
      (attempt.answers || []).forEach(ans => {
        if (ans.isCorrect) {
          score += (ans.marks || 1);
        } else if (ans.selectedAnswer !== null && ans.selectedAnswer !== undefined) {
          score -= (ans.negativeMarks || 0);
        }
      });
    }

    let timeTaken = 0;
    if (attempt.startedAt && attempt.submittedAt) {
      timeTaken = Math.max(0, Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000));
    } else if (attempt.startedAt && attempt.completedAt) {
      timeTaken = Math.max(0, Math.floor((new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000));
    } else if (attempt.timeTakenSeconds) {
      timeTaken = attempt.timeTakenSeconds;
    } else {
      (attempt.answers || []).forEach(ans => {
        timeTaken += (ans.timeSpentSeconds || 0);
      });
    }

    const candidate = userMap[attempt.studentId?.toString()];

    return {
      attemptId: attempt._id,
      candidateId: attempt.studentId,
      candidateName: candidate?.name || candidate?.email || 'Unknown Candidate',
      candidateEmail: candidate?.email || '',
      score: Number(score.toFixed(2)),
      timeTaken,
      submittedAt: attempt.completedAt || attempt.updatedAt,
      answers: attempt.answers || [],
      violationsCount: attempt.securitySummary?.totalViolations || 0,
      suspicionScore: attempt.suspicionScore || 0,
      suspicious: !!attempt.suspicious
    };
  });

  // 4. Sort
  // Score DESC, TimeTaken ASC, SubmittedAt ASC
  rankedData.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.timeTaken !== b.timeTaken) {
      return a.timeTaken - b.timeTaken;
    }
    const timeA = new Date(a.submittedAt).getTime();
    const timeB = new Date(b.submittedAt).getTime();
    return timeA - timeB;
  });

  // 5. Assign Ranks (handling ties)
  let currentRank = 1;
  for (let i = 0; i < rankedData.length; i++) {
    if (i > 0) {
      const prev = rankedData[i - 1];
      const curr = rankedData[i];
      const timePrev = new Date(prev.submittedAt).getTime();
      const timeCurr = new Date(curr.submittedAt).getTime();
      
      const isTie = prev.score === curr.score && 
                    prev.timeTaken === curr.timeTaken && 
                    timePrev === timeCurr;
      
      if (!isTie) {
        currentRank = i + 1;
      }
    }
    rankedData[i].rank = currentRank;
  }

  return rankedData;
}

module.exports = {
  rankAttemptsForTest
};
