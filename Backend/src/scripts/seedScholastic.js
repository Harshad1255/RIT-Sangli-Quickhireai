const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
}

const {
  Company,
  AptitudeCategory,
  AptitudeQuestion,
  CodingQuestion,
  CodingTestCase,
  MockTest,
  Contest,
  Badge,
  Achievement,
  DailyChallenge
} = require('../features/scholastic/models');

const companiesData = [
  { name: 'TCS', industry: 'IT Services', difficultyLevel: 'Easy', logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-tcs-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-company-vol-6-pack-logos-icons-2945281.png' },
  { name: 'Infosys', industry: 'IT Services', difficultyLevel: 'Easy' },
  { name: 'Capgemini', industry: 'Consulting', difficultyLevel: 'Medium' },
  { name: 'Accenture', industry: 'Consulting', difficultyLevel: 'Medium' },
  { name: 'Wipro', industry: 'IT Services', difficultyLevel: 'Easy' },
  { name: 'Cognizant', industry: 'IT Services', difficultyLevel: 'Easy' },
  { name: 'IBM', industry: 'Technology', difficultyLevel: 'Medium' },
  { name: 'Amazon', industry: 'E-Commerce/Cloud', difficultyLevel: 'Hard' },
  { name: 'Microsoft', industry: 'Software/Cloud', difficultyLevel: 'Hard' },
  { name: 'Google', industry: 'Internet/Search', difficultyLevel: 'Hard' },
  { name: 'JP Morgan', industry: 'Finance', difficultyLevel: 'Hard' },
  { name: 'Goldman Sachs', industry: 'Investment Banking', difficultyLevel: 'Hard' },
  { name: 'Oracle', industry: 'Enterprise Software', difficultyLevel: 'Medium' },
  { name: 'Adobe', industry: 'Creative Software', difficultyLevel: 'Hard' },
  { name: 'Deloitte', industry: 'Consulting', difficultyLevel: 'Medium' },
  { name: 'EY', industry: 'Accounting/Consulting', difficultyLevel: 'Medium' },
  { name: 'KPMG', industry: 'Accounting/Consulting', difficultyLevel: 'Medium' },
  { name: 'PwC', industry: 'Accounting/Consulting', difficultyLevel: 'Medium' }
];

const categoriesData = [
  { name: 'Quantitative Aptitude', slug: 'quantitative-aptitude', section: 'Quantitative Aptitude', icon: 'fas fa-calculator' },
  { name: 'Logical Reasoning', slug: 'logical-reasoning', section: 'Logical Reasoning', icon: 'fas fa-brain' },
  { name: 'Verbal Ability', slug: 'verbal-ability', section: 'Verbal Ability', icon: 'fas fa-book-open' },
  { name: 'Data Interpretation', slug: 'data-interpretation', section: 'Data Interpretation', icon: 'fas fa-chart-bar' },
  { name: 'Puzzle', slug: 'puzzle', section: 'Puzzles', icon: 'fas fa-puzzle-piece' },
  { name: 'Critical Reasoning', slug: 'critical-reasoning', section: 'Logical Reasoning', icon: 'fas fa-balance-scale' },
  { name: 'Probability', slug: 'probability', section: 'Quantitative Aptitude', icon: 'fas fa-dice' },
  { name: 'Permutation Combination', slug: 'permutation-combination', section: 'Quantitative Aptitude', icon: 'fas fa-project-diagram' },
  { name: 'Time Work', slug: 'time-work', section: 'Quantitative Aptitude', icon: 'fas fa-clock' },
  { name: 'Time Speed Distance', slug: 'time-speed-distance', section: 'Quantitative Aptitude', icon: 'fas fa-tachometer-alt' },
  { name: 'Percentage', slug: 'percentage', section: 'Quantitative Aptitude', icon: 'fas fa-percent' },
  { name: 'Ratio', slug: 'ratio', section: 'Quantitative Aptitude', icon: 'fas fa-divide' },
  { name: 'Simple Interest', slug: 'simple-interest', section: 'Quantitative Aptitude', icon: 'fas fa-coins' },
  { name: 'Compound Interest', slug: 'compound-interest', section: 'Quantitative Aptitude', icon: 'fas fa-piggy-bank' },
  { name: 'Profit Loss', slug: 'profit-loss', section: 'Quantitative Aptitude', icon: 'fas fa-chart-line' },
  { name: 'Algebra', slug: 'algebra', section: 'Quantitative Aptitude', icon: 'fas fa-square-root-alt' },
  { name: 'Geometry', slug: 'geometry', section: 'Quantitative Aptitude', icon: 'fas fa-shapes' },
  { name: 'Mensuration', slug: 'mensuration', section: 'Quantitative Aptitude', icon: 'fas fa-ruler-combined' },
  { name: 'Statistics', slug: 'statistics', section: 'Quantitative Aptitude', icon: 'fas fa-chart-pie' },
  { name: 'Number System', slug: 'number-system', section: 'Quantitative Aptitude', icon: 'fas fa-sort-numeric-up' },
  { name: 'Calendar', slug: 'calendar', section: 'Logical Reasoning', icon: 'fas fa-calendar-alt' },
  { name: 'Clock', slug: 'clock', section: 'Logical Reasoning', icon: 'fas fa-stopwatch' },
  { name: 'Blood Relation', slug: 'blood-relation', section: 'Logical Reasoning', icon: 'fas fa-users' },
  { name: 'Direction Sense', slug: 'direction-sense', section: 'Logical Reasoning', icon: 'fas fa-compass' },
  { name: 'Coding Decoding', slug: 'coding-decoding', section: 'Logical Reasoning', icon: 'fas fa-key' },
  { name: 'Input Output', slug: 'input-output', section: 'Logical Reasoning', icon: 'fas fa-exchange-alt' },
  { name: 'Series', slug: 'series', section: 'Logical Reasoning', icon: 'fas fa-list-ol' },
  { name: 'Syllogism', slug: 'syllogism', section: 'Logical Reasoning', icon: 'fas fa-project-diagram' },
  { name: 'Seating Arrangement', slug: 'seating-arrangement', section: 'Logical Reasoning', icon: 'fas fa-chair' }
];

const codingTopics = [
  'Arrays', 'Strings', 'Linked List', 'Stack', 'Queue', 'Tree', 'BST', 'Heap', 'HashMap', 'Binary Search',
  'Recursion', 'Backtracking', 'Dynamic Programming', 'Graphs', 'Trie', 'Greedy', 'Sliding Window',
  'Bit Manipulation', 'Math', 'Sorting', 'Searching'
];

// Helper to generate 100 aptitude questions
const generateAptitudeQuestions = () => {
  const questions = [];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const companiesList = ['TCS', 'Infosys', 'Amazon', 'Google', 'Accenture', 'Microsoft', 'Capgemini', 'Wipro', 'Deloitte', 'JP Morgan'];
  
  for (let i = 1; i <= 100; i++) {
    const categoryObj = categoriesData[(i - 1) % categoriesData.length];
    const diff = difficulties[i % 3];
    const assignedCompanies = [companiesList[i % companiesList.length], companiesList[(i + 3) % companiesList.length]];
    
    // Create diverse question content
    let qText = `What is the value of expression #${i} in ${categoryObj.name}?`;
    let opts = [
      { id: 0, text: `${i * 10}` },
      { id: 1, text: `${i * 10 + 5}` },
      { id: 2, text: `${i * 10 + 10}` },
      { id: 3, text: `${i * 10 + 15}` }
    ];
    let correctId = i % 4;
    let hint = `Remember the standard formula for ${categoryObj.name} problems.`;
    let explanation = `Step 1: Identify given values for ${categoryObj.name}. Step 2: Apply correct principle. The answer is option ${correctId + 1} (${opts[correctId].text}).`;

    if (categoryObj.name === 'Percentage') {
      qText = `If the price of a commodity increases by ${10 + (i % 5)*5}%, by what percentage should a consumer reduce consumption so that expenditure remains unchanged?`;
      opts = [
        { id: 0, text: '9.09%' },
        { id: 1, text: '10%' },
        { id: 2, text: '12.5%' },
        { id: 3, text: '15%' }
      ];
      correctId = 0;
      explanation = `Reduction % = [r / (100 + r)] * 100. For r = 10%, (10/110)*100 = 9.09%.`;
    } else if (categoryObj.name === 'Time Work') {
      qText = `A can do a piece of work in ${10 + i} days and B can do the same work in ${15 + i} days. In how many days will they finish the work together?`;
      opts = [
        { id: 0, text: '6 days' },
        { id: 1, text: '8 days' },
        { id: 2, text: '9 days' },
        { id: 3, text: '10 days' }
      ];
      correctId = 0;
      explanation = `Total work = LCM of days. Combined efficiency = sum of daily work.`;
    } else if (categoryObj.name === 'Blood Relation') {
      qText = `Pointing to a photograph of a boy Suresh, Ram said, "He is the son of the only son of my mother." How is Suresh related to Ram?`;
      opts = [
        { id: 0, text: 'Brother' },
        { id: 1, text: 'Uncle' },
        { id: 2, text: 'Cousin' },
        { id: 3, text: 'Son' }
      ];
      correctId = 3;
      explanation = `The only son of Ram's mother is Ram himself. Therefore, the boy is Ram's son.`;
    } else if (categoryObj.name === 'Series') {
      qText = `Find the next number in the sequence: 2, 6, 12, 20, 30, ?`;
      opts = [
        { id: 0, text: '40' },
        { id: 1, text: '42' },
        { id: 2, text: '44' },
        { id: 3, text: '48' }
      ];
      correctId = 1;
      explanation = `The difference between consecutive numbers increases by 2 each time (+4, +6, +8, +10, +12). 30 + 12 = 42.`;
    }

    questions.push({
      title: `${categoryObj.name} Problem #${i}`,
      questionText: qText,
      options: opts,
      correctOptionId: correctId,
      category: categoryObj.name,
      subCategory: categoryObj.section,
      difficulty: diff,
      companies: assignedCompanies,
      hint: hint,
      explanation: explanation,
      tags: [categoryObj.slug, diff.toLowerCase()],
      accuracy: 65 + (i % 25),
      totalAttempts: 150 + i * 3,
      correctAttempts: 100 + i * 2,
      averageTimeSeconds: 45 + (i % 45)
    });
  }
  return questions;
};

// Helper to generate 50 coding problems
const generateCodingProblems = () => {
  const problems = [];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const companiesList = ['Google', 'Amazon', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'Uber', 'Bloomberg', 'TCS', 'Infosys'];

  for (let i = 1; i <= 50; i++) {
    const topic = codingTopics[(i - 1) % codingTopics.length];
    const diff = difficulties[i % 3];
    const slug = `${topic.toLowerCase().replace(/\s+/g, '-')}-problem-${i}`;

    let title = `${topic} Challenge #${i}`;
    let statement = `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.`;
    let starterCode = {
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your code here\n        return {};\n    }\n};`,
      java: `import java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n}`,
      python: `def solve(nums, target):\n    # Write your code here\n    pass`,
      javascript: `function solve(nums, target) {\n    // Write your code here\n    return [];\n}`
    };

    if (i === 1) {
      title = `Two Sum`;
      statement = `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\nYou may assume that each input would have exactly one solution.`;
    } else if (i === 2) {
      title = `Reverse a Linked List`;
      statement = `Given the head of a singly linked list, reverse the list, and return the reversed list.`;
    } else if (i === 3) {
      title = `Valid Parentheses`;
      statement = `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`;
    } else if (i === 4) {
      title = `Maximum Subarray`;
      statement = `Given an integer array nums, find the subarray with the largest sum, and return its sum.`;
    } else if (i === 5) {
      title = `Binary Search`;
      statement = `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.`;
    }

    problems.push({
      title: title,
      slug: `${slug}-${Date.now()}-${i}`,
      difficulty: diff,
      topic: topic,
      tags: [topic.toLowerCase(), diff.toLowerCase(), 'placement-essential'],
      companies: [companiesList[i % companiesList.length], companiesList[(i + 4) % companiesList.length]],
      problemStatement: statement,
      examples: [
        {
          input: `nums = [2,7,11,15], target = 9`,
          output: `[0,1]`,
          explanation: `Because nums[0] + nums[1] == 9, we return [0, 1].`
        }
      ],
      constraints: [
        `2 <= nums.length <= 10^4`,
        `-10^9 <= nums[i] <= 10^9`,
        `-10^9 <= target <= 10^9`
      ],
      hints: [
        `A really brute force way would be to search for all possible pairs of numbers but that would be too slow.`,
        `Try to use a hash map to store the difference target - nums[i].`
      ],
      editorial: `Use a Hash Map to achieve O(n) time complexity by storing visited numbers and their indices.`,
      starterCode: starterCode,
      acceptanceRate: 68.5 + (i % 20),
      totalSubmissions: 300 + i * 10,
      acceptedSubmissions: 200 + i * 7
    });
  }
  return problems;
};

