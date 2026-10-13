/**
 * QuickHire AI - Deterministic Fallback & Rubric Evaluation Engine
 * 
 * Provides fair, lenient, partial-credit evaluation when AI (Gemini) is unavailable,
 * rate-limited, timed out, or returns malformed responses.
 * Also defines evaluation standards and concept banks for technical interviews.
 */

// Domain concept bank mapping keywords and key concepts per skill
const DOMAIN_KNOWLEDGE = {
  'javascript': {
    coreConcepts: [
      'closure', 'lexical scope', 'scope', 'event loop', 'call stack', 'callback queue',
      'microtask', 'macrotask', 'promise', 'async', 'await', 'hoisting', 'var', 'let',
      'const', 'temporal dead zone', 'prototype', 'inheritance', 'this', 'binding',
      'arrow function', 'garbage collection', 'memory leak', 'dom', 'virtual dom',
      'equality', 'coercion', 'event bubbling', 'event delegation', 'currying',
      'destructuring', 'spread', 'rest', 'module', 'commonjs', 'es6', 'json',
      'map', 'filter', 'reduce', 'single-threaded', 'non-blocking', 'web api'
    ],
    explanationWords: [
      'because', 'means', 'function', 'variable', 'object', 'access', 'returns',
      'retains', 'executes', 'asynchronous', 'synchronous', 'reference', 'value',
      'parent', 'child', 'outer', 'inner', 'context', 'stack', 'queue', 'thread'
    ]
  },
  'python': {
    coreConcepts: [
      'list comprehension', 'generator', 'yield', 'decorator', 'wrapper', 'gil',
      'global interpreter lock', 'multithreading', 'multiprocessing', 'garbage collection',
      'reference counting', 'tuple', 'list', 'dictionary', 'set', 'immutable', 'mutable',
      'duck typing', 'lambda', 'iterator', 'iterable', 'dunder', 'magic method',
      'exception', 'try', 'except', 'finally', 'raise', 'virtualenv', 'pip', 'pep8',
      'cpython', 'profiling', 'cprofile', 'asyncio', 'oop', 'class', 'inheritance'
    ],
    explanationWords: [
      'memory', 'faster', 'expression', 'lazy', 'evaluates', 'returns', 'function',
      'syntax', 'structure', 'element', 'key', 'value', 'type', 'object', 'module'
    ]
  },
  'react': {
    coreConcepts: [
      'virtual dom', 'reconciliation', 'diffing', 'component', 'functional component',
      'class component', 'jsx', 'props', 'state', 'hook', 'usestate', 'useeffect',
      'usememo', 'usecallback', 'useref', 'usereducer', 'context', 'context api',
      'redux', 'lifecycle', 'mounting', 'updating', 'unmounting', 'fragment',
      'higher order component', 'hoc', 'render props', 'custom hook', 'dependency array',
      'fiber', 'controlled component', 'uncontrolled component', 'portal', 'suspense'
    ],
    explanationWords: [
      'renders', 're-renders', 'ui', 'updates', 'tree', 'dom', 'browser', 'event',
      'parent', 'child', 'pass', 'manage', 'lifecycle', 'mount', 'memory', 'performance'
    ]
  },
  'node.js': {
    coreConcepts: [
      'event-driven', 'libuv', 'event loop', 'non-blocking', 'io', 'asynchronous',
      'stream', 'buffer', 'pipe', 'readable', 'writable', 'chunk', 'backpressure',
      'process.nexttick', 'setimmediate', 'cluster', 'worker threads', 'express',
      'middleware', 'req', 'res', 'next', 'npm', 'package.json', 'dependencies',
      'http', 'fs', 'path', 'eventemitter', 'commonjs', 'es modules', 'rest api'
    ],
    explanationWords: [
      'server', 'handles', 'requests', 'concurrency', 'throughput', 'memory',
      'single thread', 'callback', 'network', 'client', 'listen', 'route', 'file'
    ]
  },
  'sql': {
    coreConcepts: [
      'select', 'join', 'inner join', 'left join', 'right join', 'full join', 'outer join',
      'index', 'b-tree', 'clustered', 'non-clustered', 'normalization', '1nf', '2nf', '3nf',
      'bcnf', 'primary key', 'foreign key', 'acid', 'atomicity', 'consistency',
      'isolation', 'durability', 'transaction', 'commit', 'rollback', 'table',
      'group by', 'having', 'aggregate', 'count', 'sum', 'avg', 'where', 'subquery',
      'window function', 'row_number', 'dense_rank', 'partition by', 'injection',
      'prepared statement', 'deadlock', 'view', 'trigger', 'stored procedure'
    ],
    explanationWords: [
      'query', 'rows', 'columns', 'returns', 'matches', 'null', 'database', 'filter',
      'order', 'relational', 'performance', 'scan', 'lookup', 'fast', 'storage'
    ]
  },
  'mongodb': {
    coreConcepts: [
      'nosql', 'document', 'collection', 'json', 'bson', 'embedding', 'referencing',
      'index', 'createindex', 'aggregation', 'pipeline', '$match', '$group', '$project',
      '$lookup', 'sharding', 'shard key', 'replica set', 'replication', 'high availability',
      'transaction', 'acid', 'mongoose', 'schema', '_id', 'objectid', 'upsert'
    ],
    explanationWords: [
      'database', 'query', 'store', 'flexible', 'schema-less', 'scale', 'horizontal',
      'vertical', 'cluster', 'node', 'read', 'write', 'performance'
    ]
  },
  'java': {
    coreConcepts: [
      'oop', 'encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'interface',
      'abstract class', 'jvm', 'jre', 'jdk', 'heap', 'stack', 'garbage collection',
      'multithreading', 'thread', 'runnable', 'synchronized', 'volatile', 'exception',
      'try', 'catch', 'finally', 'throws', 'generics', 'collection', 'arraylist',
      'hashmap', 'spring', 'spring boot', 'dependency injection', 'maven', 'gradle'
    ],
    explanationWords: [
      'object', 'class', 'method', 'override', 'overload', 'access', 'modifier',
      'private', 'public', 'protected', 'memory', 'compile', 'runtime', 'type'
    ]
  },
  'data structures & algorithms': {
    coreConcepts: [
      'array', 'linked list', 'singly', 'doubly', 'stack', 'queue', 'deque',
      'tree', 'binary tree', 'binary search tree', 'bst', 'avl', 'graph', 'dfs',
      'bfs', 'depth first', 'breadth first', 'heap', 'priority queue', 'hash table',
      'hash map', 'collision', 'chaining', 'open addressing', 'time complexity',
      'space complexity', 'big o', 'o(1)', 'o(n)', 'o(log n)', 'o(n log n)', 'o(n^2)',
      'sorting', 'quicksort', 'mergesort', 'binary search', 'dynamic programming',
      'memoization', 'tabulation', 'greedy', 'recursion', 'divide and conquer'
    ],
    explanationWords: [
      'nodes', 'pointers', 'memory', 'contiguous', 'traverse', 'search', 'insert',
      'delete', 'fast', 'slow', 'algorithm', 'efficiency', 'worst case', 'best case'
    ]
  },
  'system design': {
    coreConcepts: [
      'scalability', 'horizontal scaling', 'vertical scaling', 'load balancer',
      'reverse proxy', 'round robin', 'consistent hashing', 'caching', 'redis',
      'memcached', 'cache invalidation', 'cdn', 'database sharding', 'replication',
      'cap theorem', 'consistency', 'availability', 'partition tolerance', 'pacelc',
      'message queue', 'kafka', 'rabbitmq', 'microservices', 'monolith', 'rate limiting',
      'token bucket', 'api gateway', 'websockets', 'heartbeat', 'fault tolerance',
      'disaster recovery', 'high availability', 'latency', 'throughput'
    ],
    explanationWords: [
      'system', 'traffic', 'server', 'requests', 'data', 'architecture', 'service',
      'trade-off', 'performance', 'bottleneck', 'resilient', 'distributed'
    ]
  },
  'typescript': {
    coreConcepts: [
      'type', 'interface', 'type alias', 'generics', 'static typing', 'type safety',
      'compile time', 'union', 'intersection', 'any', 'unknown', 'never', 'void',
      'type guard', 'type narrowing', 'utility types', 'partial', 'pick', 'omit',
      'record', 'tuple', 'enum', 'abstract', 'implements', 'extends', 'keyof', 'typeof',
      'strict mode', 'tsconfig', 'declaration', '.d.ts'
    ],
    explanationWords: [
      'javascript', 'runtime', 'compiler', 'checks', 'errors', 'safe', 'parameters',
      'return', 'structure', 'contract', 'code', 'refactoring'
    ]
  }
};

