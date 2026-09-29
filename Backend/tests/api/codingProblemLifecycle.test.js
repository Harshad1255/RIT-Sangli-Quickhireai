jest.mock('../../src/features/auth/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: req.get('x-test-company') || 'student-a',
      userType: req.get('x-test-role') || 'student'
    };
    next();
  },
  authorizeCompany: (req, res, next) => next()
}));

jest.mock('../../src/features/coding/models/CodingProblem', () => {
  const documents = new Map();
  let nextId = 1;

  const matches = (document, filter) => Object.entries(filter).every(([field, expected]) => {
    if (field === '$and') return expected.every(part => matches(document, part));
    if (field === '$or') return expected.some(part => matches(document, part));
    if (expected instanceof RegExp) return expected.test(document[field] || '');
    if (expected && expected.$in) return expected.$in.includes(document[field]);
    return document[field] === expected;
  });

  class FakeCodingProblem {
    constructor(data) {
      Object.assign(this, data);
      this._id = String(nextId++).padStart(24, '0');
      if (this.isActive === undefined) this.isActive = true;
    }

    async save() {
      documents.set(this._id, this);
      return this;
    }

    toObject() {
      return { ...this };
    }
  }

  FakeCodingProblem.documents = documents;
  FakeCodingProblem.reset = () => {
    documents.clear();
    nextId = 1;
  };
  FakeCodingProblem.find = jest.fn(filter => {
    const query = {
      select: () => query,
      sort: async () => Array.from(documents.values()).filter(document => matches(document, filter))
    };
    return query;
  });
  FakeCodingProblem.findById = jest.fn(async id => documents.get(String(id)) || null);
  FakeCodingProblem.findOne = jest.fn(async filter => (
    Array.from(documents.values()).find(document => matches(document, filter)) || null
  ));
  FakeCodingProblem.findOneAndUpdate = jest.fn(async (filter, update) => {
    const document = documents.get(String(filter._id));
    if (!document || !matches(document, filter)) return null;
    Object.assign(document, update.$set);
    return document;
  });

  return FakeCodingProblem;
});

jest.mock('../../src/features/coding/models/CodingSubmission', () => {
  const records = [];
  return {
    records,
    find: jest.fn(() => {
      const query = {
        select: jest.fn().mockResolvedValue([]),
        populate: () => query,
        sort: () => query,
        limit: async () => records
      };
      return query;
    })
  };
});
jest.mock('../../src/features/coding/controllers/codingController', () => ({
  getContests: (req, res) => res.json({ success: true, data: [] }),
  getContestById: (req, res) => res.json({ success: true, data: {} }),
  createContest: (req, res) => res.json({ success: true, data: {} }),
  submitCode: (req, res) => res.json({ success: true, data: {} })
}));
jest.mock('../../src/features/aptitude/models/AptitudeTest', () => ({
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
}));
jest.mock('../../src/features/coding/models/CodingContest', () => ({
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
}));

const express = require('express');
const codingProblemRoutes = require('../../src/features/coding/routes/codingProblemRoutes');
const CodingProblem = require('../../src/features/coding/models/CodingProblem');
const CodingSubmission = require('../../src/features/coding/models/CodingSubmission');
const AptitudeTest = require('../../src/features/aptitude/models/AptitudeTest');
const CodingContest = require('../../src/features/coding/models/CodingContest');

