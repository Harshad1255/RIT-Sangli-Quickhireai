const CodingProblem = require('../../src/features/coding/models/CodingProblem');
const CodingSubmission = require('../../src/features/coding/models/CodingSubmission');
const codingProblemController = require('../../src/features/coding/controllers/codingProblemController');
const express = require('express');

jest.mock('../../src/features/coding/models/CodingProblem', () => ({ find: jest.fn() }));
jest.mock('../../src/features/coding/models/CodingSubmission', () => ({ find: jest.fn() }));

const seededProblems = [
  { _id: 'graph-id', category: 'Graph', tags: ['BFS'], title: 'Graph traversal', difficulty: 'Easy', isActive: true },
  { _id: 'tree-id', category: 'Tree', tags: ['BST'], title: 'Tree traversal', difficulty: 'Medium', isActive: true },
  { _id: 'dp-id', category: 'DP', tags: ['Dynamic Programming'], title: 'DP paths', difficulty: 'Medium', isActive: true },
  { _id: 'arrays-id', category: 'Arrays', tags: ['Hashing'], title: 'Array pairs', difficulty: 'Easy', isActive: true }
];

const matchesCondition = (problem, condition) => {
  return Object.entries(condition).every(([field, expected]) => {
    if (field === '$and') return expected.every(part => matchesCondition(problem, part));
    if (field === '$or') return expected.some(part => matchesCondition(problem, part));
    const value = problem[field];
    if (expected instanceof RegExp) return expected.test(value || '');
    if (expected && expected.$in) {
      const values = Array.isArray(value) ? value : [value];
      return values.some(item => expected.$in.some(candidate => (
        candidate instanceof RegExp ? candidate.test(item || '') : candidate === item
      )));
    }
    return value === expected;
  });
};

let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.get('/api/coding/problems', (req, res) => codingProblemController.listProblems(req, res));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/coding/problems`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

const invokeList = async query => {
  CodingProblem.find.mockImplementation(filter => {
    const returnedProblems = seededProblems.filter(problem => matchesCondition(problem, filter));
    const queryBuilder = {
      select: jest.fn(() => queryBuilder),
      sort: jest.fn(async () => returnedProblems.map(problem => ({
        ...problem,
        toObject: () => ({ ...problem })
      })))
    };
    return queryBuilder;
  });
  CodingSubmission.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

  const searchParams = new URLSearchParams(query);
  const response = await fetch(`${baseUrl}?${searchParams}`);
  return { statusCode: response.status, body: await response.json() };
};

describe('GET /api/coding/problems topic filters', () => {
  test('Graphs returns only graph problems', async () => {
    const response = await invokeList({ topic: 'Graphs' });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.map(problem => problem._id)).toEqual(['graph-id']);
  });

  test('All returns every active problem', async () => {
    const response = await invokeList({ topic: 'All' });

    expect(response.body.data).toHaveLength(4);
  });

  test('topic and difficulty filters combine', async () => {
    const response = await invokeList({ topic: 'Graphs', difficulty: 'Easy' });

    expect(response.body.data.map(problem => problem._id)).toEqual(['graph-id']);
  });

  test('unknown topics and regex characters do not crash or match broadly', async () => {
    const unknownTopic = await invokeList({ topic: '[no such topic' });
    const unsafeSearch = await invokeList({ search: '[' });

    expect(unknownTopic.statusCode).toBe(200);
    expect(unknownTopic.body.data).toEqual([]);
    expect(unsafeSearch.statusCode).toBe(200);
    expect(unsafeSearch.body.data).toEqual([]);
  });
});