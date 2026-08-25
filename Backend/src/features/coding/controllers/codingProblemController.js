const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const { executeCode, judgeSolution } = require('../services/judgeService');
const { generateCodingProblem } = require('../services/codingGeminiService');

const codingProblemController = {
  // POST /api/coding/problems - create problem (company)
  createProblem: async (req, res) => {
    try {
      const { title, difficulty, tags, statementMarkdown, description, constraints, starterCode, testCases, linkedInterviewId } = req.body;
      const companyId = req.user.id || req.user._id;

      if (!title) {
        return res.status(400).json({ success: false, error: 'Problem title is required' });
      }

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      const problem = new CodingProblem({
        companyId,
        createdBy: companyId,
        title,
        slug,
        description: description || statementMarkdown || '',
        statementMarkdown: statementMarkdown || description || '',
        difficulty: difficulty || 'Easy',
        tags: tags || [],
        constraints: constraints || [],
        starterCode: starterCode || undefined,
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

  // GET /api/coding/problems - list problems (student — hide hidden test cases)
  listProblems: async (req, res) => {
    try {
      const { difficulty, tag, search } = req.query;
      const filter = { isActive: true };

      if (difficulty) filter.difficulty = difficulty;
      if (tag) filter.tags = tag;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { statementMarkdown: { $regex: search, $options: 'i' } }
        ];
      }

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

      const { title, difficulty, tags, statementMarkdown, description, constraints, starterCode, testCases, linkedInterviewId } = req.body;

      if (title !== undefined) problem.title = title;
      if (difficulty !== undefined) problem.difficulty = difficulty;
      if (tags !== undefined) problem.tags = tags;
      if (statementMarkdown !== undefined) problem.statementMarkdown = statementMarkdown;
      if (description !== undefined) problem.description = description;
      if (constraints !== undefined) problem.constraints = constraints;
      if (starterCode !== undefined) problem.starterCode = starterCode;
      if (testCases !== undefined) problem.testCases = testCases;
      if (linkedInterviewId !== undefined) problem.linkedInterviewId = linkedInterviewId;

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

  // POST /api/coding/problems/:id/run - run against sample cases only
  runProblem: async (req, res) => {
    try {
      const { id } = req.params;
      const { language, sourceCode, code } = req.body;
      const userCode = sourceCode || code;

      if (!userCode || !language) {
        return res.status(400).json({ success: false, error: 'Language and code are required' });
      }

      const problem = await CodingProblem.findById(id);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      const sampleTestCases = (problem.testCases || []).filter(
        tc => tc.isSample || !tc.isHidden
      );

      if (sampleTestCases.length === 0) {
        // Run as single execution with empty stdin
        const execRes = await executeCode({ language, code: userCode, stdin: '' });
        return res.status(200).json({
          success: true,
          data: {
            isRunOnly: true,
            verdict: execRes.verdict,
            output: execRes.output,
            stderr: execRes.stderr,
            runtimeMs: execRes.runtime,
            testResults: []
          }
        });
      }

      const evaluation = await judgeSolution({
        language,
        code: userCode,
        testCases: sampleTestCases,
        timeLimit: problem.timeLimit || 2000,
        memoryLimit: problem.memoryLimit || 256
      });

      return res.status(200).json({
        success: true,
        data: {
          isRunOnly: true,
          verdict: evaluation.verdict,
          passedCount: evaluation.passedCount,
          totalCount: evaluation.totalCount,
          runtimeMs: evaluation.runtimeMs,
          memoryMb: evaluation.memoryMb,
          testResults: evaluation.testResults
        }
      });
    } catch (error) {
      console.error('Error in runProblem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error running code' });
    }
  },

  // POST /api/coding/problems/:id/submit - run against all cases, persist CodingSubmission
  submitProblem: async (req, res) => {
    try {
      const { id } = req.params;
      const { language, sourceCode, code } = req.body;
      const userCode = sourceCode || code;
      const userId = req.user.id || req.user._id;

      if (!userCode || !language) {
        return res.status(400).json({ success: false, error: 'Language and code are required' });
      }

      const problem = await CodingProblem.findById(id);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      const allTestCases = problem.testCases || [];

      const evaluation = await judgeSolution({
        language,
        code: userCode,
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
      const submission = new CodingSubmission({
        userId,
        studentId: userId,
        problemId: id,
        language,
        code: userCode,
        sourceCode: userCode,
        verdict: evaluation.verdict,
        testResults: evaluation.testResults,
        passedTests: evaluation.passedCount,
        passedCount: evaluation.passedCount,
        totalTests: evaluation.totalCount,
        totalCount: evaluation.totalCount,
        runtime: evaluation.runtimeMs,
        runtimeMs: evaluation.runtimeMs,
        memory: evaluation.memoryMb,
        isRun: false,
        isRunOnly: false,
        submittedAt: new Date()
      });

      await submission.save();

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
          passedCount: evaluation.passedCount,
          totalCount: evaluation.totalCount,
          runtimeMs: evaluation.runtimeMs,
          memoryMb: evaluation.memoryMb,
          testResults: sanitizedTestResults,
          submittedAt: submission.submittedAt
        }
      });
    } catch (error) {
      console.error('Error in submitProblem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error submitting problem' });
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

      return res.status(200).json({
        success: true,
        data: submissions
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

      const problem = await generateCodingProblem(topic, difficulty, languages);

      // Validate reference solution if provided
      if (problem.referenceSolution && problem.referenceSolution.javascript) {
        const testCases = [...(problem.sampleTestCases || []), ...(problem.hiddenTestCases || [])];
        if (testCases.length > 0) {
          try {
            // Run reference solution through judgeService
            const judgeResult = await judgeSolution(problem.referenceSolution.javascript, 'javascript', testCases, 2000, 256);
            if (judgeResult.verdict !== 'Accepted') {
              problem._validationWarning = 'AI Reference solution failed some generated test cases. Please review test cases carefully.';
              problem._judgeResult = judgeResult;
            } else {
              problem._validationWarning = null;
            }
          } catch (judgeErr) {
            console.error('Judge error during AI generation validation:', judgeErr);
            problem._validationWarning = 'Could not automatically validate the reference solution.';
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: problem
      });
    } catch (error) {
      console.error('Error generating coding problem:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to generate problem' });
    }
  }
};

module.exports = codingProblemController;
