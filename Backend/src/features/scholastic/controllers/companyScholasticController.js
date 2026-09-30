const { AptitudeQuestion, ScholasticPracticeSet, ScholasticPracticeAttempt } = require('../models');

const questionFields = ['title', 'questionText', 'questionImageUrl', 'questionType', 'category', 'subCategory', 'difficulty', 'options', 'correctOptionId', 'correctOptionIds', 'explanation', 'hint', 'tags', 'xp', 'status'];

const validateQuestion = (payload) => {
  const errors = [];
  if (!payload.title?.trim()) errors.push('Question title is required.');
  if (!payload.questionText?.trim()) errors.push('Question text is required.');
  if (!payload.category?.trim()) errors.push('Category is required.');
  if (!payload.subCategory?.trim()) errors.push('Topic is required.');
  if (!['Easy', 'Medium', 'Hard'].includes(payload.difficulty)) errors.push('Difficulty must be Easy, Medium, or Hard.');
  
  const qType = payload.questionType || 'Multiple Choice';
  
  if (!['Multiple Choice', 'Multiple Select', 'True/False'].includes(qType)) {
    errors.push('Invalid question type.');
  }

  if (qType === 'True/False') {
    if (!Array.isArray(payload.options) || payload.options.length !== 2) {
      errors.push('True/False questions must have exactly two options.');
    }
  } else {
    if (!Array.isArray(payload.options) || payload.options.length < 2 || payload.options.some(option => !option?.text?.trim())) {
      errors.push('At least two non-empty options are required.');
    }
  }

  if (qType === 'Multiple Select') {
    if (!Array.isArray(payload.correctOptionIds) || payload.correctOptionIds.length === 0) {
      errors.push('At least one correct answer must be selected for Multiple Select.');
    } else if (payload.correctOptionIds.some(id => !payload.options?.some(opt => Number(opt.id) === Number(id)))) {
      errors.push('One or more selected correct answers are invalid.');
    }
  } else {
    if (payload.correctOptionId === undefined || payload.correctOptionId === null || !payload.options?.some(option => Number(option.id) === Number(payload.correctOptionId))) {
      errors.push('A valid correct answer is required.');
    }
  }

  return errors;
};

const pickQuestionFields = (body) => Object.fromEntries(
  questionFields.filter(field => body[field] !== undefined).map(field => [field, body[field]])
);