// Helper to generate 20 mock tests
const generateMockTests = (aptitudeIds, codingIds) => {
  const testTypes = ['Topic Wise', 'Company Wise', 'Mixed', 'Placement Test', 'Coding Test', 'Custom Test'];
  const companies = ['TCS', 'Infosys', 'Amazon', 'Google', 'Microsoft', 'Accenture', 'Capgemini', 'Wipro', 'Deloitte', 'Goldman Sachs'];
  const mockTests = [];

  for (let i = 1; i <= 20; i++) {
    const tType = testTypes[i % testTypes.length];
    const companyName = companies[i % companies.length];
    
    // Pick subset of questions
    const selectedApt = aptitudeIds.slice((i * 5) % 80, (i * 5) % 80 + 10);
    const selectedCode = codingIds.slice((i * 2) % 40, (i * 2) % 40 + 2);

    mockTests.push({
      title: `${companyName} ${tType} Mock #${i}`,
      testType: tType,
      company: companyName,
      description: `Complete full simulation test for ${companyName} placement pattern including aptitude and coding challenges.`,
      durationMinutes: 45 + (i % 3) * 15,
      totalMarks: selectedApt.length * 2 + selectedCode.length * 20,
      negativeMarking: i % 2 === 0,
      negativeMarkValue: 0.25,
      aptitudeQuestions: selectedApt,
      codingQuestions: selectedCode,
      totalAttemptsCount: 50 + i * 4
    });
  }
  return mockTests;
};

