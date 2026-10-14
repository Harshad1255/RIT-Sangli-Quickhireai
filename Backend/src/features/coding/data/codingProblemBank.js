// Comprehensive, curated coding problem bank for QuickHire AI
// Provides diverse, verified algorithmic problems across all DSA topics and difficulties.

const CODING_PROBLEM_BANK = [
  // ==================== STRINGS ====================
  {
    title: 'Valid Palindrome',
    category: 'Strings',
    difficulty: 'Easy',
    tags: ['Strings', 'Two Pointers'],
    statementMarkdown: `## Problem\nA phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.\n\n### Example 1\n**Input:** \`"A man, a plan, a canal: Panama"\`\n**Output:** \`true\`\n**Explanation:** "amanaplanacanalpanama" is a palindrome.\n\n### Example 2\n**Input:** \`"race a car"\`\n**Output:** \`false\`\n**Explanation:** "raceacar" is not a palindrome.\n\n### Example 3\n**Input:** \`" "\`\n**Output:** \`true\`\n**Explanation:** \`s\` is an empty string \`""\` after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome.\n\n### Constraints\n- \`1 <= s.length <= 2 * 10^5\`\n- \`s\` consists only of printable ASCII characters.`,
    constraints: '- 1 <= s.length <= 2 * 10^5\n- s consists only of printable ASCII characters',
    sampleTestCases: [
      { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true', explanation: 'Cleaned string is "amanaplanacanalpanama" which is a palindrome.' },
      { input: 'race a car', expectedOutput: 'false', explanation: 'Cleaned string is "raceacar" which is not a palindrome.' }
    ],
    hiddenTestCases: [
      { input: ' ', expectedOutput: 'true' },
      { input: '0P', expectedOutput: 'false' },
      { input: 'ab_a', expectedOutput: 'true' },
      { input: 'Madam, I\'m Adam', expectedOutput: 'true' },
      { input: 'No lemon, no melon', expectedOutput: 'true' }
    ],
    starterCode: {
      javascript: `function solve(s) {\n  // Return true if s is a palindrome, false otherwise\n  return false;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str) -> bool:\n    # Write your solution here\n    return False`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public boolean solve(String s) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    bool solve(string s) {\n        // Write your solution here\n        return false;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s) {\n  const clean = String(s).toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}`
    }
  },
  {
    title: 'Valid Anagram',
    category: 'Strings',
    difficulty: 'Easy',
    tags: ['Strings', 'Hash Map', 'Sorting'],
    statementMarkdown: `## Problem\nGiven two strings \`s\` and \`t\`, return \`true\` if \`t\` is an **anagram** of \`s\`, and \`false\` otherwise.\n\nAn **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n### Example 1\n**Input:** \`s = "anagram", t = "nagaram"\`\n**Output:** \`true\`\n\n### Example 2\n**Input:** \`s = "rat", t = "car"\`\n**Output:** \`false\`\n\n### Constraints\n- \`1 <= s.length, t.length <= 5 * 10^4\`\n- \`s\` and \`t\` consist of lowercase English letters.`,
    constraints: '- 1 <= s.length, t.length <= 5 * 10^4\n- s and t consist of lowercase English letters',
    sampleTestCases: [
      { input: 'anagram, nagaram', expectedOutput: 'true', explanation: 'Both strings have identical letter counts.' },
      { input: 'rat, car', expectedOutput: 'false', explanation: 'Letter counts do not match.' }
    ],
    hiddenTestCases: [
      { input: 'a, a', expectedOutput: 'true' },
      { input: 'ab, a', expectedOutput: 'false' },
      { input: 'listen, silent', expectedOutput: 'true' },
      { input: 'hello, world', expectedOutput: 'false' },
      { input: 'dormitory, dirtyroom', expectedOutput: 'true' }
    ],
    starterCode: {
      javascript: `function solve(s, t) {\n  // Return true if t is an anagram of s\n  return false;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str, t: str) -> bool:\n    # Write your solution here\n    return False`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public boolean solve(String s, String t) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    bool solve(string s, string t) {\n        // Write your solution here\n        return false;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s, t) {\n  if (s.length !== t.length) return false;\n  const sortedS = s.split('').sort().join('');\n  const sortedT = t.split('').sort().join('');\n  return sortedS === sortedT;\n}`
    }
  },
  {
    title: 'Reverse Vowels of a String',
    category: 'Strings',
    difficulty: 'Easy',
    tags: ['Strings', 'Two Pointers'],
    statementMarkdown: `## Problem\nGiven a string \`s\`, reverse only all the vowels in the string and return it.\n\nThe vowels are \`'a'\`, \`'e'\`, \`'i'\`, \`'o'\`, and \`'u'\`, and they can appear in both lower and upper cases, more than once.\n\n### Example 1\n**Input:** \`s = "IceCreAm"\`\n**Output:** \`"AceCreIm"\`\n**Explanation:** The vowels in \`s\` are \`['I', 'e', 'e', 'A']\`. Reversing them gives \`['A', 'e', 'e', 'I']\`.\n\n### Example 2\n**Input:** \`s = "leetcode"\`\n**Output:** \`"leotcede"\`\n\n### Constraints\n- \`1 <= s.length <= 3 * 10^5\`\n- \`s\` consist of printable ASCII characters.`,
    constraints: '- 1 <= s.length <= 3 * 10^5\n- s consists of printable ASCII characters',
    sampleTestCases: [
      { input: 'IceCreAm', expectedOutput: 'AceCreIm', explanation: 'Vowels I, e, e, A reversed to A, e, e, I.' },
      { input: 'leetcode', expectedOutput: 'leotcede', explanation: 'Vowels e, e, o, e reversed to e, o, e, e.' }
    ],
    hiddenTestCases: [
      { input: 'hello', expectedOutput: 'holle' },
      { input: 'aA', expectedOutput: 'Aa' },
      { input: 'xyz', expectedOutput: 'xyz' },
      { input: 'aeiou', expectedOutput: 'uoiea' }
    ],
    starterCode: {
      javascript: `function solve(s) {\n  // Return the string with reversed vowels\n  return "";\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str) -> str:\n    # Write your solution here\n    return ""`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public String solve(String s) {\n        // Write your solution here\n        return "";\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    string solve(string s) {\n        // Write your solution here\n        return "";\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s) {\n  const vowels = new Set(['a','e','i','o','u','A','E','I','O','U']);\n  const arr = s.split('');\n  let i = 0, j = arr.length - 1;\n  while (i < j) {\n    while (i < j && !vowels.has(arr[i])) i++;\n    while (i < j && !vowels.has(arr[j])) j--;\n    if (i < j) {\n      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;\n      i++; j--;\n    }\n  }\n  return arr.join('');\n}`
    }
  },
  {
    title: 'Length of Last Word',
    category: 'Strings',
    difficulty: 'Easy',
    tags: ['Strings'],
    statementMarkdown: `## Problem\nGiven a string \`s\` consisting of words and spaces, return the length of the **last** word in the string.\n\nA **word** is a maximal substring consisting of non-space characters only.\n\n### Example 1\n**Input:** \`s = "Hello World"\`\n**Output:** \`5\`\n**Explanation:** The last word is "World" with length 5.\n\n### Example 2\n**Input:** \`s = "   fly me   to   the moon  "\`\n**Output:** \`4\`\n**Explanation:** The last word is "moon" with length 4.\n\n### Constraints\n- \`1 <= s.length <= 10^4\`\n- \`s\` consists of English letters and spaces \`' '\`.\n- There will be at least one word in \`s\`.`,
    constraints: '- 1 <= s.length <= 10^4\n- s consists of English letters and spaces\n- At least one word in s',
    sampleTestCases: [
      { input: 'Hello World', expectedOutput: '5', explanation: 'Last word is "World" length 5.' },
      { input: '   fly me   to   the moon  ', expectedOutput: '4', explanation: 'Last word is "moon" length 4.' }
    ],
    hiddenTestCases: [
      { input: 'luffy is still joyboy', expectedOutput: '6' },
      { input: 'a', expectedOutput: '1' },
      { input: 'day ', expectedOutput: '3' },
      { input: '  quick  hire   ai  ', expectedOutput: '2' }
    ],
    starterCode: {
      javascript: `function solve(s) {\n  // Return length of last word\n  return 0;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str) -> int:\n    # Write your solution here\n    return 0`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int solve(String s) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(string s) {\n        // Write your solution here\n        return 0;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s) {\n  const words = s.trim().split(/\\s+/);\n  return words[words.length - 1].length;\n}`
    }
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    category: 'Strings',
    difficulty: 'Medium',
    tags: ['Strings', 'Sliding Window', 'Hash Map'],
    statementMarkdown: `## Problem\nGiven a string \`s\`, find the length of the **longest substring** without duplicate characters.\n\n### Example 1\n**Input:** \`s = "abcabcbb"\`\n**Output:** \`3\`\n**Explanation:** The answer is "abc", with the length of 3.\n\n### Example 2\n**Input:** \`s = "bbbbb"\`\n**Output:** \`1\`\n**Explanation:** The answer is "b", with the length of 1.\n\n### Example 3\n**Input:** \`s = "pwwkew"\`\n**Output:** \`3\`\n**Explanation:** The answer is "wke", with the length of 3.\n\n### Constraints\n- \`0 <= s.length <= 5 * 10^4\`\n- \`s\` consists of English letters, digits, symbols and spaces.`,
    constraints: '- 0 <= s.length <= 5 * 10^4\n- s consists of English letters, digits, symbols and spaces',
    sampleTestCases: [
      { input: 'abcabcbb', expectedOutput: '3', explanation: 'The answer is "abc", length 3.' },
      { input: 'bbbbb', expectedOutput: '1', explanation: 'The answer is "b", length 1.' }
    ],
    hiddenTestCases: [
      { input: 'pwwkew', expectedOutput: '3' },
      { input: '', expectedOutput: '0' },
      { input: 'dvdf', expectedOutput: '3' },
      { input: 'abcdef', expectedOutput: '6' }
    ],
    starterCode: {
      javascript: `function solve(s) {\n  // Return length of longest substring without duplicates\n  return 0;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str) -> int:\n    # Write your solution here\n    return 0`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int solve(String s) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(string s) {\n        // Write your solution here\n        return 0;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s) {\n  let maxLen = 0, start = 0;\n  const map = new Map();\n  for (let i = 0; i < s.length; i++) {\n    if (map.has(s[i]) && map.get(s[i]) >= start) {\n      start = map.get(s[i]) + 1;\n    }\n    map.set(s[i], i);\n    maxLen = Math.max(maxLen, i - start + 1);\n  }\n  return maxLen;\n}`
    }
  },
  {
    title: 'String Compression',
    category: 'Strings',
    difficulty: 'Medium',
    tags: ['Strings', 'Two Pointers'],
    statementMarkdown: `## Problem\nGiven a string \`s\`, perform basic string compression using the counts of repeated characters.\n\nFor example, the string \`"aabcccccaaa"\` would become \`"a2b1c5a3"\`.\n\nIf the compressed string would not become smaller than the original string, your method should return the original string.\n\n### Example 1\n**Input:** \`s = "aabcccccaaa"\`\n**Output:** \`"a2b1c5a3"\`\n\n### Example 2\n**Input:** \`s = "abcdef"\`\n**Output:** \`"abcdef"\`\n**Explanation:** Compressed string "a1b1c1d1e1f1" is longer than "abcdef", so return the original string.\n\n### Constraints\n- \`1 <= s.length <= 10^5\`\n- \`s\` consists of uppercase and lowercase English letters.`,
    constraints: '- 1 <= s.length <= 10^5\n- s consists of English letters',
    sampleTestCases: [
      { input: 'aabcccccaaa', expectedOutput: 'a2b1c5a3', explanation: 'Compressed format is shorter than original.' },
      { input: 'abcdef', expectedOutput: 'abcdef', explanation: 'Compressed format is longer, so original is kept.' }
    ],
    hiddenTestCases: [
      { input: 'aaaa', expectedOutput: 'a4' },
      { input: 'aabb', expectedOutput: 'aabb' },
      { input: 'a', expectedOutput: 'a' },
      { input: 'zzzzzzzzzz', expectedOutput: 'z10' }
    ],
    starterCode: {
      javascript: `function solve(s) {\n  // Return compressed string if shorter, otherwise original\n  return "";\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str) -> str:\n    # Write your solution here\n    return ""`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public String solve(String s) {\n        // Write your solution here\n        return "";\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    string solve(string s) {\n        // Write your solution here\n        return "";\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s) {\n  if (!s) return "";\n  let compressed = "";\n  let count = 1;\n  for (let i = 0; i < s.length; i++) {\n    if (s[i] === s[i + 1]) {\n      count++;\n    } else {\n      compressed += s[i] + count;\n      count = 1;\n    }\n  }\n  return compressed.length < s.length ? compressed : s;\n}`
    }
  },

  // ==================== ARRAYS & HASHING ====================
  {
    title: 'Two Sum',
    category: 'Arrays & Hashing',
    difficulty: 'Easy',
    tags: ['Arrays', 'Hash Map'],
    statementMarkdown: `## Problem\nGiven an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order (as a JSON array, e.g. \`[0, 1]\`).\n\n### Example 1\n**Input:** \`nums = [2, 7, 11, 15], target = 9\`\n**Output:** \`[0, 1]\`\n**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].\n\n### Example 2\n**Input:** \`nums = [3, 2, 4], target = 6\`\n**Output:** \`[1, 2]\`\n\n### Constraints\n- \`2 <= nums.length <= 10^4\`\n- \`-10^9 <= nums[i] <= 10^9\`\n- \`-10^9 <= target <= 10^9\`\n- **Only one valid answer exists.**`,
    constraints: '- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- Exactly one valid answer exists',
    sampleTestCases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]', explanation: '2 + 7 = 9 at indices 0 and 1.' },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]', explanation: '2 + 4 = 6 at indices 1 and 2.' }
    ],
    hiddenTestCases: [
      { input: '[3, 3], 6', expectedOutput: '[0, 1]' },
      { input: '[-1, -2, -3, -4, -5], -8', expectedOutput: '[2, 4]' },
      { input: '[0, 4, 3, 0], 0', expectedOutput: '[0, 3]' },
      { input: '[1, 5, 8, 3], 11', expectedOutput: '[1, 2]' }
    ],
    starterCode: {
      javascript: `function solve(nums, target) {\n  // Return indices of the two numbers adding up to target\n  return [];\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(nums, target):\n    # Write your solution here\n    return []`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}`
    }
  },
  {
    title: 'Contains Duplicate',
    category: 'Arrays & Hashing',
    difficulty: 'Easy',
    tags: ['Arrays', 'Hash Map'],
    statementMarkdown: `## Problem\nGiven an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.\n\n### Example 1\n**Input:** \`nums = [1, 2, 3, 1]\`\n**Output:** \`true\`\n\n### Example 2\n**Input:** \`nums = [1, 2, 3, 4]\`\n**Output:** \`false\`\n\n### Constraints\n- \`1 <= nums.length <= 10^5\`\n- \`-10^9 <= nums[i] <= 10^9\``,
    constraints: '- 1 <= nums.length <= 10^5\n- -10^9 <= nums[i] <= 10^9',
    sampleTestCases: [
      { input: '[1, 2, 3, 1]', expectedOutput: 'true', explanation: '1 appears multiple times.' },
      { input: '[1, 2, 3, 4]', expectedOutput: 'false', explanation: 'All elements are unique.' }
    ],
    hiddenTestCases: [
      { input: '[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', expectedOutput: 'true' },
      { input: '[99]', expectedOutput: 'false' },
      { input: '[-5, -5]', expectedOutput: 'true' },
      { input: '[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]', expectedOutput: 'false' }
    ],
    starterCode: {
      javascript: `function solve(nums) {\n  // Return true if any value appears at least twice\n  return false;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(nums):\n    # Write your solution here\n    return False`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public boolean solve(int[] nums) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    bool solve(vector<int>& nums) {\n        // Write your solution here\n        return false;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(nums) {\n  return new Set(nums).size !== nums.length;\n}`
    }
  },
  {
    title: 'Maximum Subarray',
    category: 'Arrays & Hashing',
    difficulty: 'Medium',
    tags: ['Arrays', 'Dynamic Programming', 'Divide and Conquer'],
    statementMarkdown: `## Problem\nGiven an integer array \`nums\`, find the subarray with the largest sum, and return its sum.\n\nA **subarray** is a contiguous non-empty sequence of elements within an array.\n\n### Example 1\n**Input:** \`nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\`\n**Output:** \`6\`\n**Explanation:** The subarray [4, -1, 2, 1] has the largest sum 6.\n\n### Example 2\n**Input:** \`nums = [1]\`\n**Output:** \`1\`\n\n### Example 3\n**Input:** \`nums = [5, 4, -1, 7, 8]\`\n**Output:** \`23\`\n\n### Constraints\n- \`1 <= nums.length <= 10^5\`\n- \`-10^4 <= nums[i] <= 10^4\``,
    constraints: '- 1 <= nums.length <= 10^5\n- -10^4 <= nums[i] <= 10^4',
    sampleTestCases: [
      { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6', explanation: 'Subarray [4, -1, 2, 1] sums to 6.' },
      { input: '[1]', expectedOutput: '1', explanation: 'Single element is the max sum.' }
    ],
    hiddenTestCases: [
      { input: '[5, 4, -1, 7, 8]', expectedOutput: '23' },
      { input: '[-1, -2, -3]', expectedOutput: '-1' },
      { input: '[-2, -1]', expectedOutput: '-1' },
      { input: '[2, 3, -2, 4]', expectedOutput: '7' }
    ],
    starterCode: {
      javascript: `function solve(nums) {\n  // Return max contiguous subarray sum\n  return 0;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(nums):\n    # Write your solution here\n    return 0`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int solve(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(nums) {\n  let maxSoFar = nums[0];\n  let currMax = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    currMax = Math.max(nums[i], currMax + nums[i]);\n    maxSoFar = Math.max(maxSoFar, currMax);\n  }\n  return maxSoFar;\n}`
    }
  },

  // ==================== STACKS & QUEUES ====================
  {
    title: 'Valid Parentheses',
    category: 'Stack',
    difficulty: 'Easy',
    tags: ['Stack', 'Strings'],
    statementMarkdown: `## Problem\nGiven a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n### Example 1\n**Input:** \`s = "()"\`\n**Output:** \`true\`\n\n### Example 2\n**Input:** \`s = "()[]{}"\`\n**Output:** \`true\`\n\n### Example 3\n**Input:** \`s = "(]"\`\n**Output:** \`false\`\n\n### Constraints\n- \`1 <= s.length <= 10^4\`\n- \`s\` consists of parentheses only \`'()[]{}'\`.`,
    constraints: '- 1 <= s.length <= 10^4\n- s consists of parentheses only',
    sampleTestCases: [
      { input: '()', expectedOutput: 'true', explanation: 'Matching round brackets.' },
      { input: '()[]{}', expectedOutput: 'true', explanation: 'All pairs properly closed in order.' }
    ],
    hiddenTestCases: [
      { input: '(]', expectedOutput: 'false' },
      { input: '([)]', expectedOutput: 'false' },
      { input: '{[]}', expectedOutput: 'true' },
      { input: '(((', expectedOutput: 'false' },
      { input: ']', expectedOutput: 'false' }
    ],
    starterCode: {
      javascript: `function solve(s) {\n  // Return true if parentheses match properly\n  return false;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(s: str) -> bool:\n    # Write your solution here\n    return False`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public boolean solve(String s) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    bool solve(string s) {\n        // Write your solution here\n        return false;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let ch of s) {\n    if (ch === '(' || ch === '{' || ch === '[') {\n      stack.push(ch);\n    } else {\n      if (!stack.length || stack.pop() !== map[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}`
    }
  },

  // ==================== DYNAMIC PROGRAMMING ====================
  {
    title: 'Climbing Stairs',
    category: 'Dynamic Programming',
    difficulty: 'Easy',
    tags: ['Dynamic Programming', 'Math', 'Memoization'],
    statementMarkdown: `## Problem\nYou are climbing a staircase. It takes \`n\` steps to reach the top.\n\nEach time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?\n\n### Example 1\n**Input:** \`n = 2\`\n**Output:** \`2\`\n**Explanation:** There are two ways to climb to the top.\n1. 1 step + 1 step\n2. 2 steps\n\n### Example 2\n**Input:** \`n = 3\`\n**Output:** \`3\`\n**Explanation:** There are three ways to climb to the top.\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step\n\n### Constraints\n- \`1 <= n <= 45\``,
    constraints: '- 1 <= n <= 45',
    sampleTestCases: [
      { input: '2', expectedOutput: '2', explanation: '1+1 or 2' },
      { input: '3', expectedOutput: '3', explanation: '1+1+1, 1+2, or 2+1' }
    ],
    hiddenTestCases: [
      { input: '1', expectedOutput: '1' },
      { input: '4', expectedOutput: '5' },
      { input: '5', expectedOutput: '8' },
      { input: '10', expectedOutput: '89' },
      { input: '20', expectedOutput: '10946' }
    ],
    starterCode: {
      javascript: `function solve(n) {\n  // Return number of ways to climb n stairs\n  return 0;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(n: int) -> int:\n    # Write your solution here\n    return 0`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int solve(int n) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(int n) {\n        // Write your solution here\n        return 0;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(n) {\n  n = Number(n);\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    const next = a + b;\n    a = b;\n    b = next;\n  }\n  return b;\n}`
    }
  },

  // ==================== BINARY SEARCH ====================
  {
    title: 'Binary Search',
    category: 'Binary Search',
    difficulty: 'Easy',
    tags: ['Binary Search', 'Arrays'],
    statementMarkdown: `## Problem\nGiven an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.\n\nYou must write an algorithm with $O(\\log n)$ runtime complexity.\n\n### Example 1\n**Input:** \`nums = [-1, 0, 3, 5, 9, 12], target = 9\`\n**Output:** \`4\`\n**Explanation:** 9 exists in nums and its index is 4\n\n### Example 2\n**Input:** \`nums = [-1, 0, 3, 5, 9, 12], target = 2\`\n**Output:** \`-1\`\n**Explanation:** 2 does not exist in nums so return -1\n\n### Constraints\n- \`1 <= nums.length <= 10^4\`\n- \`-10^4 < nums[i], target < 10^4\`\n- All the integers in \`nums\` are **unique**.\n- \`nums\` is sorted in ascending order.`,
    constraints: '- 1 <= nums.length <= 10^4\n- All integers in nums are unique\n- nums is sorted in ascending order',
    sampleTestCases: [
      { input: '[-1, 0, 3, 5, 9, 12], 9', expectedOutput: '4', explanation: 'Target 9 is at index 4.' },
      { input: '[-1, 0, 3, 5, 9, 12], 2', expectedOutput: '-1', explanation: 'Target 2 does not exist in nums.' }
    ],
    hiddenTestCases: [
      { input: '[5], 5', expectedOutput: '0' },
      { input: '[5], -5', expectedOutput: '-1' },
      { input: '[1, 2, 3, 4, 5, 6, 7], 1', expectedOutput: '0' },
      { input: '[1, 2, 3, 4, 5, 6, 7], 7', expectedOutput: '6' }
    ],
    starterCode: {
      javascript: `function solve(nums, target) {\n  // Return index of target in sorted nums, or -1\n  return -1;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(nums, target):\n    # Write your solution here\n    return -1`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int solve(int[] nums, int target) {\n        // Write your solution here\n        return -1;\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums, int target) {\n        // Write your solution here\n        return -1;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`
    }
  },

  // ==================== MATH & BIT MANIPULATION ====================
  {
    title: 'Single Number',
    category: 'Math',
    difficulty: 'Easy',
    tags: ['Bit Manipulation', 'Arrays'],
    statementMarkdown: `## Problem\nGiven a non-empty array of integers \`nums\`, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.\n\n### Example 1\n**Input:** \`nums = [2, 2, 1]\`\n**Output:** \`1\`\n\n### Example 2\n**Input:** \`nums = [4, 1, 2, 1, 2]\`\n**Output:** \`4\`\n\n### Example 3\n**Input:** \`nums = [1]\`\n**Output:** \`1\`\n\n### Constraints\n- \`1 <= nums.length <= 3 * 10^4\`\n- \`-3 * 10^4 <= nums[i] <= 3 * 10^4\`\n- Each element in the array appears twice except for one element which appears only once.`,
    constraints: '- 1 <= nums.length <= 3 * 10^4\n- Each element appears twice except one',
    sampleTestCases: [
      { input: '[2, 2, 1]', expectedOutput: '1', explanation: '1 is the only unique number.' },
      { input: '[4, 1, 2, 1, 2]', expectedOutput: '4', explanation: '4 is the only unique number.' }
    ],
    hiddenTestCases: [
      { input: '[1]', expectedOutput: '1' },
      { input: '[-1, -1, -2]', expectedOutput: '-2' },
      { input: '[0, 1, 0]', expectedOutput: '1' },
      { input: '[100, 200, 300, 200, 100]', expectedOutput: '300' }
    ],
    starterCode: {
      javascript: `function solve(nums) {\n  // Find and return the single number\n  return 0;\n}`,
      python: `# Complete the 'solve' function below.\ndef solve(nums):\n    # Write your solution here\n    return 0`,
      java: `import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int solve(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};`
    },
    referenceSolution: {
      javascript: `function solve(nums) {\n  return nums.reduce((acc, curr) => acc ^ curr, 0);\n}`
    }
  }
];

/**
 * Maps arbitrary user topic string to a standard category
 */
function normalizeCategory(topic) {
  if (!topic || typeof topic !== 'string') return 'Strings';
  const t = topic.toLowerCase().trim();

  if (t.includes('str') || t.includes('char') || t.includes('text') || t.includes('word') || t.includes('palindrom') || t.includes('anagram')) {
    return 'Strings';
  }
  if (t.includes('arr') || t.includes('matrix') || t.includes('vector') || t.includes('hash') || t.includes('subarr')) {
    return 'Arrays & Hashing';
  }
  if (t.includes('stack') || t.includes('queue')) {
    return 'Stack';
  }
  if (t.includes('dp') || t.includes('dynam') || t.includes('memo') || t.includes('climb')) {
    return 'Dynamic Programming';
  }
  if (t.includes('search') || t.includes('binary')) {
    return 'Binary Search';
  }
  if (t.includes('bit') || t.includes('math') || t.includes('num')) {
    return 'Math';
  }
  if (t.includes('point') || t.includes('slid') || t.includes('window')) {
    return 'Strings';
  }
  return 'Strings';
}

/**
 * Retrieve a high-quality fallback coding problem based on topic and difficulty,
 * ensuring non-repeating selections.
 */
function getFallbackCodingProblem(topic = 'Strings', difficulty = 'Easy', languages = [], excludeTitles = []) {
  const targetCategory = normalizeCategory(topic);
  const preferredLanguages = Array.isArray(languages) && languages.length ? languages : ['javascript', 'python', 'java', 'cpp'];
  const excludedSet = new Set((excludeTitles || []).map(t => String(t).toLowerCase().trim()));

  // 1. Try matching both category and difficulty
  let candidates = CODING_PROBLEM_BANK.filter(p => 
    p.category === targetCategory && 
    p.difficulty.toLowerCase() === String(difficulty).toLowerCase() &&
    !excludedSet.has(p.title.toLowerCase())
  );

  // 2. Fallback: match category only
  if (candidates.length === 0) {
    candidates = CODING_PROBLEM_BANK.filter(p => 
      p.category === targetCategory &&
      !excludedSet.has(p.title.toLowerCase())
    );
  }

  // 3. Fallback: match any unselected problem in the bank
  if (candidates.length === 0) {
    candidates = CODING_PROBLEM_BANK.filter(p => !excludedSet.has(p.title.toLowerCase()));
  }

  // 4. Last resort: any problem in the bank
  if (candidates.length === 0) {
    candidates = CODING_PROBLEM_BANK.filter(p => p.category === targetCategory);
    if (candidates.length === 0) candidates = CODING_PROBLEM_BANK;
  }

  // Random selection
  const selected = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    title: selected.title,
    difficulty: selected.difficulty,
    category: selected.category,
    tags: selected.tags,
    statementMarkdown: selected.statementMarkdown,
    constraints: selected.constraints,
    sampleTestCases: selected.sampleTestCases,
    hiddenTestCases: selected.hiddenTestCases,
    starterCode: selected.starterCode,
    referenceSolution: selected.referenceSolution,
    _validationWarning: null,
    _fallback: true,
    languages: preferredLanguages
  };
}

module.exports = {
  CODING_PROBLEM_BANK,
  normalizeCategory,
  getFallbackCodingProblem
};