// Common phonetic / speech-to-text corrections for developer terminology
const STT_NORMALIZATION_MAP = {
  'a sink': 'async',
  'a sync': 'async',
  'ay sink': 'async',
  'ay sync': 'async',
  'jason': 'json',
  'jay son': 'json',
  'read acts': 'redux',
  're acts': 'react',
  'closures': 'closure',
  'promisses': 'promise',
  'sequel': 'sql',
  'my sequel': 'mysql',
  'post grass': 'postgres',
  'mongo db': 'mongodb',
  'call back': 'callback',
  'call stack': 'callstack',
  'web api': 'webapi',
  'event loop': 'eventloop',
  'use effect': 'useeffect',
  'use state': 'usestate',
  'use memo': 'usememo',
  'use callback': 'usecallback'
};

/**
 * Normalizes text, expands speech-to-text slips, cleans punctuation
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.toLowerCase().trim();

  // Replace phonetic / speech-to-text variants
  for (const [misspelled, correct] of Object.entries(STT_NORMALIZATION_MAP)) {
    cleaned = cleaned.replace(new RegExp(`\\b${misspelled}\\b`, 'gi'), correct);
  }

  // Remove excessive whitespace & punctuation
  return cleaned;
}

/**
 * Extract question subject terms, keywords, and domain
 */
