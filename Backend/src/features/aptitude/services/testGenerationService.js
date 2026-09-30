const AptitudeQuestion = require('../models/AptitudeQuestion');

/**
 * Shuffles an array in-place using Fisher-Yates
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a question set based on a topicMix.
 * If dryRun is true, it only validates sufficiency and returns boolean + errors.
 * If dryRun is false, it returns an array of randomly selected AptitudeQuestion documents.
 */
async function generateQuestionSet(topicMix, options = {}) {
  const { excludeQuestionIds = [], dryRun = false, pyqMeta = null } = options;
  
  const selectedQuestions = [];
  const errors = [];

  for (const mix of topicMix) {
    const { category, subtopics, difficultyDistribution, questionCount } = mix;
    
    // Safety check
    const totalRequested = (difficultyDistribution?.easy || 0) + 
                           (difficultyDistribution?.medium || 0) + 
                           (difficultyDistribution?.hard || 0);
    
    if (totalRequested !== questionCount) {
      errors.push(`Topic mix for ${category} requests ${questionCount} questions but difficulty distribution sums to ${totalRequested}`);
      continue;
    }

    const difficulties = ['easy', 'medium', 'hard'];
    
    for (const diff of difficulties) {
      const needed = difficultyDistribution[diff];
      if (needed <= 0) continue;

      const query = {
        difficulty: diff.charAt(0).toUpperCase() + diff.slice(1),
        isActive: true
      };

      // If fetching PYQ only, omit category filter to cross all categories
      if (pyqMeta) {
        query.isPYQ = true;
        if (pyqMeta.company) query['pyqMeta.company'] = pyqMeta.company;
        if (pyqMeta.year) query['pyqMeta.year'] = pyqMeta.year;
      } else {
        query.category = category;
        if (subtopics && subtopics.length > 0) {
          query.subtopic = { $in: subtopics };
        }
      }

      if (excludeQuestionIds && excludeQuestionIds.length > 0) {
        query._id = { $nin: excludeQuestionIds };
      }

      // Fetch IDs only for performance
      const availableQuestions = await AptitudeQuestion.find(query).select('_id');
      
      if (availableQuestions.length < needed) {
        const subtopicStr = subtopics && subtopics.length > 0 ? subtopics.join(', ') : 'any subtopic';
        errors.push(`Insufficient ${diff} questions for ${category} (${subtopicStr}). Needed ${needed}, but only ${availableQuestions.length} available.`);
      } else if (!dryRun) {
        // Randomly pick `needed` IDs
        shuffle(availableQuestions);
        const selectedIds = availableQuestions.slice(0, needed).map(q => q._id);
        
        // Fetch full question docs
        const fullDocs = await AptitudeQuestion.find({ _id: { $in: selectedIds } });
        selectedQuestions.push(...fullDocs);
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  if (dryRun) {
    return { success: true, errors: [] };
  }

  // Final shuffle of the combined test
  shuffle(selectedQuestions);

  // Optionally shuffle options within each question to reduce memorization
  const randomizedQuestions = selectedQuestions.map(q => {
    const qObj = q.toObject();
    
    if (qObj.options && Array.isArray(qObj.options)) {
      // Find the correct option before shuffling
      const correctOpt = qObj.options.find(opt => opt.value === qObj.correctAnswer || opt.label === qObj.correctAnswer);
      
      shuffle(qObj.options);
      
      // Update labels (A, B, C, D) to match new order
      const labels = ['A', 'B', 'C', 'D', 'E'];
      qObj.options.forEach((opt, idx) => {
        opt.label = labels[idx];
      });
      
      // Re-assign correctAnswer to the new label
      if (correctOpt) {
        const newCorrectOpt = qObj.options.find(opt => opt.value === correctOpt.value);
        if (newCorrectOpt) {
          qObj.correctAnswer = newCorrectOpt.label; // Assuming standard format uses label as correctAnswer
        }
      }
    }
    return qObj;
  });

  return { success: true, questions: randomizedQuestions };
}

module.exports = {
  generateQuestionSet
};
