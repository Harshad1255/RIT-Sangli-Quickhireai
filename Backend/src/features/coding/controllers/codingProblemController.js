const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const { randomUUID } = require('crypto');
const { executeCode, judgeSolution } = require('../../../shared/services/codeExecution');
const { wrapCodeForExecution } = require('../services/functionDriver');
const { generateCodingProblem } = require('../services/codingGeminiService');
const { CODING_TOPICS, CODING_TOPIC_MATCHES } = require('../constants/categories');

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sendInternalError = (req, res, operation, error) => {
  const requestId = req.id || randomUUID();
  console.error(`[coding:${operation}] requestId=${requestId}`, error);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', requestId }
  });
};

const normalizeViolationEvents = (violations = []) => {
  if (!Array.isArray(violations)) return [];

  return violations.map((violation) => {
    const type = violation?.type || 'window_blur';
    const message = violation?.message || 'Assessment security event detected.';
    const severity = violation?.severity || (type === 'fullscreen_exit' || type === 'tab_switch' ? 'critical' : 'warning');
    return {
      type,
      message,
      severity,
      timestamp: violation?.timestamp ? new Date(violation.timestamp) : new Date(),
      metadata: violation?.metadata || {}
    };
  });
};

const applyViolationSummary = (record, violations) => {
  if (!record || !Array.isArray(violations) || violations.length === 0) return;

  const normalized = normalizeViolationEvents(violations);
  const highestSeverity = normalized.reduce((highest, event) => {
    const order = { info: 1, warning: 2, critical: 3 };
    return order[event.severity] > order[highest] ? event.severity : highest;
  }, 'info');

  record.violationEvents = normalized;
  record.fullscreenExitCount = normalized.filter(v => v.type === 'fullscreen_exit').length;
  record.tabSwitchCount = normalized.filter(v => v.type === 'tab_switch').length;
  record.copyAttemptCount = normalized.filter(v => v.type === 'copy').length;
  record.pasteAttemptCount = normalized.filter(v => v.type === 'paste').length;
  record.cutAttemptCount = normalized.filter(v => v.type === 'cut').length;
  record.securitySummary = {
    totalViolations: normalized.length,
    highestSeverity,
    lastViolationAt: normalized[normalized.length - 1]?.timestamp || new Date()
  };
  record.submissionStatus = 'terminated_violation';
};

