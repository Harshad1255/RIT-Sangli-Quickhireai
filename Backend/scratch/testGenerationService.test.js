const { generateQuestionSet } = require('../src/features/aptitude/services/testGenerationService');
const mongoose = require('mongoose');

describe('testGenerationService', () => {
  it('should validate sufficiency correctly when dryRun is true', async () => {
    // We mock AptitudeQuestion.find for this test
    const AptitudeQuestion = require('../src/features/aptitude/models/AptitudeQuestion');
    AptitudeQuestion.find = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }])
    });

    const topicMix = [{
      category: 'Quantitative Aptitude',
      questionCount: 3,
      difficultyDistribution: { easy: 3, medium: 0, hard: 0 }
    }];

    const result = await generateQuestionSet(topicMix, { dryRun: true });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Insufficient easy questions for Quantitative Aptitude');
  });
});
