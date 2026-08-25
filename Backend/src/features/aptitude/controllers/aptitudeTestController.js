const AptitudeTest = require('../models/AptitudeTest');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const { generateAptitudeQuestions } = require('../services/aptitudeGeminiService');

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'At least one question is required.';
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text || q.text.trim() === '') return `Question ${i + 1} is missing text.`;
    if (!Array.isArray(q.options) || q.options.length !== 4) return `Question ${i + 1} must have exactly 4 options.`;
    for (let j = 0; j < 4; j++) {
      if (!q.options[j] || q.options[j].trim() === '') return `Question ${i + 1}, Option ${String.fromCharCode(65 + j)} is empty.`;
    }
    if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) return `Question ${i + 1} has an invalid correct answer selected.`;
  }
  return null;
};

const aptitudeTestController = {
  // POST /api/aptitude - create test (company)
  createTest: async (req, res) => {
    try {
      const { title, linkedInterviewId, sections, totalTimeMinutes, passThreshold, showAnswersAfterSubmit, questions } = req.body;
      const companyId = req.user.id || req.user._id;

      if (!title) {
        return res.status(400).json({ success: false, error: 'Test title is required' });
      }

      // Filter out entirely empty dummy questions from the frontend
      const validQuestions = (questions || []).filter(q => q.text?.trim() !== '' || q.options?.some(o => o?.trim() !== ''));
      
      const validationError = validateQuestions(validQuestions);
      if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
      }

      const test = new AptitudeTest({
        companyId,
        title,
        linkedInterviewId: linkedInterviewId || null,
        sections: sections || [],
        totalTimeMinutes: totalTimeMinutes || 60,
        passThreshold: passThreshold !== undefined ? passThreshold : 60,
        showAnswersAfterSubmit: showAnswersAfterSubmit !== undefined ? showAnswersAfterSubmit : true,
        questions: validQuestions,
        assignedCandidates: []
      });

      await test.save();

      return res.status(201).json({
        success: true,
        data: test
      });
    } catch (error) {
      console.error('Error in createTest:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error creating test' });
    }
  },

  // GET /api/aptitude/company - list company's tests
  getCompanyTests: async (req, res) => {
    try {
      const companyId = req.user.id || req.user._id;
      const tests = await AptitudeTest.find({ companyId }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: tests
      });
    } catch (error) {
      console.error('Error in getCompanyTests:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching company tests' });
    }
  },

  // PUT /api/aptitude/:id - edit test (before it's assigned/started)
  editTest: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;

      const test = await AptitudeTest.findOne({ _id: id, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found or unauthorized' });
      }

      const { title, linkedInterviewId, sections, totalTimeMinutes, passThreshold, showAnswersAfterSubmit, questions } = req.body;
      if (title !== undefined) test.title = title;
      if (linkedInterviewId !== undefined) test.linkedInterviewId = linkedInterviewId;
      if (sections !== undefined) test.sections = sections;
      if (totalTimeMinutes !== undefined) test.totalTimeMinutes = totalTimeMinutes;
      if (passThreshold !== undefined) test.passThreshold = passThreshold;
      if (showAnswersAfterSubmit !== undefined) test.showAnswersAfterSubmit = showAnswersAfterSubmit;
      
      if (questions !== undefined) {
        // Filter out entirely empty dummy questions from the frontend
        const validQuestions = questions.filter(q => q.text?.trim() !== '' || q.options?.some(o => o?.trim() !== ''));
        const validationError = validateQuestions(validQuestions);
        if (validationError) {
          return res.status(400).json({ success: false, error: validationError });
        }
        test.questions = validQuestions;
      }

      await test.save();

      return res.status(200).json({
        success: true,
        data: test
      });
    } catch (error) {
      console.error('Error in editTest:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error editing test' });
    }
  },

  // POST /api/aptitude/:id/questions - add question(s)
  addQuestions: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;
      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, error: 'Questions array is required' });
      }

      const test = await AptitudeTest.findOne({ _id: id, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found or unauthorized' });
      }

      test.questions.push(...questions);
      await test.save();

      return res.status(200).json({
        success: true,
        data: test
      });
    } catch (error) {
      console.error('Error in addQuestions:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error adding questions' });
    }
  },

  // POST /api/aptitude/:id/assign - assign to candidates
  assignCandidates: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;
      const { candidates } = req.body; // Array of { email, candidateId, dueDate }

      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ success: false, error: 'Candidates array is required' });
      }

      const test = await AptitudeTest.findOne({ _id: id, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found or unauthorized' });
      }

      for (const cand of candidates) {
        const existingIndex = test.assignedCandidates.findIndex(
          c => c.email.toLowerCase() === cand.email.toLowerCase()
        );
        if (existingIndex === -1) {
          test.assignedCandidates.push({
            candidateId: cand.candidateId || null,
            email: cand.email,
            status: 'Not Started',
            dueDate: cand.dueDate || null
          });
        }
      }

      await test.save();

      return res.status(200).json({
        success: true,
        data: test
      });
    } catch (error) {
      console.error('Error in assignCandidates:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error assigning candidates' });
    }
  },

  // GET /api/aptitude/student - list tests assigned to logged-in student
  getStudentTests: async (req, res) => {
    try {
      const userEmail = req.user.email ? req.user.email.toLowerCase() : '';
      const userId = req.user.id || req.user._id;

      const tests = await AptitudeTest.find({
        $or: [
          { 'assignedCandidates.email': userEmail },
          { 'assignedCandidates.candidateId': userId }
        ]
      }).sort({ createdAt: -1 });

      // Strip answers from questions for students
      const sanitizedTests = tests.map(test => {
        const testObj = test.toObject();
        const studentAssignment = testObj.assignedCandidates.find(
          c => (c.email && c.email.toLowerCase() === userEmail) ||
               (c.candidateId && c.candidateId.toString() === userId.toString())
        ) || { status: 'Not Started' };

        testObj.studentStatus = studentAssignment.status;
        testObj.dueDate = studentAssignment.dueDate;
        testObj.questionsCount = testObj.questions ? testObj.questions.length : 0;
        delete testObj.questions;
        return testObj;
      });

      return res.status(200).json({
        success: true,
        data: sanitizedTests
      });
    } catch (error) {
      console.error('Error in getStudentTests:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching student tests' });
    }
  },

  // POST /api/aptitude/:id/start - start attempt, returns server-side deadline
  startAttempt: async (req, res) => {
    try {
      const { id } = req.params;
      const studentId = req.user.id || req.user._id;

      const test = await AptitudeTest.findById(id);
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
      }

      // Check if attempt already exists
      let attempt = await AptitudeAttempt.findOne({ testId: id, studentId, completed: false });

      if (!attempt) {
        attempt = new AptitudeAttempt({
          testId: id,
          studentId,
          userId: studentId,
          startedAt: new Date(),
          answers: test.questions.map((q, idx) => ({
            questionIndex: idx,
            selectedIndex: -1,
            markedForReview: false,
            timeSpentSeconds: 0
          }))
        });
        await attempt.save();

        // Update assignedCandidates status to 'In Progress'
        const candIndex = test.assignedCandidates.findIndex(
          c => (c.candidateId && c.candidateId.toString() === studentId.toString()) ||
               (c.email && req.user.email && c.email.toLowerCase() === req.user.email.toLowerCase())
        );
        if (candIndex !== -1) {
          test.assignedCandidates[candIndex].status = 'In Progress';
          await test.save();
        }
      }

      const totalSeconds = (test.totalTimeMinutes || 60) * 60;
      const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
      const deadline = new Date(new Date(attempt.startedAt).getTime() + totalSeconds * 1000);

      // Sanitize test questions for attempt (no correctIndex)
      const sanitizedQuestions = test.questions.map((q, idx) => ({
        index: idx,
        sectionName: q.sectionName || 'General',
        text: q.text,
        options: q.options,
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0.25,
        difficulty: q.difficulty || 'Medium'
      }));

      return res.status(200).json({
        success: true,
        data: {
          attemptId: attempt._id,
          testId: test._id,
          title: test.title,
          sections: test.sections,
          questions: sanitizedQuestions,
          answers: attempt.answers,
          startedAt: attempt.startedAt,
          remainingSeconds,
          deadline
        }
      });
    } catch (error) {
      console.error('Error in startAttempt:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error starting test attempt' });
    }
  },

  // PATCH /api/aptitude/attempt/:attemptId/answer - answer/save one question (autosave)
  answerQuestion: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { questionIndex, selectedIndex, markedForReview, timeSpentSeconds } = req.body;
      const studentId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId });
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized' });
      }

      if (attempt.completed) {
        return res.status(400).json({ success: false, error: 'Test attempt already completed' });
      }

      const answerIdx = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
      if (answerIdx !== -1) {
        if (selectedIndex !== undefined) attempt.answers[answerIdx].selectedIndex = selectedIndex;
        if (markedForReview !== undefined) attempt.answers[answerIdx].markedForReview = markedForReview;
        if (timeSpentSeconds !== undefined) attempt.answers[answerIdx].timeSpentSeconds += timeSpentSeconds;
      } else {
        attempt.answers.push({
          questionIndex,
          selectedIndex: selectedIndex !== undefined ? selectedIndex : -1,
          markedForReview: !!markedForReview,
          timeSpentSeconds: timeSpentSeconds || 0
        });
      }

      await attempt.save();

      return res.status(200).json({
        success: true,
        data: { message: 'Answer saved' }
      });
    } catch (error) {
      console.error('Error in answerQuestion:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error saving answer' });
    }
  },

  // POST /api/aptitude/attempt/:attemptId/submit - submit + trigger scoring
  submitAttempt: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { autoSubmitted, timeRemainingSnapshot } = req.body;
      const studentId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId });
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized' });
      }

      if (attempt.completed) {
        return res.status(400).json({ success: false, error: 'Attempt already submitted' });
      }

      const test = await AptitudeTest.findById(attempt.testId);
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
      }

      let totalScore = 0;
      let maxScore = 0;
      let correctCount = 0;
      const sectionScoresMap = {};

      test.questions.forEach((q, idx) => {
        const secName = q.sectionName || 'General';
        if (!sectionScoresMap[secName]) {
          sectionScoresMap[secName] = { sectionName: secName, correct: 0, incorrect: 0, score: 0 };
        }

        const qMarks = q.marks || 1;
        const qNeg = q.negativeMarks !== undefined ? q.negativeMarks : 0.25;
        maxScore += qMarks;

        const studentAns = attempt.answers.find(a => a.questionIndex === idx);
        if (studentAns && studentAns.selectedIndex !== undefined && studentAns.selectedIndex >= 0) {
          if (studentAns.selectedIndex === q.correctIndex) {
            correctCount++;
            totalScore += qMarks;
            sectionScoresMap[secName].correct++;
            sectionScoresMap[secName].score += qMarks;
            studentAns.isCorrect = true;
          } else {
            totalScore -= qNeg;
            sectionScoresMap[secName].incorrect++;
            sectionScoresMap[secName].score -= qNeg;
            studentAns.isCorrect = false;
          }
        }
      });

      attempt.totalScore = Number(totalScore.toFixed(2));
      attempt.score = attempt.totalScore;
      attempt.maxScore = maxScore;
      attempt.correctCount = correctCount;
      attempt.totalQuestions = test.questions.length;
      attempt.accuracy = test.questions.length > 0 ? Number(((correctCount / test.questions.length) * 100).toFixed(1)) : 0;
      attempt.sectionScores = Object.values(sectionScoresMap);
      attempt.completed = true;
      attempt.autoSubmitted = !!autoSubmitted;
      attempt.submittedAt = new Date();
      attempt.completedAt = new Date();
      if (timeRemainingSnapshot !== undefined) {
        attempt.timeRemainingSnapshot = timeRemainingSnapshot;
      }

      await attempt.save();

      // Update assignedCandidate status in AptitudeTest
      const candIndex = test.assignedCandidates.findIndex(
        c => (c.candidateId && c.candidateId.toString() === studentId.toString()) ||
             (c.email && req.user.email && c.email.toLowerCase() === req.user.email.toLowerCase())
      );
      if (candIndex !== -1) {
        test.assignedCandidates[candIndex].status = 'Completed';
        await test.save();
      }

      return res.status(200).json({
        success: true,
        data: attempt
      });
    } catch (error) {
      console.error('Error in submitAttempt:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error submitting attempt' });
    }
  },

  // GET /api/aptitude/attempt/:attemptId/result - get scored result
  getScoredResult: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findById(attemptId).populate('testId');
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      const test = attempt.testId;
      const isCompany = req.user.userType === 'company' && test.companyId.toString() === userId.toString();
      const isOwnerStudent = attempt.studentId.toString() === userId.toString();

      if (!isCompany && !isOwnerStudent) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this result' });
      }

      const passThreshold = test.passThreshold !== undefined ? test.passThreshold : 60;
      const percentage = attempt.maxScore > 0 ? Number(((attempt.totalScore / attempt.maxScore) * 100).toFixed(1)) : 0;
      const passed = percentage >= passThreshold;

      const resultPayload = {
        attemptId: attempt._id,
        testTitle: test.title,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage,
        passThreshold,
        passed,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        accuracy: attempt.accuracy,
        sectionScores: attempt.sectionScores,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        autoSubmitted: attempt.autoSubmitted
      };

      // Only include correct answers and explanation if showAnswersAfterSubmit is true or company
      if (test.showAnswersAfterSubmit || isCompany) {
        resultPayload.questions = test.questions.map((q, idx) => {
          const studentAns = attempt.answers.find(a => a.questionIndex === idx);
          return {
            index: idx,
            sectionName: q.sectionName,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            selectedIndex: studentAns ? studentAns.selectedIndex : -1,
            isCorrect: studentAns ? studentAns.isCorrect : false,
            marks: q.marks,
            negativeMarks: q.negativeMarks
          };
        });
      }

      return res.status(200).json({
        success: true,
        data: resultPayload
      });
    } catch (error) {
      console.error('Error in getScoredResult:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching scored result' });
    }
  },

  // GET /api/aptitude/:id/results - company: all candidates' results for a test
  getTestResults: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;

      const test = await AptitudeTest.findOne({ _id: id, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found or unauthorized' });
      }

      const attempts = await AptitudeAttempt.find({ testId: id, completed: true })
        .populate('studentId', 'name email university')
        .sort({ totalScore: -1 });

      const stats = {
        totalAssigned: test.assignedCandidates.length,
        totalCompleted: attempts.length,
        averageScore: attempts.length > 0 ? Number((attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / attempts.length).toFixed(2)) : 0,
        passCount: 0,
        failCount: 0,
        candidates: attempts.map(a => {
          const percentage = a.maxScore > 0 ? ((a.totalScore / a.maxScore) * 100) : 0;
          const passed = percentage >= (test.passThreshold || 60);
          if (passed) stats.passCount++; else stats.failCount++;
          return {
            attemptId: a._id,
            student: a.studentId,
            totalScore: a.totalScore,
            maxScore: a.maxScore,
            percentage: Number(percentage.toFixed(1)),
            passed,
            submittedAt: a.submittedAt,
            autoSubmitted: a.autoSubmitted,
            sectionScores: a.sectionScores
          };
        })
      };

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getTestResults:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error fetching test results' });
    }
  },

  // GET /api/aptitude/company/leaderboard - Get leaderboard of all students who took company tests
  getCompanyLeaderboard: async (req, res) => {
    try {
      const companyId = req.user.id || req.user._id;
      
      // 1. Get all tests created by this company
      const tests = await AptitudeTest.find({ companyId }).select('_id');
      const testIds = tests.map(t => t._id);

      if (testIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      // 2. Get all completed attempts for these tests
      const attempts = await AptitudeAttempt.find({
        testId: { $in: testIds },
        status: 'COMPLETED'
      }).populate('studentId', 'name email university');

      // 3. Aggregate scores by student
      const studentMap = {};
      
      attempts.forEach(attempt => {
        if (!attempt.studentId) return; // skip if user was deleted
        const studentIdStr = attempt.studentId._id.toString();
        
        if (!studentMap[studentIdStr]) {
          studentMap[studentIdStr] = {
            studentId: attempt.studentId._id,
            name: attempt.studentId.name || 'Anonymous Student',
            email: attempt.studentId.email || 'No email',
            university: attempt.studentId.university || 'General University',
            totalXP: 0,
            testsTaken: 0,
            totalCorrect: 0,
            totalQuestions: 0
          };
        }
        
        // Let's use the percentage * 10 as XP for aptitude
        let xp = 0;
        let correct = 0;
        let totalQ = 0;
        
        if (attempt.maxScore > 0) {
          const percentage = (attempt.totalScore / attempt.maxScore) * 100;
          xp = Math.round(percentage * 10);
        }
        
        // Count correct answers from sectionScores
        if (attempt.sectionScores && attempt.sectionScores.length > 0) {
           attempt.sectionScores.forEach(sec => {
             correct += sec.correctAnswers || 0;
             totalQ += sec.totalQuestions || 0;
           });
        }
        
        studentMap[studentIdStr].totalXP += xp;
        studentMap[studentIdStr].testsTaken += 1;
        studentMap[studentIdStr].totalCorrect += correct;
        studentMap[studentIdStr].totalQuestions += totalQ;
      });

      // 4. Convert to array and sort by XP descending
      let leaderboard = Object.values(studentMap);
      leaderboard.sort((a, b) => b.totalXP - a.totalXP);
      
      // 5. Assign ranks
      leaderboard = leaderboard.map((student, index) => ({
        ...student,
        rank: index + 1,
        accuracy: student.totalQuestions > 0 
          ? Math.round((student.totalCorrect / student.totalQuestions) * 100) 
          : 0
      }));

      return res.status(200).json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error fetching company leaderboard:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching leaderboard' });
    }
  },

  // POST /api/aptitude/generate - generate AI questions
  generateQuestions: async (req, res) => {
    try {
      const { topic, difficulty, count, jobContext } = req.body;
      const companyId = req.user.id || req.user._id;
      
      if (!topic || !difficulty || !count) {
        return res.status(400).json({ success: false, error: 'Topic, difficulty, and count are required' });
      }

      // Fetch the last 5 tests created by this company to avoid repetition
      const recentTests = await AptitudeTest.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('questions.text questions.subtopic');
      
      const previousQuestions = [];
      recentTests.forEach(test => {
        if (test.questions) {
          test.questions.forEach(q => {
            if (q.text) previousQuestions.push(q.text.substring(0, 100)); // Just a snippet is enough context
          });
        }
      });

      const contextString = previousQuestions.length > 0 ? JSON.stringify(previousQuestions.slice(0, 30)) : null;

      const questions = await generateAptitudeQuestions(topic, difficulty, count, jobContext, contextString);

      return res.status(200).json({
        success: true,
        data: questions
      });
    } catch (error) {
        console.error('Error generating questions:', error);
        const msg = (error && (error.message || error.toString())).toLowerCase();
        if (msg.includes('quota') || msg.includes('429') || msg.includes('too many requests') || msg.includes('generate_content_free_tier_requests')) {
          return res.status(503).json({ success: false, error: 'Gemini rate limit (15 requests/minute) exceeded. Please wait 60 seconds and try again.' });
        }
        return res.status(500).json({ success: false, error: error.message || 'Failed to generate questions' });
    }
  }
};

module.exports = aptitudeTestController;