function analyzeQuestion(questionInput) {
  let questionText = '';
  let topic = '';
  let expectedKeyPoints = [];
  let category = 'fundamentals';

  if (typeof questionInput === 'object' && questionInput !== null) {
    questionText = questionInput.question || questionInput.text || '';
    topic = questionInput.topic || questionInput.skill || '';
    category = questionInput.category || 'fundamentals';
    if (Array.isArray(questionInput.expectedKeyPoints)) {
      expectedKeyPoints = questionInput.expectedKeyPoints;
    }
  } else if (typeof questionInput === 'string') {
    questionText = questionInput;
  }

  const normalizedQ = normalizeText(questionText);

  // Detect domain from topic or question text
  let detectedDomain = null;
  const lowerTopic = (topic || '').toLowerCase();
  for (const domain of Object.keys(DOMAIN_KNOWLEDGE)) {
    if (lowerTopic.includes(domain) || normalizedQ.includes(domain)) {
      detectedDomain = domain;
      break;
    }
  }

  // Extract significant words from question text (ignoring common stop words)
  const stopWords = new Set([
    'what', 'how', 'why', 'when', 'where', 'which', 'who', 'is', 'are', 'was', 'were',
    'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'explain', 'describe', 'difference', 'between', 'does', 'work', 'provide', 'practical',
    'use', 'case', 'example', 'tell', 'me', 'about', 'your', 'write', 'function'
  ]);

  const questionWords = normalizedQ
    .replace(/[^a-z0-9#+.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return {
    questionText,
    normalizedQ,
    topic: topic || detectedDomain || 'General',
    category,
    detectedDomain,
    expectedKeyPoints,
    questionKeywords: [...new Set(questionWords)]
  };
}

/**
 * Deterministic answer evaluator
 * Accurately scores participant answers with lenient, partial-credit policy
 */
function evaluateAnswer(answerText, questionInput, options = {}) {
  const maxMarks = options.maxMarks || 10;
  const rawAnswer = typeof answerText === 'string' ? answerText.trim() : (options.code || '');
  const rawCode = options.code || '';
  const combinedAnswer = rawCode ? `${rawAnswer}\n${rawCode}`.trim() : rawAnswer;

  const qAnalysis = analyzeQuestion(questionInput);
  const questionId = (typeof questionInput === 'object' && questionInput?.id) 
    ? questionInput.id 
    : `q_${Date.now()}`;

  // Case 1: Empty or skipped answer
  if (!combinedAnswer || combinedAnswer === '' || combinedAnswer.toLowerCase() === 'skipped' || combinedAnswer.toLowerCase().includes('question skipped')) {
    return {
      questionId,
      maxMarks,
      awardedMarks: 0,
      score: 0,
      attempted: false,
      relevanceScore: 0,
      technicalKnowledge: 0,
      codingAbility: 0,
      communicationSkills: 0,
      problemSolving: 0,
      feedback: 'Question was skipped or no answer was provided.',
      strengths: [],
      improvements: ['Attempt all interview questions, even with partial explanations or basic concepts.'],
      evaluationSource: 'fallback'
    };
  }

  const normalizedAns = normalizeText(combinedAnswer);
  const answerWords = normalizedAns.replace(/[^a-z0-9#+.]/g, ' ').split(/\s+/).filter(Boolean);
  const wordCount = answerWords.length;

  // Case 2: Meaningless noise / single trivial character
  if (wordCount < 2 && !rawCode) {
    return {
      questionId,
      maxMarks,
      awardedMarks: 0.5,
      score: 0.5,
      attempted: true,
      relevanceScore: 1,
      technicalKnowledge: 0.5,
      codingAbility: 0,
      communicationSkills: 1,
      problemSolving: 0.5,
      feedback: 'The response was too brief to demonstrate technical understanding.',
      strengths: ['Participant made an initial attempt.'],
      improvements: ['Provide complete explanations with technical context and definitions.'],
      evaluationSource: 'fallback'
    };
  }

  // --- Concept Matching ---
  const matchedConcepts = new Set();
  const matchedQuestionKeywords = new Set();
  const domainData = qAnalysis.detectedDomain ? DOMAIN_KNOWLEDGE[qAnalysis.detectedDomain] : null;

  // Check question keywords matching
  for (const kw of qAnalysis.questionKeywords) {
    if (normalizedAns.includes(kw)) {
      matchedQuestionKeywords.add(kw);
    }
  }

  // Check domain knowledge concept matching
  if (domainData) {
    for (const concept of domainData.coreConcepts) {
      if (normalizedAns.includes(concept)) {
        matchedConcepts.add(concept);
      }
    }
  } else {
    // Check against all domains if not detected
    for (const d of Object.values(DOMAIN_KNOWLEDGE)) {
      for (const concept of d.coreConcepts) {
        if (normalizedAns.includes(concept)) {
          matchedConcepts.add(concept);
        }
      }
    }
  }

  // Check expected key points from question
  let keyPointMatches = 0;
  if (qAnalysis.expectedKeyPoints && qAnalysis.expectedKeyPoints.length > 0) {
    for (const kp of qAnalysis.expectedKeyPoints) {
      const kpLower = kp.toLowerCase();
      const kpWords = kpLower.split(/\s+/).filter(w => w.length > 3);
      if (kpWords.some(w => normalizedAns.includes(w))) {
        keyPointMatches++;
      }
    }
  }

  // Check explanation indicators (proves reasoned thought, not just keyword dropping)
  const explanationSignals = [
    'because', 'means', 'used to', 'allows', 'works by', 'for example', 'such as',
    'instead of', 'difference is', 'helps in', 'in order to', 'returns', 'executes',
    'stores', 'prevents', 'handles', 'compared to', 'advantage', 'disadvantage'
  ];
  const explanationCount = explanationSignals.filter(sig => normalizedAns.includes(sig)).length;

  // Check code presence
  const hasCode = Boolean(
    rawCode ||
    /function\s+|const\s+|let\s+|var\s+|def\s+|class\s+|SELECT\s+|WHERE\s+|return\s+|=>|import\s+|System\.out/i.test(combinedAnswer)
  );

  // --- Dimension Scoring ---
  // 1. Relevance: Did they talk about the question's target?
  let relevance = 0;
  if (matchedQuestionKeywords.size > 0 || matchedConcepts.size > 0) {
    const qkwRatio = qAnalysis.questionKeywords.length > 0 
      ? matchedQuestionKeywords.size / qAnalysis.questionKeywords.length 
      : 1;
    relevance = Math.min(10, 4 + (qkwRatio * 4) + Math.min(2, matchedConcepts.size));
  } else {
    // Vague or unrelated attempt
    relevance = wordCount > 10 ? 2.5 : 1.0;
  }

  // 2. Technical Knowledge: Technical accuracy, domain concepts
  let techScore = 0;
  const totalConceptCount = matchedConcepts.size;
  if (totalConceptCount >= 4) {
    techScore = Math.min(10, 7.5 + (totalConceptCount - 4) * 0.5);
  } else if (totalConceptCount === 3) {
    techScore = 7.0;
  } else if (totalConceptCount === 2) {
    techScore = 5.5;
  } else if (totalConceptCount === 1) {
    techScore = 4.0;
  } else if (matchedQuestionKeywords.size >= 1) {
    techScore = 2.5;
  } else {
    techScore = wordCount > 15 ? 1.5 : 0.5;
  }

  // Bonus for matching explicit expected key points
  if (keyPointMatches > 0) {
    techScore = Math.min(10, techScore + keyPointMatches * 0.6);
  }

  // 3. Problem Solving: Structure, reasoning, trade-offs, examples
  let problemSolving = 0;
  if (explanationCount >= 3) {
    problemSolving = Math.min(10, 7.0 + explanationCount * 0.5);
  } else if (explanationCount === 2) {
    problemSolving = 6.0;
  } else if (explanationCount === 1) {
    problemSolving = 4.5;
  } else {
    problemSolving = wordCount > 20 ? 3.5 : (wordCount > 8 ? 2.0 : 1.0);
  }

  // 4. Communication: Fluency, sentence completeness
  let communication = 0;
  if (wordCount >= 40) {
    communication = Math.min(10, 7.5 + Math.min(2.5, explanationCount * 0.5));
  } else if (wordCount >= 20) {
    communication = 6.5;
  } else if (wordCount >= 10) {
    communication = 5.0;
  } else if (wordCount >= 4) {
    communication = 3.5;
  } else {
    communication = 2.0;
  }

  // 5. Coding Ability
  let codingScore = 0;
  const isCodingQuestion = qAnalysis.category === 'coding' || /code|snippet|query|function|implement/i.test(qAnalysis.questionText);
  if (isCodingQuestion || hasCode) {
    if (hasCode) {
      const codeLength = (rawCode || combinedAnswer).length;
      codingScore = codeLength > 40 ? 8.0 : (codeLength > 15 ? 6.0 : 4.0);
    } else if (matchedConcepts.size >= 2) {
      codingScore = 5.0; // Described logic in words
    } else {
      codingScore = 2.5;
    }
  } else {
    codingScore = techScore; // Inherit technical understanding when not a pure coding question
  }

  // --- Overall Score Calculation according to user's fair rubric ---
  // Rubric:
  // - Substantially correct: 75–100% (7.5–10)
  // - Mostly correct with minor mistakes: 60–80% (6.0–8.0)
  // - Partially correct showing some understanding: 35–60% (3.5–6.0)
  // - Relevant attempt with limited knowledge: 15–35% (1.5–3.5)
  // - Meaningful but vague attempt: 5–20% (0.5–2.0)
  // - Irrelevant or empty: 0–5% (0–0.5)

  let calculatedOverall = 0;
  if (matchedConcepts.size >= 3 && explanationCount >= 1) {
    // Substantially correct
    calculatedOverall = Math.min(9.5, 7.5 + (matchedConcepts.size - 3) * 0.4 + explanationCount * 0.3);
  } else if (matchedConcepts.size >= 2 || (matchedConcepts.size >= 1 && explanationCount >= 2)) {
    // Mostly correct with minor omissions
    calculatedOverall = Math.min(7.8, 6.0 + (matchedConcepts.size * 0.6) + (explanationCount * 0.3));
  } else if (matchedConcepts.size >= 1 || (matchedQuestionKeywords.size >= 2 && wordCount >= 12)) {
    // Partially correct showing understanding
    calculatedOverall = Math.min(5.8, 3.8 + (matchedQuestionKeywords.size * 0.5) + (explanationCount * 0.4));
  } else if (matchedQuestionKeywords.size >= 1 || wordCount >= 15) {
    // Relevant attempt with limited knowledge
    calculatedOverall = Math.min(3.2, 1.8 + (wordCount > 25 ? 0.8 : 0.4));
  } else if (wordCount >= 4) {
    // Meaningful but vague attempt
    calculatedOverall = 1.2;
  } else {
    // Irrelevant / very minimal
    calculatedOverall = 0.5;
  }

  // Round scores to 1 decimal place
  const round1 = (val) => Math.round(Math.min(maxMarks, Math.max(0, val)) * 10) / 10;

  const finalTech = round1(techScore);
  const finalComm = round1(communication);
  const finalProb = round1(problemSolving);
  const finalCoding = round1(codingScore);
  const finalOverall = round1(calculatedOverall);

  // Generate dynamic feedback & observations
  const strengthsList = [];
  const improvementsList = [];

  if (matchedConcepts.size > 0) {
    strengthsList.push(`Demonstrated knowledge of key concepts: ${[...matchedConcepts].slice(0, 3).join(', ')}.`);
  }
  if (explanationCount >= 2) {
    strengthsList.push('Provided structured reasoning and clear causal explanations.');
  }
  if (hasCode) {
    strengthsList.push('Included code/syntax references to support the answer.');
  }
  if (wordCount >= 25 && communication >= 6) {
    strengthsList.push('Communicated thoughts in a coherent, understandable manner.');
  }
  if (strengthsList.length === 0) {
    strengthsList.push('Attempted the question and engaged with the interview topic.');
  }

  if (matchedConcepts.size < 2) {
    improvementsList.push('Include specific technical terminology and core architectural details.');
  }
  if (explanationCount < 2) {
    improvementsList.push('Elaborate with practical examples, trade-offs, or use cases.');
  }
  if (isCodingQuestion && !hasCode) {
    improvementsList.push('Include concrete code snippets or pseudocode implementation.');
  }
  if (wordCount < 25) {
    improvementsList.push('Provide more depth and detail in your response.');
  }
  if (improvementsList.length === 0) {
    improvementsList.push('Continue practicing deep architectural trade-offs and edge-case handling.');
  }

  let feedback = '';
  if (finalOverall >= 7.5) {
    feedback = `Strong answer. You clearly understand the core principles of ${qAnalysis.topic} and explained the key mechanisms effectively.`;
  } else if (finalOverall >= 6.0) {
    feedback = `Good attempt. You demonstrated solid foundational understanding of ${qAnalysis.topic}, with room for more specific implementation details.`;
  } else if (finalOverall >= 3.5) {
    feedback = `Partially correct. You touched upon relevant concepts in ${qAnalysis.topic}, but could strengthen your explanation with concrete examples and deeper technical terminology.`;
  } else if (finalOverall >= 1.5) {
    feedback = `Fair attempt. Your answer shows initial familiarity with the subject, but lacks essential technical depth and core conceptual clarity.`;
  } else {
    feedback = `Attempt noted. Your response was brief or vague. In future interviews, elaborate more thoroughly on the fundamental concepts.`;
  }

  return {
    questionId,
    maxMarks,
    awardedMarks: finalOverall,
    score: finalOverall,
    attempted: true,
    relevanceScore: round1(relevance),
    technicalKnowledge: finalTech,
    codingAbility: finalCoding,
    communicationSkills: finalComm,
    problemSolving: finalProb,
    feedback,
    strengths: strengthsList,
    improvements: improvementsList,
    evaluationSource: 'fallback'
  };
}

/**
 * Generate final comprehensive evaluation across all answers
 */
function generateFinalEvaluation(answers = []) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return {
      overallScore: 0,
      skillAssessment: {
        technicalKnowledge: 0,
        codingAbility: 0,
        communicationSkills: 0,
        problemSolving: 0
      },
      strengths: ['No answers submitted.'],
      weaknesses: ['Candidate did not complete interview questions.'],
      recommendations: ['Attempt all questions in future interview sessions.'],
      overallFeedback: 'No answers were recorded for this interview session.',
      hiringRecommendation: 'not recommend',
      evaluationSource: 'fallback'
    };
  }

  let totalScore = 0;
  let totalTech = 0;
  let totalComm = 0;
  let totalProblem = 0;
  let totalCoding = 0;
  let evaluatedCount = 0;

  const collectedStrengths = new Set();
  const collectedWeaknesses = new Set();

  for (const ans of answers) {
    // Resolve score from analysis or evaluate directly
    let evalData = ans.evaluation || ans.analysis;
    if (!evalData || evalData.evaluationFailed || evalData.score === null || evalData.score === undefined) {
      evalData = evaluateAnswer(ans.answer, ans.question, { code: ans.code });
      ans.analysis = evalData;
      ans.evaluation = evalData;
    }

    const qScore = typeof evalData.score === 'number' ? evalData.score : (evalData.awardedMarks || 0);
    const qTech = typeof evalData.technicalKnowledge === 'number' ? evalData.technicalKnowledge : (evalData.technicalAccuracy || qScore);
    const qComm = typeof evalData.communicationSkills === 'number' ? evalData.communicationSkills : (evalData.communication || qScore);
    const qProb = typeof evalData.problemSolving === 'number' ? evalData.problemSolving : qScore;
    const qCode = typeof evalData.codingAbility === 'number' ? evalData.codingAbility : qTech;

    totalScore += qScore;
    totalTech += qTech;
    totalComm += qComm;
    totalProblem += qProb;
    totalCoding += qCode;
    evaluatedCount++;

    if (Array.isArray(evalData.strengths)) {
      evalData.strengths.forEach(s => collectedStrengths.add(s));
    }
    if (Array.isArray(evalData.improvements)) {
      evalData.improvements.forEach(i => collectedWeaknesses.add(i));
    }
  }

  const round1 = (val) => Math.round(val * 10) / 10;
  const count = evaluatedCount > 0 ? evaluatedCount : 1;

  const avgOverall = round1(totalScore / count);
  const avgTech = round1(totalTech / count);
  const avgComm = round1(totalComm / count);
  const avgProb = round1(totalProblem / count);
  const avgCoding = round1(totalCoding / count);

  let hiringRecommendation = 'consider';
  let readinessLevel = 'Developing';

  if (avgOverall >= 8.0) {
    hiringRecommendation = 'strongly recommend';
    readinessLevel = 'Job Ready (Advanced)';
  } else if (avgOverall >= 6.5) {
    hiringRecommendation = 'recommend';
    readinessLevel = 'Job Ready';
  } else if (avgOverall >= 4.0) {
    hiringRecommendation = 'consider';
    readinessLevel = 'Junior Level / Developing';
  } else {
    hiringRecommendation = 'not recommend';
    readinessLevel = 'Needs Further Practice';
  }

  const strengths = collectedStrengths.size > 0 
    ? [...collectedStrengths].slice(0, 4)
    : ['Demonstrated willingness to tackle technical questions', 'Communicated answers clearly'];

  const weaknesses = collectedWeaknesses.size > 0
    ? [...collectedWeaknesses].slice(0, 4)
    : ['Elaborate with deeper system architectural trade-offs', 'Provide more concrete code examples'];

  const recommendations = [
    'Focus on articulating practical real-world production trade-offs.',
    'Practice explaining complex data flow and memory lifecycle in simple, precise terms.',
    'Strengthen hands-on implementation speed for technical coding questions.'
  ];

  let overallFeedback = '';
  if (avgOverall >= 7.5) {
    overallFeedback = `Excellent technical performance. The candidate demonstrated comprehensive understanding of core technical concepts, structured problem-solving, and clear communication throughout the interview.`;
  } else if (avgOverall >= 6.0) {
    overallFeedback = `Good performance overall. The candidate exhibits solid fundamental knowledge and communicated their reasoning effectively, with some minor opportunities to deepen architectural details.`;
  } else if (avgOverall >= 3.5) {
    overallFeedback = `Satisfactory attempt with commendable effort. The candidate showed familiarity with key concepts and participated actively. Continuing practice with deeper technical terminology and code implementation will boost performance.`;
  } else {
    overallFeedback = `The candidate participated in the interview session and attempted questions. Further study on foundational concepts and structured explanation technique is recommended.`;
  }

  return {
    overallScore: avgOverall,
    skillAssessment: {
      technicalKnowledge: avgTech,
      codingAbility: avgCoding,
      communicationSkills: avgComm,
      problemSolving: avgProb
    },
    strengths,
    weaknesses,
    recommendations,
    overallFeedback,
    hiringRecommendation,
    careerReadiness: {
      level: readinessLevel,
      recommendation: hiringRecommendation === 'strongly recommend' || hiringRecommendation === 'recommend' 
        ? 'Well suited for candidate interviews and technical roles.' 
        : 'Recommended for targeted practice and foundational upskilling.'
    },
    evaluationSource: 'fallback'
  };
}

module.exports = {
  evaluateAnswer,
  generateFinalEvaluation,
  normalizeText,
  analyzeQuestion,
  DOMAIN_KNOWLEDGE
};