const codingProblemController = {
  getExecutionHealth: async (req, res) => {
    try {
      const primaryProvider = (process.env.CODE_EXECUTION_PROVIDER || 'judge0').trim().toLowerCase();
      const fallbackProvider = (process.env.CODE_EXECUTION_FALLBACK_PROVIDER || 'onecompiler').trim().toLowerCase();
      const probe = await executeCode({ language: 'python', code: 'print(1)', stdin: '' });

      return res.status(200).json({
        success: true,
        data: {
          codeExecutionEnabled: process.env.CODE_EXECUTION_ENABLED === 'true',
          primaryProvider,
          fallbackProvider,
          providerConfig: {
            judge0: {
              apiUrlConfigured: Boolean(process.env.JUDGE0_API_URL || process.env.JUDGE0_BASE_URL),
              apiKeyConfigured: Boolean(process.env.JUDGE0_API_KEY)
            },
            onecompiler: {
              apiUrlConfigured: Boolean(process.env.ONECOMPILER_API_URL || 'https://api.onecompiler.com/v1/run'),
              apiKeyConfigured: Boolean(process.env.ONECOMPILER_API_KEY)
            }
          },
          probe: {
            success: probe.verdict === 'Accepted' && String(probe.output || '').trim() === '1',
            verdict: probe.verdict,
            output: probe.output || '',
            runtimeMs: probe.runtimeMs || 0,
            memoryKb: probe.memoryKb || 0,
            serviceReason: probe.serviceReason
          }
        }
      });
    } catch (error) {
      return sendInternalError(req, res, 'health', error);
    }
  },

  // POST /api/coding/problems - create problem (company)
  createProblem: async (req, res) => {
    try {
      const { title, difficulty, tags, statementMarkdown, description, constraints, starterCode, entryFunction, testCases, linkedInterviewId, isDailyChallenge, dailyLabel, category } = req.body;
      const companyId = req.user.id || req.user._id;

      if (!title) return res.status(400).json({ success: false, error: 'Problem title is required' });
      if (!description && !statementMarkdown) return res.status(400).json({ success: false, error: 'Problem description is required' });
      if (!difficulty) return res.status(400).json({ success: false, error: 'Difficulty is required' });
      if (!testCases || testCases.length === 0) return res.status(400).json({ success: false, error: 'At least one test case is required' });

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        if (tc.input === undefined || tc.input === null) {
          return res.status(400).json({ success: false, error: `Test case ${i + 1} is missing input` });
        }
        if (tc.expectedOutput === undefined || tc.expectedOutput === null || String(tc.expectedOutput).trim() === '') {
          return res.status(400).json({ success: false, error: `Test case ${i + 1} must have a valid expected output` });
        }
      }

      const normalizedTitle = title.trim();
      const duplicate = await CodingProblem.findOne({
        companyId,
        isActive: true,
        title: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i')
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'A coding problem with this title already exists' });
      }
      const slug = normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      const problem = new CodingProblem({
        companyId,
        createdBy: companyId,
        title: normalizedTitle,
        slug,
        category: category || 'Algorithms',
        description: description || statementMarkdown || '',
        statementMarkdown: statementMarkdown || description || '',
        difficulty: difficulty || 'Easy',
        tags: tags || [],
        isDailyChallenge: Boolean(isDailyChallenge),
        dailyLabel: dailyLabel || (isDailyChallenge ? 'Daily DSA' : ''),
        constraints: constraints || [],
        starterCode: starterCode || undefined,
        entryFunction: entryFunction || 'solve',
        testCases: testCases || [],
        linkedInterviewId: linkedInterviewId || null
      });

      await problem.save();

      return res.status(201).json({
        success: true,
        data: problem
      });
    } catch (error) {
      console.error('Error in createProblem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error creating coding problem' });
    }
  },

  // GET /api/coding/problems/topics - shared labels for company and student UIs
  getTopics: (req, res) => res.status(200).json({ success: true, data: ['All', ...CODING_TOPICS] }),

  // GET /api/coding/problems - list problems (student — hide hidden test cases)
  listProblems: async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const { difficulty, tag, search, dailyOnly, topic } = req.query;
      const filter = { isActive: true };
      const filterClauses = [];

      if (dailyOnly === 'true' || dailyOnly === '1') {
        filter.isDailyChallenge = true;
      }
      if (difficulty) filter.difficulty = difficulty;
      if (tag) filter.tags = tag;
      const requestedTopic = typeof topic === 'string' ? topic.trim() : '';
      if (requestedTopic && requestedTopic.toLowerCase() !== 'all') {
        const topicKey = CODING_TOPICS.find(label => label.toLowerCase() === requestedTopic.toLowerCase());
        const aliases = CODING_TOPIC_MATCHES[topicKey];
        if (aliases) {
          const expressions = aliases.map(alias => new RegExp(`^${escapeRegex(alias)}$`, 'i'));
          filterClauses.push({
            $or: [
              { category: { $in: expressions } },
              { tags: { $in: expressions } }
            ]
          });
        } else {
          filter._id = { $in: [] };
        }
      }
      if (search) {
        const expression = new RegExp(escapeRegex(search), 'i');
        filterClauses.push({
          $or: [
            { title: expression },
            { description: expression },
            { statementMarkdown: expression }
          ]
        });
      }
      if (filterClauses.length) filter.$and = filterClauses;

      const problems = await CodingProblem.find(filter)
        .select('-testCases') // Hide all test cases in list view
        .sort({ createdAt: -1 });

      // Check student solution status if logged in
      const userId = req.user ? (req.user.id || req.user._id) : null;
      let userSubmissionsMap = {};
      if (userId) {
        const subs = await CodingSubmission.find({ userId, isRunOnly: false }).select('problemId verdict');
        subs.forEach(s => {
          const pid = s.problemId.toString();
          if (s.verdict === 'Accepted') {
            userSubmissionsMap[pid] = 'Solved';
          } else if (userSubmissionsMap[pid] !== 'Solved') {
            userSubmissionsMap[pid] = 'Attempted';
          }
        });
      }

      const problemsWithStatus = problems.map(p => {
        const pObj = p.toObject();
        pObj.status = userSubmissionsMap[p._id.toString()] || 'Unattempted';
        return pObj;
      });

      return res.status(200).json({
        success: true,
        data: problemsWithStatus
      });
    } catch (error) {
      console.error('Error in listProblems:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error listing problems' });
    }
  },

  // GET /api/coding/problems/company - company: list own problems
  getCompanyProblems: async (req, res) => {
    try {
      const companyId = req.user.id || req.user._id;
      const problems = await CodingProblem.find({
        isActive: true,
        $or: [{ companyId }, { createdBy: companyId }]
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: problems
      });
    } catch (error) {
      console.error('Error in getCompanyProblems:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching company problems' });
    }
  },

  // GET /api/coding/problems/:id - problem detail (sample cases only for students)
  getProblemDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const isCompany = req.user && req.user.userType === 'company';

      let problem;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        problem = await CodingProblem.findById(id);
      } else {
        problem = await CodingProblem.findOne({ slug: id });
      }

      if (!problem) {
        return res.status(404).json({ success: false, error: 'Coding problem not found' });
      }
      if (!isCompany && !problem.isActive) {
        return res.status(404).json({ success: false, error: 'This problem is no longer available' });
      }

      const problemObj = problem.toObject();

      // Only show sample/visible test cases to students
      if (!isCompany) {
        problemObj.testCases = (problemObj.testCases || []).filter(
          tc => tc.isSample || !tc.isHidden
        );
      }

      return res.status(200).json({
        success: true,
        data: problemObj
      });
    } catch (error) {
      console.error('Error in getProblemDetail:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching problem detail' });
    }
  },

  // PUT /api/coding/problems/:id - edit problem (company)
  editProblem: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;

      const problem = await CodingProblem.findOne({
        _id: id,
        $or: [{ companyId }, { createdBy: companyId }]
      });

      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found or unauthorized' });
      }

      const { title, difficulty, tags, statementMarkdown, description, constraints, starterCode, entryFunction, testCases, linkedInterviewId, isDailyChallenge, dailyLabel, category } = req.body;

      if (title !== undefined && !title) return res.status(400).json({ success: false, error: 'Problem title is required' });
      if (difficulty !== undefined && !difficulty) return res.status(400).json({ success: false, error: 'Difficulty is required' });
      
      if (testCases !== undefined) {
        if (!testCases || testCases.length === 0) return res.status(400).json({ success: false, error: 'At least one test case is required' });
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          if (tc.input === undefined || tc.input === null) {
            return res.status(400).json({ success: false, error: `Test case ${i + 1} is missing input` });
          }
          if (tc.expectedOutput === undefined || tc.expectedOutput === null || String(tc.expectedOutput).trim() === '') {
            return res.status(400).json({ success: false, error: `Test case ${i + 1} must have a valid expected output` });
          }
        }
      }

      if (title !== undefined) problem.title = title;
      if (difficulty !== undefined) problem.difficulty = difficulty;
      if (category !== undefined) problem.category = category;
      if (tags !== undefined) problem.tags = tags;
      if (statementMarkdown !== undefined) problem.statementMarkdown = statementMarkdown;
      if (description !== undefined) problem.description = description;
      if (isDailyChallenge !== undefined) problem.isDailyChallenge = Boolean(isDailyChallenge);
      if (dailyLabel !== undefined) problem.dailyLabel = dailyLabel || (problem.isDailyChallenge ? 'Daily DSA' : '');
      if (constraints !== undefined) problem.constraints = constraints;
      if (starterCode !== undefined) problem.starterCode = starterCode;
      if (entryFunction !== undefined) problem.entryFunction = entryFunction;
      if (testCases !== undefined) problem.testCases = testCases;
      if (linkedInterviewId !== undefined) problem.linkedInterviewId = linkedInterviewId;

      if (problem.isDailyChallenge && !problem.dailyLabel) {
        problem.dailyLabel = 'Daily DSA';
      }

      await problem.save();

      return res.status(200).json({
        success: true,
        data: problem
      });
    } catch (error) {
      console.error('Error in editProblem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error editing coding problem' });
    }
  },

  // DELETE /api/coding/problems/:id - delete coding problem
  deleteProblem: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;

      const problem = await CodingProblem.findOneAndUpdate({
        _id: id,
        $or: [{ companyId }, { createdBy: companyId }]
      }, {
        $set: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: companyId
        }
      }, {
        new: true
      });

      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found or unauthorized' });
      }

      // We should also remove it from any AptitudeTests that reference it
      const AptitudeTest = require('../../aptitude/models/AptitudeTest');
      await AptitudeTest.updateMany(
        { codingProblems: id },
        { $pull: { codingProblems: id } }
      );
      const CodingContest = require('../models/CodingContest');
      await CodingContest.updateMany(
        { 'problems.problemId': id },
        { $pull: { problems: { problemId: id } } }
      );

      return res.status(200).json({
        success: true,
        message: 'Coding problem deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteProblem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error deleting coding problem' });
    }
  },

  // POST /api/coding/problems/:id/run - run against sample cases only
  runProblem: async (req, res) => {
    try {
      const { id } = req.params;
      const { language, sourceCode, code, stdin } = req.body;
      const userCode = sourceCode || code;
      const customInput = typeof stdin === 'string' ? stdin : '';

      if (!userCode || !language) {
        return res.status(400).json({ success: false, error: 'Language and code are required' });
      }

      const problem = await CodingProblem.findById(id);
      if (!problem || !problem.isActive) {
        return res.status(404).json({ success: false, error: 'This problem is no longer available' });
      }
      const executionCode = wrapCodeForExecution(language, userCode, problem.entryFunction);

      // If the user provided custom stdin, always run the code against that custom input.
      if (customInput !== '') {
        const execRes = await executeCode({
          language,
          code: executionCode,
          stdin: customInput,
          timeLimitMs: problem.timeLimit || 2000,
          memoryLimitMb: problem.memoryLimit || 256
        });

        return res.status(200).json({
          success: true,
          data: {
            isRunOnly: true,
            verdict: execRes.verdict,
            code: execRes.code,
            serviceReason: execRes.serviceReason,
            output: execRes.output,
            stdout: execRes.output,
            stderr: execRes.stderr,
            runtimeMs: execRes.runtimeMs,
            memoryKb: execRes.memoryKb,
            testResults: []
          }
        });
      }

      const sampleTestCases = (problem.testCases || []).filter(
        tc => tc.isSample || !tc.isHidden
      );

      if (sampleTestCases.length === 0) {
        const execRes = await executeCode({ language, code: executionCode, stdin: '' });
        return res.status(200).json({
          success: true,
          data: {
            isRunOnly: true,
            verdict: execRes.verdict,
            code: execRes.code,
            serviceReason: execRes.serviceReason,
            output: execRes.output,
            stdout: execRes.output,
            stderr: execRes.stderr,
            runtimeMs: execRes.runtimeMs,
            memoryKb: execRes.memoryKb,
            testResults: []
          }
        });
      }

      const evaluation = await judgeSolution({
        language,
        code: executionCode,
        testCases: sampleTestCases,
        timeLimit: problem.timeLimit || 2000,
        memoryLimit: problem.memoryLimit || 256
      });

      return res.status(200).json({
        success: true,
        data: {
          isRunOnly: true,
          verdict: evaluation.verdict,
          code: evaluation.code,
          serviceReason: evaluation.serviceReason,
          passedCount: evaluation.passedTests,
          totalCount: evaluation.totalTests,
          runtimeMs: evaluation.runtime,
          memoryKb: evaluation.memory,
          memoryMb: evaluation.memory,
            output: evaluation.testResults?.[0]?.actualOutput || '',
            stderr: evaluation.testResults?.find(test => test.stderr)?.stderr || '',
          stdout: evaluation.testResults?.[0]?.actualOutput || '',
          testResults: evaluation.testResults
        }
      });
    } catch (error) {
      return sendInternalError(req, res, 'run', error);
    }
  },

  // POST /api/coding/problems/:id/submit - run against all cases, persist CodingSubmission
  submitProblem: async (req, res) => {
    try {
      const { id } = req.params;
      const { language, sourceCode, code, violations } = req.body;
      const userCode = sourceCode || code;
      const userId = req.user.id || req.user._id;

      if (!userCode || !language) {
        return res.status(400).json({ success: false, error: 'Language and code are required' });
      }

      const problem = await CodingProblem.findById(id);
      if (!problem || !problem.isActive) {
        return res.status(404).json({ success: false, error: 'This problem is no longer available' });
      }

      const allTestCases = problem.testCases || [];
      const executionCode = wrapCodeForExecution(language, userCode, problem.entryFunction);

      const evaluation = await judgeSolution({
        language,
        code: executionCode,
        testCases: allTestCases,
        timeLimit: problem.timeLimit || 2000,
        memoryLimit: problem.memoryLimit || 256
      });

      // Update problem stats
      problem.totalSubmissions += 1;
      if (evaluation.verdict === 'Accepted') {
        problem.totalAccepted += 1;
      }
      if (problem.totalSubmissions > 0) {
        problem.acceptanceRate = Number(((problem.totalAccepted / problem.totalSubmissions) * 100).toFixed(1));
      }
      await problem.save();

      // Persist CodingSubmission
      const passed = evaluation.passedTests;
      const total = evaluation.totalTests;
      const score = total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0;

      const submission = new CodingSubmission({
        userId,
        studentId: userId,
        problemId: id,
        language,
        code: userCode,
        sourceCode: userCode,
        verdict: evaluation.verdict,
        testResults: evaluation.testResults,
        passedTests: passed,
        passedCount: passed,
        totalTests: total,
        totalCount: total,
        score,
        runtime: evaluation.runtime,
        runtimeMs: evaluation.runtime,
        memory: evaluation.memory,
        isRun: false,
        isRunOnly: false,
        submittedAt: new Date()
      });

      if (violations && Array.isArray(violations)) {
        applyViolationSummary(submission, violations);
      }

      await submission.save();

      const { testId } = req.body;
      if (testId) {
        const AptitudeAttempt = require('../../aptitude/models/AptitudeAttempt');
        const AssessmentSecurityEvent = require('../../assessment/models/AssessmentSecurityEvent');
        
        const activeAttempt = await AptitudeAttempt.findOne({ testId, studentId: userId, completed: false });
        if (activeAttempt && activeAttempt.codingAnswers) {
          const caIndex = activeAttempt.codingAnswers.findIndex(ca => ca.problemId.toString() === id.toString());
          if (caIndex !== -1) {
            activeAttempt.codingAnswers[caIndex].code = userCode;
            activeAttempt.codingAnswers[caIndex].language = language;
            activeAttempt.codingAnswers[caIndex].status = evaluation.verdict === 'Accepted' ? 'Solved' : 'Attempted';
            activeAttempt.codingAnswers[caIndex].score = score;
            activeAttempt.codingAnswers[caIndex].passedTests = passed;
            activeAttempt.codingAnswers[caIndex].totalTests = total;
            await activeAttempt.save();
          }

          if (violations && Array.isArray(violations) && violations.length > 0) {
            const persistedEvents = await AssessmentSecurityEvent.find({ assessmentType: 'aptitude', attemptId: activeAttempt._id }).sort({ createdAt: 1 }).lean();
            const persistedKeys = new Set();
            persistedEvents.forEach(e => {
              if (e.eventId) persistedKeys.add(e.eventId);
              persistedKeys.add(`${e.eventType}:${e.message}`);
            });
            
            const newEvents = violations.filter(v => {
              const vType = v.type || v.eventType;
              if (v.eventId && persistedKeys.has(v.eventId)) return false;
              if (persistedKeys.has(`${vType}:${v.message}`)) return false;
              return true;
            });

            if (newEvents.length > 0) {
              const docs = newEvents.map(v => ({
                userId,
                studentId: userId,
                assessmentType: 'aptitude',
                assessmentId: activeAttempt.testId,
                attemptId: activeAttempt._id,
                eventType: v.type || v.eventType || 'WINDOW_BLUR',
                message: v.message,
                severity: v.severity || 'warning',
                eventId: v.eventId || `coding:${activeAttempt._id}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
                createdAt: v.timestamp || new Date()
              }));
              
              try {
                await AssessmentSecurityEvent.insertMany(docs, { ordered: false });
              } catch (err) {
                console.warn('Non-fatal error inserting new security events during coding submit:', err.message);
              }
            }
          }
        }
      }

      // Mask hidden test case inputs/outputs in response so they don't leak
      const sanitizedTestResults = evaluation.testResults.map(tr => ({
        ...tr,
        input: tr.isHidden ? 'Hidden Test Case' : tr.input,
        expectedOutput: tr.isHidden ? 'Hidden' : tr.expectedOutput,
        actualOutput: tr.isHidden ? (tr.passed ? 'Passed' : 'Failed') : tr.actualOutput
      }));

      return res.status(201).json({
        success: true,
        data: {
          submissionId: submission._id,
          verdict: evaluation.verdict,
          code: evaluation.code,
          serviceReason: evaluation.serviceReason,
          passedTestCases: passed,
          totalTestCases: total,
          score: score,
          passedCount: passed,
          totalCount: total,
          runtimeMs: evaluation.runtime,
          memoryKb: evaluation.memory,
          memoryMb: evaluation.memory,
          stderr: evaluation.testResults?.find(test => test.stderr)?.stderr || '',
          testResults: sanitizedTestResults,
          submittedAt: submission.submittedAt
        }
      });
    } catch (error) {
      return sendInternalError(req, res, 'submit', error);
    }
  },

  // GET /api/coding/submissions/mine - student's submission history
  getMySubmissions: async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { problemId } = req.query;

      const filter = {
        $or: [{ userId }, { studentId: userId }],
        isRunOnly: false
      };
      if (problemId) filter.problemId = problemId;

      const submissions = await CodingSubmission.find(filter)
        .populate('problemId', 'title slug difficulty')
        .sort({ submittedAt: -1, createdAt: -1 })
        .limit(50);

      const sanitizedSubmissions = submissions.map((submission) => {
        const data = submission.toObject();
        data.testResults = (data.testResults || []).map((testResult) => ({
          ...testResult,
          input: testResult.isHidden ? 'Hidden Test Case' : testResult.input,
          expectedOutput: testResult.isHidden ? 'Hidden Expected Output' : testResult.expectedOutput,
          actualOutput: testResult.isHidden ? (testResult.passed ? 'Passed' : 'Failed') : testResult.actualOutput,
          stderr: testResult.isHidden ? '' : testResult.stderr
        }));
        return data;
      });

      return res.status(200).json({
        success: true,
        data: sanitizedSubmissions
      });
    } catch (error) {
      console.error('Error in getMySubmissions:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching submission history' });
    }
  },

  // GET /api/coding/problems/:id/submissions - company: aggregate stats for a problem
  getProblemStats: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;

      const problem = await CodingProblem.findOne({
        _id: id,
        $or: [{ companyId }, { createdBy: companyId }]
      });

      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found or unauthorized' });
      }

      const submissions = await CodingSubmission.find({ problemId: id, isRunOnly: false })
        .populate('userId', 'name email university')
        .sort({ submittedAt: -1, createdAt: -1 });

      const uniqueStudents = new Set(submissions.map(s => s.userId ? s.userId._id.toString() : ''));
      uniqueStudents.delete('');

      const verdictCounts = {};
      submissions.forEach(s => {
        const v = s.verdict || 'Wrong Answer';
        verdictCounts[v] = (verdictCounts[v] || 0) + 1;
      });

      return res.status(200).json({
        success: true,
        data: {
          totalSubmissions: problem.totalSubmissions,
          totalAccepted: problem.totalAccepted,
          acceptanceRate: problem.acceptanceRate,
          uniqueStudentsCount: uniqueStudents.size,
          verdictCounts,
          recentSubmissions: submissions.slice(0, 20)
        }
      });
    } catch (error) {
      console.error('Error in getProblemStats:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching problem stats' });
    }
  },

  // POST /api/coding/problems/generate - generate AI problem
  generateProblem: async (req, res) => {
    try {
      const { topic, difficulty, languages } = req.body;
      
      if (!topic || !difficulty) {
        return res.status(400).json({ success: false, error: 'Topic and difficulty are required' });
      }

      const generatedProblem = await generateCodingProblem(topic, difficulty, languages);

      // Validate reference solution if provided
      if (generatedProblem.referenceSolution && generatedProblem.referenceSolution.javascript) {
        const testCases = [...(generatedProblem.sampleTestCases || []), ...(generatedProblem.hiddenTestCases || [])];
        if (testCases.length > 0) {
          try {
            const judgeResult = await judgeSolution({
              code: generatedProblem.referenceSolution.javascript,
              language: 'javascript',
              testCases: testCases,
              timeLimit: 2000,
              memoryLimit: 256
            });
            if (judgeResult.verdict !== 'Accepted') {
              generatedProblem._validationWarning = 'AI Reference solution failed some generated test cases. Please review test cases carefully.';
            }
          } catch (judgeErr) {
            console.error('Judge error during AI generation validation:', judgeErr);
            generatedProblem._validationWarning = 'Could not automatically validate the reference solution.';
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: generatedProblem
      });
    } catch (error) {
      console.error('Error generating coding problem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to generate problem' });
    }
  }
};

module.exports = codingProblemController;