describe('coding problem HTTP delete lifecycle', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/coding', codingProblemRoutes);
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/coding`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  beforeEach(() => {
    CodingProblem.reset();
    CodingSubmission.records.length = 0;
    AptitudeTest.updateMany.mockClear();
    CodingContest.updateMany.mockClear();
  });

  const request = async (path, { method = 'GET', company = 'student-a', role = 'student', body } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-test-company': company,
        'x-test-role': role
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return {
      status: response.status,
      cacheControl: response.headers.get('cache-control'),
      body: await response.json()
    };
  };

  test('topic catalog comes from the shared backend constants', async () => {
    const response = await request('/problems/topics');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      'All', 'Arrays & Hashing', 'Two Pointers', 'Dynamic Programming', 'Graphs', 'Trees'
    ]);
  });

  test('company cannot create duplicate problem titles', async () => {
    const body = {
      title: 'Unique problem title',
      category: 'Graphs',
      difficulty: 'Easy',
      description: 'API duplicate guard fixture',
      testCases: [{ input: '', expectedOutput: '1' }]
    };
    const first = await request('/problems', { method: 'POST', company: 'company-a', role: 'company', body });
    const duplicate = await request('/problems', {
      method: 'POST',
      company: 'company-a',
      role: 'company',
      body: { ...body, title: ' unique problem title ' }
    });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatch(/already exists/i);
  });

  test('company create -> student list -> delete -> list and detail are gone', async () => {
    const created = await request('/problems', {
      method: 'POST',
      company: 'company-a',
      role: 'company',
      body: {
        title: 'Lifecycle regression problem',
        category: 'Graphs',
        difficulty: 'Easy',
        description: 'API lifecycle test fixture',
        testCases: [{ input: '', expectedOutput: '1' }]
      }
    });
    expect(created.status).toBe(201);

    const problemId = created.body.data._id;
    const beforeDelete = await request('/problems');
    expect(beforeDelete.body.data.some(problem => problem._id === problemId)).toBe(true);
    expect(beforeDelete.cacheControl).toContain('no-store');

    CodingSubmission.records.push({
      problemId,
      verdict: 'Accepted',
      isRunOnly: false,
      testResults: [],
      toObject() { return { ...this }; }
    });

    const otherCompanyDelete = await request(`/problems/${problemId}`, {
      method: 'DELETE',
      company: 'company-b',
      role: 'company'
    });
    expect(otherCompanyDelete.status).toBe(404);
    expect((await request('/problems')).body.data.some(problem => problem._id === problemId)).toBe(true);

    const deleted = await request(`/problems/${problemId}`, {
      method: 'DELETE',
      company: 'company-a',
      role: 'company'
    });
    expect(deleted.status).toBe(200);

    const afterDelete = await request('/problems');
    const detailAfterDelete = await request(`/problems/${problemId}`);
    const storedProblem = CodingProblem.documents.get(problemId);
    expect(afterDelete.body.data.some(problem => problem._id === problemId)).toBe(false);
    expect(detailAfterDelete.status).toBe(404);
    expect(detailAfterDelete.body.error).toBe('This problem is no longer available');
    expect(storedProblem).toBeDefined();
    expect(storedProblem.isActive).toBe(false);
    expect(storedProblem.deletedAt).toBeInstanceOf(Date);
    expect(storedProblem.deletedBy).toBe('company-a');
    expect(AptitudeTest.updateMany).toHaveBeenCalledWith(
      { codingProblems: problemId },
      { $pull: { codingProblems: problemId } }
    );
    expect(CodingContest.updateMany).toHaveBeenCalledWith(
      { 'problems.problemId': problemId },
      { $pull: { problems: { problemId } } }
    );

    const secondDelete = await request(`/problems/${problemId}`, {
      method: 'DELETE',
      company: 'company-a',
      role: 'company'
    });
    expect(secondDelete.status).toBe(200);

    const runAfterDelete = await request(`/problems/${problemId}/run`, {
      method: 'POST',
      body: { language: 'javascript', code: 'console.log(1);' }
    });
    const submitAfterDelete = await request(`/problems/${problemId}/submit`, {
      method: 'POST',
      body: { language: 'javascript', code: 'console.log(1);' }
    });
    const historyAfterDelete = await request('/submissions/mine');
    expect(runAfterDelete.status).toBe(404);
    expect(submitAfterDelete.status).toBe(404);
    expect(historyAfterDelete.status).toBe(200);
    expect(historyAfterDelete.body.data).toHaveLength(1);
  });
});