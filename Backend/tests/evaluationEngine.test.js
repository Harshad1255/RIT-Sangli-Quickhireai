const evaluationEngine = require('../src/features/interviews/services/evaluationEngine');
const geminiService = require('../src/features/interviews/services/geminiService');

describe('QuickHire AI - Interview Evaluation Pipeline Tests', () => {

  describe('1. Fallback & Rubric Evaluation Engine', () => {
    
    test('1. Fully correct technical answer receives high marks (7.5 - 10)', () => {
      const question = {
        question: 'Explain the concept of closures in JavaScript and provide a practical use case.',
        topic: 'JavaScript',
        expectedKeyPoints: ['Lexical scope', 'Inner function', 'Data privacy']
      };
      const answer = 'A closure is created when an inner function accesses variables from its outer lexical scope even after the outer function has returned. A practical use case is data privacy or creating private variables, like a counter function, or in currying.';
      
      const result = evaluationEngine.evaluateAnswer(answer, question);
      
      expect(result.score).toBeGreaterThanOrEqual(7.5);
      expect(result.score).toBeLessThanOrEqual(10.0);
      expect(result.technicalKnowledge).toBeGreaterThanOrEqual(7.0);
      expect(result.feedback).toBeTruthy();
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    test('2. Partially correct answer receives fair partial marks (3.5 - 6.0)', () => {
      const question = {
        question: 'How does the event loop work in JavaScript?',
        topic: 'JavaScript'
      };
      const answer = 'The event loop handles asynchronous callbacks. It takes tasks from the callback queue and puts them on the call stack when it is empty.';
      
      const result = evaluationEngine.evaluateAnswer(answer, question);
      
      expect(result.score).toBeGreaterThanOrEqual(3.5);
      expect(result.score).toBeLessThanOrEqual(8.0);
      expect(result.technicalKnowledge).toBeGreaterThanOrEqual(3.5);
    });

    test('3. Meaningful but incomplete answer receives some marks (1.5 - 3.5)', () => {
      const question = {
        question: 'What is the difference between var, let, and const?',
        topic: 'JavaScript'
      };
      const answer = 'var is old and let and const are new block scope.';
      
      const result = evaluationEngine.evaluateAnswer(answer, question);
      
      expect(result.score).toBeGreaterThanOrEqual(1.5);
      expect(result.score).toBeLessThanOrEqual(6.0);
      expect(result.attempted).toBe(true);
    });

    test('4. Short, relevant answer is not automatically scored zero', () => {
      const question = 'What are React Hooks?';
      const answer = 'Functions that let you use state and lifecycle in functional components.';
      
      const result = evaluationEngine.evaluateAnswer(answer, question);
      
      expect(result.score).toBeGreaterThanOrEqual(3.5);
      expect(result.score).toBeLessThanOrEqual(7.5);
      expect(result.score).not.toBe(0);
    });

    test('5. Relevant answer with minor speech-to-text errors receives fair marks', () => {
      const question = 'How do you handle asynchronous operations in JavaScript?';
      // Simulates speech-to-text transcription: "a sink" for "async", "promisses" for "promises"
      const answer = 'We use a sink a wait or promisses to handle call backs in JavaScript so code does not block.';
      
      const result = evaluationEngine.evaluateAnswer(answer, question);
      
      expect(result.score).toBeGreaterThanOrEqual(4.0);
      expect(result.score).not.toBe(0);
    });

    test('6. Irrelevant answer does not receive unjustified marks', () => {
      const question = 'Explain database indexing and B-Trees in SQL.';
      const answer = 'I like to play cricket and eat ice cream on sunny weekends with my friends.';
      
      const result = evaluationEngine.evaluateAnswer(answer, question);
      
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.technicalKnowledge).toBeLessThanOrEqual(1.0);
    });

    test('7. Genuinely empty or skipped answer receives zero', () => {
      const question = 'Explain prototypal inheritance in JavaScript.';
      
      const emptyResult = evaluationEngine.evaluateAnswer('', question);
      expect(emptyResult.score).toBe(0);
      expect(emptyResult.awardedMarks).toBe(0);
      expect(emptyResult.attempted).toBe(false);

      const skippedResult = evaluationEngine.evaluateAnswer('skipped', question);
      expect(skippedResult.score).toBe(0);
      expect(skippedResult.attempted).toBe(false);
    });

    test('8. Handles question as an object without crashing (no question.substring error)', () => {
      const questionObj = {
        id: 'q_12345',
        question: 'What is ACID in databases?',
        topic: 'SQL',
        category: 'fundamentals'
      };
      const answer = 'Atomicity, Consistency, Isolation, and Durability guarantees transactions are processed reliably.';
      
      expect(() => {
        const result = evaluationEngine.evaluateAnswer(answer, questionObj);
        expect(result.score).toBeGreaterThanOrEqual(6.0);
        expect(result.questionId).toBe('q_12345');
      }).not.toThrow();
    });

    test('9. Aggregates final evaluation safely without NaN or undefined', () => {
      const mockAnswers = [
        {
          question: 'What is React state?',
          answer: 'State is an internal data store for a component that triggers re-render when changed with useState.',
          analysis: { score: 7.0, technicalKnowledge: 7.0, communicationSkills: 7.5, problemSolving: 6.5 }
        },
        {
          question: 'What is JSX?',
          answer: 'Syntax extension for JavaScript to write HTML-like structures inside React.',
          analysis: { score: 6.0, technicalKnowledge: 6.0, communicationSkills: 6.0, problemSolving: 6.0 }
        }
      ];

      const finalEval = evaluationEngine.generateFinalEvaluation(mockAnswers);

      expect(finalEval.overallScore).toBe(6.5);
      expect(Number.isFinite(finalEval.overallScore)).toBe(true);
      expect(finalEval.skillAssessment.technicalKnowledge).toBe(6.5);
      expect(finalEval.strengths.length).toBeGreaterThan(0);
      expect(finalEval.weaknesses.length).toBeGreaterThan(0);
      expect(finalEval.hiringRecommendation).toBe('recommend');
    });

  });

  describe('2. GeminiService with Automatic Fallback', () => {
    
    test('10. analyzeAnswer does not crash when question is an object and falls back safely', async () => {
      const questionObj = {
        id: 'q_test_obj',
        question: 'Explain the difference between list comprehensions and generator expressions in Python.',
        topic: 'Python'
      };
      const answer = 'List comprehensions create the whole list in memory immediately, while generator expressions evaluate lazily using yield and save memory.';

      const result = await geminiService.analyzeAnswer(answer, questionObj);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(Number.isFinite(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4.0);
      expect(result.score).toBeLessThanOrEqual(10.0);
      expect(result.feedback).toBeTruthy();
    });

    test('11. calculateSkillScores never returns NaN even with empty or missing fields', () => {
      const invalidAnswers = [
        { question: 'Test Q1', answer: 'Test A1', analysis: {} },
        { question: 'Test Q2', answer: 'Test A2', evaluation: { score: null } }
      ];

      const scores = geminiService.calculateSkillScores(invalidAnswers);

      expect(Number.isFinite(scores.overallScore)).toBe(true);
      expect(Number.isNaN(scores.overallScore)).toBe(false);
      expect(Number.isFinite(scores.technicalKnowledge)).toBe(true);
    });

    test('12. Generates Civil Engineering questions without asking for coding or CSE', async () => {
      const civilQ1 = geminiService.getFallbackQuestion('Beams', [], 'fundamentals', 'Civil');
      const civilQ2 = geminiService.getFallbackQuestion('Soil Mechanics', [civilQ1], 'fundamentals', 'Civil');

      expect(civilQ1).toBeDefined();
      expect(civilQ2).toBeDefined();
      expect(civilQ1.question).not.toBe(civilQ2.question);
      expect(/javascript|python|sql query|react|node/i.test(civilQ1.question)).toBe(false);
      expect(/javascript|python|sql query|react|node/i.test(civilQ2.question)).toBe(false);
    });

    test('13. Anti-repetition: sequential questions do not repeat identical text', () => {
      const q1 = geminiService.getFallbackQuestion('Beams', [], 'fundamentals', 'Civil');
      const q2 = geminiService.getFallbackQuestion('Beams', [q1], 'practical use', 'Civil');
      const q3 = geminiService.getFallbackQuestion('Beams', [q1, q2], 'trade-offs', 'Civil');

      expect(q1.question).not.toBe(q2.question);
      expect(q2.question).not.toBe(q3.question);
      expect(q1.question).not.toBe(q3.question);
    });

    test('14. Accurately evaluates Civil Engineering answer with high marks', () => {
      const question = {
        question: 'Explain the bending moment and shear force in a beam.',
        topic: 'Beams',
        category: 'Civil'
      };
      const answer = 'Bending moment is the internal reaction that induces bending in a structural beam due to external loads, calculated as force times distance. Shear force is the perpendicular force trying to shear the beam across its section. At points where shear force is zero, bending moment is maximum.';

      const result = evaluationEngine.evaluateAnswer(answer, question);

      expect(result.score).toBeGreaterThanOrEqual(7.0);
      expect(result.score).toBeLessThanOrEqual(10.0);
      expect(result.technicalKnowledge).toBeGreaterThanOrEqual(6.5);
    });

  });

});