const companyScholasticController = {
  // ---------------------------------------------------------
  // QUESTIONS MANAGEMENT
  // ---------------------------------------------------------
  async getQuestions(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const { search, category, topic, difficulty, status, page = 1, limit = 20 } = req.query;
      const query = { companyId };
      if (category && category !== 'All') query.category = category;
      if (topic && topic !== 'All') query.subCategory = topic;
      if (difficulty && difficulty !== 'All') query.difficulty = difficulty;
      if (status && status !== 'All') query.status = status;
      if (search?.trim()) query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { questionText: { $regex: search.trim(), $options: 'i' } }
      ];
      const pageNumber = Math.max(1, Number(page));
      const pageSize = Math.min(100, Math.max(1, Number(limit)));
      const [questions, total] = await Promise.all([
        AptitudeQuestion.find(query).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
        AptitudeQuestion.countDocuments(query)
      ]);
      res.status(200).json({ success: true, questions, total, page: pageNumber, pages: Math.ceil(total / pageSize) });
    } catch (error) {
      console.error('Error fetching company questions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch questions' });
    }
  },

  async createQuestion(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const data = pickQuestionFields(req.body);
      data.status = data.status || 'Draft';
      if (data.status === 'Published') {
        const errors = validateQuestion(data);
        if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });
      }
      const question = await AptitudeQuestion.create({
        ...data,
        companyId,
      });
      res.status(201).json({ success: true, question });
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({ success: false, error: 'Failed to create question' });
    }
  },

  async updateQuestion(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const { id } = req.params;
      
      const question = await AptitudeQuestion.findOne({ _id: id, companyId });
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found or unauthorized' });
      }

      const data = pickQuestionFields(req.body);
      const nextValues = { ...question.toObject(), ...data };
      if (data.status === 'Published' || question.status === 'Published') {
        const errors = validateQuestion(nextValues);
        if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });
      }
      const updated = await AptitudeQuestion.findByIdAndUpdate(
        id, 
        { $set: data }, 
        { new: true, runValidators: true }
      );
      res.status(200).json({ success: true, question: updated });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ success: false, error: 'Failed to update question' });
    }
  },

  async deleteQuestion(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const { id } = req.params;
      
      const question = await AptitudeQuestion.findOne({ _id: id, companyId });
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found or unauthorized' });
      }

      // Check if it's used in any practice sets
      const usedInSets = await ScholasticPracticeSet.findOne({ questions: id });
      if (usedInSets) {
        // Soft delete/Archive if used
        question.status = 'Archived';
        await question.save();
        return res.status(200).json({ success: true, message: 'Question archived as it is used in practice sets.' });
      }

      await AptitudeQuestion.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Question deleted successfully.' });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ success: false, error: 'Failed to delete question' });
    }
  },

  async publishQuestion(req, res) {
    return companyScholasticController.updateQuestion({ ...req, body: { status: 'Published' } }, res);
  },

  async unpublishQuestion(req, res) {
    return companyScholasticController.updateQuestion({ ...req, body: { status: 'Draft' } }, res);
  },

  async archiveQuestion(req, res) {
    return companyScholasticController.updateQuestion({ ...req, body: { status: 'Archived' } }, res);
  },

  async duplicateQuestion(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const source = await AptitudeQuestion.findOne({ _id: req.params.id, companyId }).lean();
      if (!source) return res.status(404).json({ success: false, error: 'Question not found or unauthorized' });
      const { _id, createdAt, updatedAt, totalAttempts, correctAttempts, accuracy, averageTimeSeconds, status, ...copy } = source;
      const question = await AptitudeQuestion.create({ ...copy, companyId, status: 'Draft', totalAttempts: 0, correctAttempts: 0, accuracy: 0 });
      res.status(201).json({ success: true, question });
    } catch (error) {
      console.error('Error duplicating question:', error);
      res.status(500).json({ success: false, error: 'Failed to duplicate question' });
    }
  },

  // ---------------------------------------------------------
  // PRACTICE SETS MANAGEMENT
  // ---------------------------------------------------------
  async getPracticeSets(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const sets = await ScholasticPracticeSet.find({ companyId })
        .populate('questions', 'title questionText category difficulty status')
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, practiceSets: sets });
    } catch (error) {
      console.error('Error fetching practice sets:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch practice sets' });
    }
  },

  async createPracticeSet(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const questionIds = Array.isArray(req.body.questions) ? [...new Set(req.body.questions)] : [];
      const ownedQuestions = await AptitudeQuestion.countDocuments({ _id: { $in: questionIds }, companyId, status: 'Published' });
      if (ownedQuestions !== questionIds.length) {
        return res.status(400).json({ success: false, error: 'Practice sets may contain only your published questions.' });
      }
      if (req.body.status === 'Published' && (!req.body.title?.trim() || questionIds.length === 0)) {
        return res.status(400).json({ success: false, error: 'A published practice set requires a title and at least one question.' });
      }
      const practiceSet = await ScholasticPracticeSet.create({
        ...req.body,
        questions: questionIds,
        companyId,
        status: req.body.status || 'Draft'
      });
      res.status(201).json({ success: true, practiceSet });
    } catch (error) {
      console.error('Error creating practice set:', error);
      res.status(500).json({ success: false, error: 'Failed to create practice set' });
    }
  },

  async updatePracticeSet(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const { id } = req.params;
      
      const practiceSet = await ScholasticPracticeSet.findOne({ _id: id, companyId });
      if (!practiceSet) {
        return res.status(404).json({ success: false, error: 'Practice Set not found or unauthorized' });
      }

      const data = { ...req.body };
      if (Array.isArray(data.questions)) {
        data.questions = [...new Set(data.questions)];
        const ownedQuestions = await AptitudeQuestion.countDocuments({ _id: { $in: data.questions }, companyId, status: 'Published' });
        if (ownedQuestions !== data.questions.length) return res.status(400).json({ success: false, error: 'Practice sets may contain only your published questions.' });
      }
      if (data.status === 'Published' && (!data.title?.trim() && !practiceSet.title || !(data.questions || practiceSet.questions).length)) {
        return res.status(400).json({ success: false, error: 'A published practice set requires a title and at least one question.' });
      }
      if (data.status === 'Published') {
        const questionIds = data.questions || practiceSet.questions;
        const publishedQuestions = await AptitudeQuestion.countDocuments({ _id: { $in: questionIds }, companyId, status: 'Published' });
        if (publishedQuestions !== questionIds.length) {
          return res.status(400).json({ success: false, error: 'All practice-set questions must be published before the set can be published.' });
        }
      }
      const updated = await ScholasticPracticeSet.findByIdAndUpdate(
        id, 
        { $set: data, updatedAt: Date.now() }, 
        { new: true, runValidators: true }
      ).populate('questions', 'title questionText category difficulty status');
      
      res.status(200).json({ success: true, practiceSet: updated });
    } catch (error) {
      console.error('Error updating practice set:', error);
      res.status(500).json({ success: false, error: 'Failed to update practice set' });
    }
  },

  async deletePracticeSet(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      const { id } = req.params;
      
      const practiceSet = await ScholasticPracticeSet.findOne({ _id: id, companyId });
      if (!practiceSet) {
        return res.status(404).json({ success: false, error: 'Practice Set not found or unauthorized' });
      }

      // Check for existing attempts
      const attempts = await ScholasticPracticeAttempt.countDocuments({ practiceSetId: id });
      if (attempts > 0) {
        // Soft archive
        practiceSet.status = 'Archived';
        await practiceSet.save();
        return res.status(200).json({ success: true, message: 'Practice Set archived (has existing student attempts).' });
      }

      await ScholasticPracticeSet.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Practice Set deleted.' });
    } catch (error) {
      console.error('Error deleting practice set:', error);
      res.status(500).json({ success: false, error: 'Failed to delete practice set' });
    }
  },

  async publishPracticeSet(req, res) {
    return companyScholasticController.updatePracticeSet({ ...req, body: { status: 'Published' } }, res);
  },

  async unpublishPracticeSet(req, res) {
    return companyScholasticController.updatePracticeSet({ ...req, body: { status: 'Draft' } }, res);
  },

  async archivePracticeSet(req, res) {
    return companyScholasticController.updatePracticeSet({ ...req, body: { status: 'Archived' } }, res);
  },

  // ---------------------------------------------------------
  // ANALYTICS
  // ---------------------------------------------------------
  async getAnalytics(req, res) {
    try {
      const companyId = req.user.id || req.user._id;
      
      const practiceSets = await ScholasticPracticeSet.find({ companyId });
      const questionsCount = await AptitudeQuestion.countDocuments({ companyId });
      const [publishedQuestions, draftQuestions, totalAttempts] = await Promise.all([
        AptitudeQuestion.countDocuments({ companyId, status: 'Published' }),
        AptitudeQuestion.countDocuments({ companyId, status: 'Draft' }),
        ScholasticPracticeAttempt.countDocuments({ practiceSetId: { $in: practiceSets.map(set => set._id) } })
      ]);
      
      let sumAccuracy = 0;
      let countWithAttempts = 0;

      practiceSets.forEach(set => {
        if (set.totalAttempts > 0) {
          sumAccuracy += set.averageAccuracy;
          countWithAttempts++;
        }
      });

      const avgAccuracy = countWithAttempts > 0 ? (sumAccuracy / countWithAttempts).toFixed(2) : 0;

      res.status(200).json({
        success: true,
        analytics: {
          totalPracticeSets: practiceSets.length,
          publishedSets: practiceSets.filter(s => s.status === 'Published').length,
          totalQuestions: questionsCount,
          publishedQuestions,
          draftQuestions,
          totalAttempts,
          averageAccuracy: Number(avgAccuracy)
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }
};

module.exports = companyScholasticController;
