const CODING_CATEGORIES = [
  'Arrays', 'Strings', 'Linked List', 'Stack', 'Queue', 'Tree', 'BST', 'Heap',
  'Graph', 'Trie', 'HashMap', 'Sliding Window', 'Greedy', 'Backtracking', 'DP',
  'Bit Manipulation', 'Math', 'Sorting', 'Searching', 'Binary Search', 'Recursion', 'Graphs'
];

const CODING_TOPIC_MATCHES = {
  'Arrays & Hashing': ['Arrays', 'Array', 'Hashing', 'HashMap', 'Hash Map'],
  'Two Pointers': ['Two Pointers', 'Two-Pointer'],
  'Dynamic Programming': ['DP', 'Dynamic Programming'],
  Graphs: ['Graph', 'Graphs', 'BFS', 'DFS'],
  Trees: ['Tree', 'Trees', 'BST', 'Binary Tree']
};
const CODING_TOPICS = Object.keys(CODING_TOPIC_MATCHES);

const LANGUAGES = [
  { id: 'c', name: 'C', piston: 'c', monaco: 'c' },
  { id: 'cpp', name: 'C++', piston: 'c++', monaco: 'cpp' },
  { id: 'java', name: 'Java', piston: 'java', monaco: 'java' },
  { id: 'python', name: 'Python', piston: 'python', monaco: 'python' },
  { id: 'javascript', name: 'JavaScript', piston: 'javascript', monaco: 'javascript' },
  { id: 'go', name: 'Go', piston: 'go', monaco: 'go' },
  { id: 'rust', name: 'Rust', piston: 'rust', monaco: 'rust' },
  { id: 'kotlin', name: 'Kotlin', piston: 'kotlin', monaco: 'kotlin' },
  { id: 'sql', name: 'SQL', piston: 'sqlite3', monaco: 'sql' }
];

const VERDICTS = [
  'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded',
  'Compilation Error', 'Runtime Error', 'Presentation Error'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const COMPANY_TAGS = [
  'Amazon', 'Google', 'Microsoft', 'Infosys', 'TCS', 'Accenture', 'Cognizant',
  'Capgemini', 'Wipro', 'Deloitte', 'Goldman Sachs', 'JP Morgan', 'Adobe', 'Oracle', 'SAP'
];

const LANGUAGE_TEMPLATES = {
  javascript: `function solve(nums, target) {\n  return [];\n}`,
  python: `def solve(nums, target):\n    return []`,
  java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}`,
  cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};`,
  c: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}`,
  go: `func twoSum(nums []int, target int) []int {\n    \n}`,
  rust: `impl Solution {\n    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {\n        \n    }\n}`,
  kotlin: `class Solution {\n    fun twoSum(nums: IntArray, target: Int): IntArray {\n        \n    }\n}`,
  sql: `-- Write your SQL query below\n`
};

module.exports = {
  CODING_CATEGORIES,
  CODING_TOPICS,
  CODING_TOPIC_MATCHES,
  LANGUAGES,
  VERDICTS,
  DIFFICULTIES,
  COMPANY_TAGS,
  LANGUAGE_TEMPLATES
};