const seedDatabase = async () => {
  try {
    console.log('--- Starting Scholastic Module Seeding ---');
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing collections
    await Promise.all([
      Company.deleteMany({}),
      AptitudeCategory.deleteMany({}),
      AptitudeQuestion.deleteMany({}),
      CodingQuestion.deleteMany({}),
      CodingTestCase.deleteMany({}),
      MockTest.deleteMany({}),
      Badge.deleteMany({}),
      Achievement.deleteMany({}),
      DailyChallenge.deleteMany({})
    ]);
    console.log('🧹 Cleared old scholastic collections');

    // 1. Seed Companies
    const createdCompanies = await Company.insertMany(companiesData);
    console.log(`✅ Seeded ${createdCompanies.length} Companies`);

    // 2. Seed Aptitude Categories
    const createdCategories = await AptitudeCategory.insertMany(categoriesData);
    console.log(`✅ Seeded ${createdCategories.length} Aptitude Categories`);

    // 3. Seed 100 Aptitude Questions
    const aptitudeQuestionsData = generateAptitudeQuestions();
    const createdAptitudeQuestions = await AptitudeQuestion.insertMany(aptitudeQuestionsData);
    console.log(`✅ Seeded ${createdAptitudeQuestions.length} Aptitude Questions`);

    // 4. Seed 50 Coding Problems & Test Cases
    const codingProblemsData = generateCodingProblems();
    const createdCodingQuestions = await CodingQuestion.insertMany(codingProblemsData);
    console.log(`✅ Seeded ${createdCodingQuestions.length} Coding Problems`);

    // Create test cases for each coding question
    const testCasesToInsert = [];
    for (const q of createdCodingQuestions) {
      testCasesToInsert.push(
        {
          questionId: q._id,
          input: 'nums = [2,7,11,15], target = 9',
          expectedOutput: '[0,1]',
          isHidden: false,
          points: 10,
          explanation: 'Sample case 1'
        },
        {
          questionId: q._id,
          input: 'nums = [3,2,4], target = 6',
          expectedOutput: '[1,2]',
          isHidden: false,
          points: 10,
          explanation: 'Sample case 2'
        },
        {
          questionId: q._id,
          input: 'nums = [3,3], target = 6',
          expectedOutput: '[0,1]',
          isHidden: true,
          points: 20,
          explanation: 'Hidden test case'
        }
      );
    }
    await CodingTestCase.insertMany(testCasesToInsert);
    console.log(`✅ Seeded ${testCasesToInsert.length} Coding Test Cases (${testCasesToInsert.length / 3} questions × 3 cases)`);

    // 5. Seed 20 Mock Tests
    const aptIds = createdAptitudeQuestions.map(q => q._id);
    const codeIds = createdCodingQuestions.map(q => q._id);
    const mockTestsData = generateMockTests(aptIds, codeIds);
    const createdMockTests = await MockTest.insertMany(mockTestsData);
    console.log(`✅ Seeded ${createdMockTests.length} Mock Tests`);

    // 6. Seed Badges
    const badgesData = [
      { key: 'streak_3', name: 'Streak Starter', description: 'Maintain a 3-day daily streak', icon: 'fas fa-fire', color: '#f97316' },
      { key: 'streak_7', name: 'Streak Master', description: 'Maintain a 7-day daily streak', icon: 'fas fa-fire-alt', color: '#ef4444' },
      { key: 'first_solve', name: 'First Step', description: 'Solve your first problem', icon: 'fas fa-check-circle', color: '#10b981' },
      { key: 'quant_10', name: 'Quant King', description: 'Solve 10 quantitative aptitude questions', icon: 'fas fa-calculator', color: '#3b82f6' },
      { key: 'code_wizard', name: 'Code Wizard', description: 'Solve 10 coding challenges', icon: 'fas fa-laptop-code', color: '#8b5cf6' },
      { key: 'mock_champ', name: 'Mock Champ', description: 'Complete a full placement mock test', icon: 'fas fa-trophy', color: '#f59e0b' }
    ];
    await Badge.insertMany(badgesData);
    console.log(`✅ Seeded ${badgesData.length} Badges`);

    // 7. Seed Achievements
    const achievementsData = [
      { key: 'welcome', title: 'Welcome to Scholastic', description: 'Visited the Scholastic platform for the first time', xpReward: 50, category: 'general' },
      { key: 'speed_solver', title: 'Fast Thinker', description: 'Solved an aptitude question in under 30 seconds', xpReward: 100, category: 'aptitude' },
      { key: 'bug_free', title: 'Bug Free Code', description: 'Accepted submission on first try', xpReward: 150, category: 'coding' },
      { key: 'contest_fighter', title: 'Contest Fighter', description: 'Participated in a Scholastic coding contest', xpReward: 200, category: 'contest' }
    ];
    await Achievement.insertMany(achievementsData);
    console.log(`✅ Seeded ${achievementsData.length} Achievements`);

    // 8. Seed today's Daily Challenge
    const todayStr = new Date().toISOString().split('T')[0];
    await DailyChallenge.create({
      date: todayStr,
      title: 'Daily Two Sum & Quant Combo',
      description: 'Solve today\'s coding challenge Two Sum to keep your streak burning!',
      questionType: 'coding',
      questionId: createdCodingQuestions[0]._id,
      xpReward: 100,
      coinReward: 50
    });
    console.log(`✅ Seeded Daily Challenge for ${todayStr}`);

    console.log('--- Successfully Seeded Entire Scholastic Database! ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
