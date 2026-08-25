const APTITUDE_CATEGORIES = {
  'Quantitative Aptitude': [
    'Number System', 'Percentage', 'Profit & Loss', 'Time & Work', 'Pipes & Cistern',
    'Time Speed Distance', 'Ratio & Proportion', 'Average', 'Mixture', 'Partnership',
    'Permutation', 'Probability', 'Algebra', 'Geometry', 'Mensuration',
    'Trigonometry', 'Data Interpretation'
  ],
  'Logical Reasoning': [
    'Blood Relation', 'Direction', 'Coding Decoding', 'Seating Arrangement', 'Puzzle',
    'Syllogism', 'Statement Assumption', 'Statement Conclusion', 'Calendar', 'Clock',
    'Cube', 'Dice'
  ],
  'Verbal Ability': [
    'Reading Comprehension', 'Para Jumbles', 'Fill in the Blanks', 'Synonyms', 'Antonyms',
    'Error Detection', 'Sentence Improvement', 'Vocabulary Builder', 'Idioms',
    'One Word Substitution'
  ]
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const COMPANY_TAGS = [
  'Amazon', 'Google', 'Microsoft', 'Infosys', 'TCS', 'Accenture', 'Cognizant',
  'Capgemini', 'Wipro', 'Deloitte', 'Goldman Sachs', 'JP Morgan', 'Adobe', 'Oracle', 'SAP'
];

const PRACTICE_MODES = ['practice', 'timed-quiz', 'mock-test', 'company-questions'];

module.exports = {
  APTITUDE_CATEGORIES,
  DIFFICULTIES,
  COMPANY_TAGS,
  PRACTICE_MODES
};
