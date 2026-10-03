const { isViolationEvent } = require('../../assessment/utils/securityPolicy');
const AptitudeTest = require('../models/AptitudeTest');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const AssessmentSecurityEvent = require('../../assessment/models/AssessmentSecurityEvent');
const { generateAptitudeQuestions } = require('../services/aptitudeGeminiService');
const { resolveSlotState, validateAndSortSlots, computeAttemptDeadline, getRemainingSeconds, getSlotWindowInfo } = require('../utils/slotUtils');
const { rankAttemptsForTest } = require('../services/rankingService');
const { buildLeaderboardPdf } = require('../services/leaderboardPdfGenerator');

const normalizeViolationEvents = (violations = []) => {
  if (!Array.isArray(violations)) return [];

  return violations.map((violation) => {
    const type = violation?.type || 'window_blur';
    const message = violation?.message || 'Assessment security event detected.';
    const severity = violation?.severity || (type === 'FULLSCREEN_EXIT' || type === 'TAB_HIDDEN' || type === 'fullscreen_exit' || type === 'tab_switch' ? 'critical' : 'warning');

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
  record.fullscreenExitCount = normalized.filter(v => v.type === 'FULLSCREEN_EXIT' || v.type === 'fullscreen_exit').length;
  record.tabSwitchCount = normalized.filter(v => v.type === 'TAB_HIDDEN' || v.type === 'tab_switch').length;
  record.windowBlurCount = normalized.filter(v => v.type === 'WINDOW_BLUR' || v.type === 'window_blur').length;
  record.copyAttemptCount = normalized.filter(v => v.type === 'COPY_ATTEMPT' || v.type === 'copy').length;
  record.pasteAttemptCount = normalized.filter(v => v.type === 'PASTE_ATTEMPT' || v.type === 'paste').length;
  record.cutAttemptCount = normalized.filter(v => v.type === 'CUT_ATTEMPT' || v.type === 'cut').length;
  
  record.securitySummary = {
    totalViolations: normalized.length,
    highestSeverity,
    lastViolationAt: normalized[normalized.length - 1]?.timestamp || new Date()
  };
  record.submissionStatus = 'terminated_violation';
};

const validateQuestions = (questions, hasCoding) => {
  if (!Array.isArray(questions) || (questions.length === 0 && !hasCoding)) {
    return 'At least one question or coding problem is required.';
  }
  if (questions.length === 0) return null;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text || q.text.trim() === '') return `Question ${i + 1} is missing text.`;
    if (!Array.isArray(q.options) || q.options.length < 2) return `Question ${i + 1} must have at least 2 options.`;
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j].text || q.options[j].text.trim() === '') return `Question ${i + 1}, Option ${String.fromCharCode(65 + j)} is empty.`;
    }
    if (q.correctAnswer === undefined || q.correctAnswer === null || Number.isNaN(Number(q.correctAnswer)) || Number(q.correctAnswer) < 0 || Number(q.correctAnswer) >= q.options.length) return `Question ${i + 1} has an invalid correct answer selected.`;
  }
  return null;
};

const crypto = require('crypto');

const generateEntranceCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  } while (await AptitudeTest.exists({ entranceCode: code }));
  return code;
};

const aptitudeTestController = {
  // POST /api/aptitude/create - create new company test
  createTest: async (req, res) => {
    try {
      const { title, linkedInterviewId, sections, totalTimeMinutes, passThreshold, maxViolationCount, showAnswersAfterSubmit, questions, isPublished, schedulingMode, slots } = req.body;
      const companyId = req.user.id || req.user._id;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Test title is required' });
      }

      let parsedSlots = [];
      if (schedulingMode && schedulingMode !== 'always_open') {
        const validation = validateAndSortSlots(slots || []);
        if (!validation.isValid) {
          return res.status(400).json({ success: false, error: validation.error });
        }
        parsedSlots = validation.sortedSlots;
      }

      // Filter out entirely empty dummy questions from the frontend
      const validQuestions = (questions || []).filter(q => q.text?.trim() !== '' || (q.options && q.options.some(o => o.text?.trim() !== '')));
      
      const validationError = validateQuestions(validQuestions, req.body.codingProblems?.length > 0);
      if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
      }

      const entranceCode = await generateEntranceCode();

      const test = new AptitudeTest({
        companyId,
        title,
        linkedInterviewId: linkedInterviewId || null,
        sections: sections || [],
        totalTimeMinutes: totalTimeMinutes || 60,
        passThreshold: passThreshold !== undefined ? passThreshold : 60,
        maxViolationCount: maxViolationCount !== undefined ? Math.max(1, Number(maxViolationCount)) : 3,
        showAnswersAfterSubmit: showAnswersAfterSubmit !== undefined ? showAnswersAfterSubmit : true,
        questions: validQuestions,
        codingProblems: req.body.codingProblems || [],
        assignedCandidates: [],
        entranceCode,
        isPublished: isPublished !== undefined ? isPublished : true, // Default to true if they didn't have publish logic before
        schedulingMode: schedulingMode || 'always_open',
        slots: parsedSlots
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
      const tests = await AptitudeTest.find({ companyId, isActive: { $ne: false } }).sort({ createdAt: -1 });

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

      const { title, linkedInterviewId, sections, totalTimeMinutes, passThreshold, maxViolationCount, showAnswersAfterSubmit, questions, codingProblems, isPublished, schedulingMode, slots } = req.body;
      if (title !== undefined) test.title = title;
      if (linkedInterviewId !== undefined) test.linkedInterviewId = linkedInterviewId;
      if (sections !== undefined) test.sections = sections;
      if (totalTimeMinutes !== undefined) test.totalTimeMinutes = totalTimeMinutes;
      if (passThreshold !== undefined) test.passThreshold = passThreshold;
      if (maxViolationCount !== undefined) test.maxViolationCount = Math.max(1, Number(maxViolationCount));
      if (showAnswersAfterSubmit !== undefined) test.showAnswersAfterSubmit = showAnswersAfterSubmit;
      if (codingProblems !== undefined) test.codingProblems = codingProblems;
      if (isPublished !== undefined) test.isPublished = isPublished;

      if (schedulingMode !== undefined) {
        test.schedulingMode = schedulingMode;
      }
      
      if (slots !== undefined) {
        if (test.schedulingMode !== 'always_open') {
          const validation = validateAndSortSlots(slots);
          if (!validation.isValid) {
            return res.status(400).json({ success: false, error: validation.error });
          }
          test.slots = validation.sortedSlots;
        } else {
          test.slots = [];
        }
      }

      // If test doesn't have an entrance code (e.g. created before this feature), generate one now
      if (!test.entranceCode) {
        test.entranceCode = await generateEntranceCode();
      }
      
      if (questions !== undefined) {
        // Filter out entirely empty dummy questions from the frontend
        const validQuestions = questions.filter(q => q.text?.trim() !== '' || q.options?.some(o => o?.trim() !== ''));
        const validationError = validateQuestions(validQuestions, (codingProblems || test.codingProblems)?.length > 0);
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

  // PUT /api/aptitude/company/:id/slots
  manageSlots: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;
      const { schedulingMode, slots } = req.body;

      const test = await AptitudeTest.findOne({ _id: id, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found or unauthorized' });
      }

      if (schedulingMode !== undefined) {
        test.schedulingMode = schedulingMode;
      }

      if (slots !== undefined) {
        if (test.schedulingMode !== 'always_open') {
          const validation = validateAndSortSlots(slots);
          if (!validation.isValid) {
            return res.status(400).json({ success: false, error: validation.error });
          }
          test.slots = validation.sortedSlots;
        } else {
          test.slots = [];
        }
      }

      await test.save();
      return res.status(200).json({ success: true, data: test });
    } catch (error) {
      console.error('Error in manageSlots:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error managing slots' });
    }
  },

  // GET /api/aptitude/tests/:id/availability
  getTestAvailability: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user._id; // can be candidate

      const test = await AptitudeTest.findById(id);
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
      }

      if (!test.schedulingMode || test.schedulingMode === 'always_open') {
        return res.status(200).json({ success: true, data: { status: 'active' } });
      }

      // Identify eligible slot for candidate
      let eligibleSlot = null;
      for (const slot of test.slots) {
        // Explicit assignment check
        const isAssigned = slot.assignedCandidateIds && slot.assignedCandidateIds.some(cId => cId.toString() === userId.toString());
        if (isAssigned) {
          eligibleSlot = slot;
          break;
        }
      }

      // Fallback: capacity-based pick first slot that isn't closed/cancelled and has capacity
      if (!eligibleSlot) {
        for (const slot of test.slots) {
          const slotState = resolveSlotState(slot);
          if (slotState !== 'closed' && slotState !== 'cancelled') {
            if (slot.capacity === null || (slot.assignedCandidateIds && slot.assignedCandidateIds.length < slot.capacity)) {
              eligibleSlot = slot;
              break;
            }
          }
        }
      }

      if (!eligibleSlot) {
        return res.status(200).json({ success: true, data: { status: 'closed', message: 'No available slots found for you.' } });
      }

      const slotState = resolveSlotState(eligibleSlot);
      const now = new Date();
      let opensInSeconds = null;
      let closesInSeconds = null;

      if (slotState === 'scheduled') {
        opensInSeconds = Math.max(0, Math.floor((new Date(eligibleSlot.startTime) - now) / 1000));
      } else if (slotState === 'active') {
        closesInSeconds = Math.max(0, Math.floor((new Date(eligibleSlot.endTime) - now) / 1000));
      }

      return res.status(200).json({
        success: true,
        data: {
          status: slotState,
          slot: {
            label: eligibleSlot.label,
            startTime: eligibleSlot.startTime,
            endTime: eligibleSlot.endTime
          },
          opensInSeconds,
          closesInSeconds
        }
      });
    } catch (error) {
      console.error('Error in getTestAvailability:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error checking availability' });
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
            dueDate: cand.dueDate || null,
            accessGranted: true, // Explicitly granted by company
            joinedAt: new Date()
          });
        }
      }

      await AptitudeTest.updateOne(
        { _id: test._id },
        { $set: { assignedCandidates: test.assignedCandidates } }
      );

      return res.status(200).json({
        success: true,
        data: test
      });
    } catch (error) {
      console.error('Error in assignCandidates:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error assigning candidates' });
    }
  },

  // POST /api/aptitude/verify-code
  verifyEntranceCode: async (req, res) => {
    try {
      const { entranceCode } = req.body;
      const userId = req.user.id || req.user._id;

      if (!entranceCode || typeof entranceCode !== 'string' || !entranceCode.trim()) {
        return res.status(400).json({ success: false, error: 'Please enter a test code.' });
      }

      const code = entranceCode.trim().toUpperCase();

      const test = await AptitudeTest.findOne({ entranceCode: code });

      if (!test) {
        return res.status(404).json({ success: false, error: 'Invalid test code. Please check the code and try again.' });
      }

      if (test.isActive === false) {
        return res.status(403).json({ success: false, error: 'This test is no longer available.' });
      }

      if (test.isPublished === false) {
        return res.status(403).json({ success: false, error: 'This test is not currently available.' });
      }

      // Check if student has already attempted
      const existingAttempt = await AptitudeAttempt.findOne({ 
        studentId: userId, 
        testId: test._id 
      });

      let status = 'Not Started';
      let attemptId = null;

      // Always grant code-based access for this student on the test when they verify the code,
      // even if they already have an earlier attempt record from legacy data.
      const existingAssignment = test.assignedCandidates.find(
        c => c.candidateId?.toString() === userId.toString() || c.email?.toLowerCase() === req.user.email?.toLowerCase()
      );

      if (existingAssignment) {
        if (!existingAssignment.accessGranted) {
           existingAssignment.joinedViaCode = true;
        }
        existingAssignment.accessGranted = true;
        existingAssignment.joinedAt = existingAssignment.joinedAt || new Date();
        existingAssignment.email = existingAssignment.email || req.user.email;
        existingAssignment.candidateId = existingAssignment.candidateId || userId;
      } else {
        test.assignedCandidates.push({
          candidateId: userId,
          email: req.user.email,
          status: 'Not Started',
          dueDate: null,
          accessGranted: true,
          joinedViaCode: true,
          joinedAt: new Date()
        });
      }

      await AptitudeTest.updateOne(
        { _id: test._id },
        { $set: { assignedCandidates: test.assignedCandidates } }
      );

      if (existingAttempt) {
        status = existingAttempt.completed ? 'Completed' : 'In Progress';
        attemptId = existingAttempt._id;
      }

      // We need to return safe test info
      const safeTestInfo = {
        _id: test._id,
        title: test.title,
        companyId: test.companyId,
        totalTimeMinutes: test.totalTimeMinutes,
        questionsCount: test.questions ? test.questions.length : 0,
        codingProblemsCount: test.codingProblems ? test.codingProblems.length : 0,
        sections: test.sections,
        passThreshold: test.passThreshold,
        studentStatus: status,
        attemptId
      };

      return res.status(200).json({
        success: true,
        data: safeTestInfo
      });
    } catch (error) {
      console.error('Error in verifyEntranceCode:', error);
      return res.status(500).json({ success: false, error: 'Unable to verify the test code. Please try again.' });
    }
  },

  // GET /api/aptitude/student - list tests assigned to logged-in student
  getStudentTests: async (req, res) => {
    try {
      const userEmail = req.user.email ? req.user.email.toLowerCase() : '';
      const userId = req.user.id || req.user._id;

      const User = require('../../users/models/User');
      const student = await User.findById(userId);
      const hiddenIds = student?.hiddenAptitudeTests || [];

      // Find tests the student is explicitly assigned to OR has already attempted
      const attempts = await AptitudeAttempt.find({ studentId: userId }).sort({ createdAt: 1 });
      const attemptedTestIds = attempts.map(a => a.testId);
      
      const attemptMap = {};
      attempts.forEach(a => {
        attemptMap[a.testId.toString()] = a;
      });

      const tests = await AptitudeTest.find({
        isActive: { $ne: false },
        isPublished: true,
        _id: { $nin: hiddenIds }
      }).sort({ createdAt: -1 });

      let sanitizedTests = tests.reduce((acc, test) => {
        const testObj = test.toObject();
        const testIdStr = test._id.toString();
        
        let status = 'Not Started';
        let dueDate = null;

        // Check explicit assignment first
        const studentAssignment = testObj.assignedCandidates.find(
          c => (c.email && c.email.toLowerCase() === userEmail) ||
               (c.candidateId && c.candidateId.toString() === userId.toString())
        );
        
        if (studentAssignment) {
          status = studentAssignment.status;
          dueDate = studentAssignment.dueDate;
        }

        // If they have an actual attempt, override the status with the truth
        const actualAttempt = attemptMap[testIdStr];
        if (actualAttempt) {
          status = actualAttempt.completed ? 'Completed' : 'In Progress';
          testObj.attemptId = actualAttempt._id;
        }

        testObj.accessGranted = true;
        testObj.studentStatus = status;
        testObj.dueDate = dueDate;
        testObj.questionsCount = testObj.questions ? testObj.questions.length : 0;
        delete testObj.questions;
        acc.push(testObj);
        return acc;
      }, []);

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
      const { sessionId } = req.body || {};

      const test = await AptitudeTest.findById(id).populate('codingProblems');
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
      }

      if (test.isActive === false) {
        return res.status(403).json({ success: false, error: 'This test is no longer available.' });
      }

      if (test.isPublished === false) {
        return res.status(403).json({ success: false, error: 'This test is not currently available.' });
      }

      let eligibleSlot = null;
      if (test.schedulingMode && test.schedulingMode !== 'always_open') {
        for (const slot of test.slots) {
          const isAssigned = slot.assignedCandidateIds && slot.assignedCandidateIds.some(cId => cId.toString() === studentId.toString());
          if (isAssigned) {
            eligibleSlot = slot;
            break;
          }
        }
        if (!eligibleSlot) {
          for (const slot of test.slots) {
            const slotState = resolveSlotState(slot, new Date());
            if (slotState !== 'closed' && slotState !== 'cancelled') {
              if (slot.capacity === null || (slot.assignedCandidateIds && slot.assignedCandidateIds.length < slot.capacity)) {
                eligibleSlot = slot;
                break;
              }
            }
          }
        }

        if (!eligibleSlot) {
          return res.status(403).json({ success: false, error: 'SLOT_NOT_ACTIVE', message: 'No available slots found for you.' });
        }

        const slotState = resolveSlotState(eligibleSlot, new Date());
        if (slotState === 'scheduled') {
          return res.status(403).json({ success: false, error: 'SLOT_NOT_ACTIVE', message: 'This slot has not opened yet.', slotState, opensInSeconds: getSlotWindowInfo(eligibleSlot, new Date()).opensInSeconds });
        }
        if (slotState === 'closed') {
          return res.status(403).json({ success: false, error: 'SLOT_NOT_ACTIVE', message: 'This slot has expired.', slotState });
        }
      }

      let testObj = test.toObject();

      if (testObj.codingProblems) {
        testObj.codingProblems = testObj.codingProblems.map(cp => {
          if (cp && cp.testCases) {
            cp.testCases = cp.testCases.filter(tc => !tc.isHidden);
          }
          return cp;
        });
      }

      let attempt = await AptitudeAttempt.findOne({ testId: id, studentId, completed: false }).sort({ createdAt: -1 });
      if (attempt && !attempt.attemptDeadline) {
        attempt.attemptDeadline = computeAttemptDeadline(
          attempt.startedAt,
          (test.totalTimeMinutes || 60) * 60,
          attempt.slotEndTime || eligibleSlot?.endTime || null
        );
        attempt.maxViolationCount = test.maxViolationCount || 3;
        await attempt.save();
      }
      if (attempt && new Date() > new Date(attempt.attemptDeadline)) {
        const submissionResponse = {
          status(code) { this.statusCode = code; return this; },
          json(payload) { this.payload = payload; return this; }
        };
        await aptitudeTestController.submitAttempt({
          params: { attemptId: attempt._id },
          body: { autoSubmitted: true },
          internalPolicySubmit: true,
          user: req.user
        }, submissionResponse);
        attempt = null;
      }

      if (attempt && attempt.activeSessionId && sessionId && attempt.activeSessionId !== sessionId) {
        const response = {
          status(code) { this.statusCode = code; return this; },
          json(payload) { this.payload = payload; return this; }
        };
        await require('../../assessment/controllers/assessmentSecurityController').logEvent({
          internalPolicyEvent: true,
          headers: {},
          body: {
            assessmentType: 'aptitude',
            assessmentId: test._id,
            attemptId: attempt._id,
            sessionId,
            eventType: 'MULTIPLE_SESSION',
            message: 'A second browser session attempted to resume this assessment.',
            severity: 'critical',
            eventId: `multiple-session-${attempt._id}-${sessionId}`
          },
          user: req.user
        }, response);
        return res.status(409).json({ success: false, error: 'MULTIPLE_SESSION', message: 'This attempt is active in another browser session.' });
      }

      if (attempt) {
        attempt.activeSessionId = sessionId || attempt.activeSessionId;
        attempt.lastHeartbeatAt = new Date();
        attempt.maxViolationCount = attempt.maxViolationCount || test.maxViolationCount || 3;
        if (!attempt.hmacSecret) attempt.hmacSecret = crypto.randomBytes(32).toString('hex');
        if (!attempt.questionOrder?.length && test.questions.length) {
          attempt.questionOrder = test.questions.map((_, index) => index).sort(() => Math.random() - 0.5);
          attempt.optionOrders = test.questions.map(question => question.options.map((_, index) => index).sort(() => Math.random() - 0.5));
        }
        await attempt.save();
      }

      if (!attempt) {
        const hasAnyAttempt = await AptitudeAttempt.exists({ testId: id, studentId });
        const isAssigned = test.assignedCandidates.find(
          c => c.accessGranted === true && (
            c.candidateId?.toString() === studentId.toString() ||
            (c.email && req.user.email && c.email.toLowerCase() === req.user.email.toLowerCase())
          )
        );

        if (hasAnyAttempt && !test.allowMultipleAttempts) {
          const lastAttempt = await AptitudeAttempt.findOne({ testId: id, studentId }).sort({ createdAt: -1 }).lean();
          if (lastAttempt && lastAttempt.completed) {
            return res.status(403).json({ success: false, error: 'SECOND_ATTEMPT_NOT_ALLOWED', message: 'A second attempt is not allowed for this slot.' });
          }
        }

        if (!hasAnyAttempt && !isAssigned && !test.isPublished) {
          return res.status(403).json({ success: false, error: 'Unauthorized to start this test. Please join using the entrance code first.' });
        }

        const startedAt = new Date();
        const totalSeconds = (test.totalTimeMinutes || 60) * 60;
        const attemptDeadline = computeAttemptDeadline(startedAt, totalSeconds, eligibleSlot?.endTime || null);
        const questionOrder = test.questions.map((_, index) => index).sort(() => Math.random() - 0.5);
        const optionOrders = test.questions.map(question => question.options.map((_, index) => index).sort(() => Math.random() - 0.5));

        attempt = new AptitudeAttempt({
          testId: id,
          studentId,
          userId: studentId,
          startedAt,
          attemptDeadline,
          slotId: eligibleSlot?._id || null,
          slotStartTime: eligibleSlot?.startTime || null,
          slotEndTime: eligibleSlot?.endTime || null,
          serverNowAtStart: startedAt,
          activeSessionId: sessionId || null,
          lastHeartbeatAt: startedAt,
          maxViolationCount: test.maxViolationCount || 3,
          hmacSecret: crypto.randomBytes(32).toString('hex'),
          questionOrder,
          optionOrders,
          answers: questionOrder.map((_, idx) => ({
            questionIndex: idx,
            selectedAnswer: null,
            markedForReview: false,
            timeSpentSeconds: 0
          })),
          codingAnswers: (testObj.codingProblems || []).map(cp => ({
            problemId: cp._id,
            code: cp.starterCode?.javascript || '',
            language: 'javascript',
            status: 'Not Attempted',
            score: 0,
            passedTests: 0,
            totalTests: 0
          }))
        });
        await attempt.save();

        const candIndex = test.assignedCandidates.findIndex(
          c => (c.candidateId && c.candidateId.toString() === studentId.toString()) ||
               (c.email && req.user.email && c.email.toLowerCase() === req.user.email.toLowerCase())
        );
        if (candIndex !== -1) {
          test.assignedCandidates[candIndex].status = 'In Progress';
          await test.save();
        }
      }

      const serverNow = new Date();
      const remainingSeconds = getRemainingSeconds(attempt.attemptDeadline || attempt.startedAt, serverNow);

      const questionOrder = attempt.questionOrder?.length
        ? attempt.questionOrder
        : testObj.questions.map((_, index) => index);
      const sanitizedQuestions = questionOrder.map((sourceIndex, displayIndex) => {
        const q = testObj.questions[sourceIndex];
        const optionOrder = attempt.optionOrders?.[sourceIndex]?.length
          ? attempt.optionOrders[sourceIndex]
          : q.options.map((_, index) => index);
        return {
        index: displayIndex,
        sectionName: q.sectionName || 'General',
        text: q.text,
        imageUrl: q.imageUrl,
        options: optionOrder.map(optionIndex => ({
          ...q.options[optionIndex],
          originalIndex: q.options[optionIndex]?.originalIndex ?? optionIndex
        })),
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0.25,
        difficulty: q.difficulty || 'Medium'
      };
      });

      return res.status(200).json({
        success: true,
        data: {
          attemptId: attempt._id,
          testId: test._id,
          title: test.title,
          sections: testObj.sections,
          questions: sanitizedQuestions,
          codingProblems: testObj.codingProblems,
          answers: attempt.answers,
          codingAnswers: attempt.codingAnswers,
          startedAt: attempt.startedAt,
          attemptDeadline: attempt.attemptDeadline,
          serverNow,
          remainingSeconds,
          violationCount: attempt.securitySummary?.totalViolations || 0,
          maxViolationCount: attempt.maxViolationCount || test.maxViolationCount || 3,
          hmacSecret: attempt.hmacSecret,
          sessionId: attempt.activeSessionId,
          deadline: attempt.attemptDeadline || new Date(new Date(attempt.startedAt).getTime() + (test.totalTimeMinutes || 60) * 60 * 1000)
        }
      });
    } catch (error) {
      console.error('Error in startAttempt:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error starting test attempt' });
    }
  },

  answerQuestion: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { questionIndex, selectedAnswer, markedForReview, timeSpentSeconds } = req.body;
      const studentId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId });
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized' });
      }

      if (attempt.completed) {
        return res.status(400).json({ success: false, error: 'Test attempt already completed' });
      }

      const deadline = attempt.attemptDeadline || computeAttemptDeadline(attempt.startedAt, 60 * 60, attempt.slotEndTime || null);
      const now = new Date();
      const maxViolationCount = attempt.maxViolationCount || 3;
      if ((attempt.securitySummary?.totalViolations || 0) >= maxViolationCount) {
        return res.status(403).json({ success: false, error: 'MAX_VIOLATIONS_REACHED', message: 'This attempt has reached its violation limit.' });
      }
      if (attempt.activeSessionId && req.body.sessionId && attempt.activeSessionId !== req.body.sessionId) {
        return res.status(409).json({ success: false, error: 'MULTIPLE_SESSION', message: 'This attempt is active in another browser session.' });
      }
      if (now.getTime() > new Date(deadline).getTime() + 5000) {
        return res.status(403).json({ success: false, error: 'TEST_EXPIRED', message: 'The test deadline has passed.' });
      }

      const answerIdx = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
      if (answerIdx !== -1) {
        if (selectedAnswer !== undefined) attempt.answers[answerIdx].selectedAnswer = selectedAnswer;
        if (markedForReview !== undefined) attempt.answers[answerIdx].markedForReview = markedForReview;
        if (timeSpentSeconds !== undefined) attempt.answers[answerIdx].timeSpentSeconds += timeSpentSeconds;
      } else {
        attempt.answers.push({
          questionIndex,
          selectedAnswer: selectedAnswer !== undefined ? selectedAnswer : null,
          markedForReview: !!markedForReview,
          timeSpentSeconds: timeSpentSeconds || 0
        });
      }

      attempt.lastHeartbeatAt = now;
      await attempt.save();

      return res.status(200).json({
        success: true,
        data: { message: 'Answer saved', remainingSeconds: getRemainingSeconds(deadline, now) }
      });
    } catch (error) {
      console.error('Error in answerQuestion:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error saving answer' });
    }
  },

  saveAnswers: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const studentId = req.user.id || req.user._id;
      const { answers = [], sessionId } = req.body || {};
      if (!Array.isArray(answers) || answers.length > 500) {
        return res.status(400).json({ success: false, error: 'Answers must be an array of at most 500 items.' });
      }

      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId });
      if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized' });
      if (attempt.completed) return res.status(400).json({ success: false, error: 'Test attempt already completed' });
      if (attempt.activeSessionId && sessionId && attempt.activeSessionId !== sessionId) {
        return res.status(409).json({ success: false, error: 'MULTIPLE_SESSION', message: 'This attempt is active in another browser session.' });
      }
      const now = new Date();
      const deadline = attempt.attemptDeadline || computeAttemptDeadline(attempt.startedAt, 60 * 60, attempt.slotEndTime || null);
      if (now.getTime() > new Date(deadline).getTime() + 5000) {
        return res.status(403).json({ success: false, error: 'TEST_EXPIRED', message: 'The test deadline has passed.' });
      }
      if ((attempt.securitySummary?.totalViolations || 0) >= (attempt.maxViolationCount || 3)) {
        return res.status(403).json({ success: false, error: 'MAX_VIOLATIONS_REACHED' });
      }

      for (const answer of answers) {
        const questionIndex = Number(answer?.questionIndex);
        if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= attempt.answers.length) continue;
        const stored = attempt.answers.find(item => item.questionIndex === questionIndex);
        if (!stored) continue;
        if (answer.selectedAnswer === null || Number.isInteger(Number(answer.selectedAnswer))) {
          stored.selectedAnswer = answer.selectedAnswer === null ? null : Number(answer.selectedAnswer);
        }
        if (typeof answer.markedForReview === 'boolean') stored.markedForReview = answer.markedForReview;
        if (Number.isFinite(Number(answer.timeSpentSeconds)) && Number(answer.timeSpentSeconds) >= 0) {
          stored.timeSpentSeconds = Math.max(stored.timeSpentSeconds || 0, Number(answer.timeSpentSeconds));
        }
      }
      attempt.lastHeartbeatAt = now;
      await attempt.save();
      return res.status(200).json({
        success: true,
        data: { message: 'Answers saved', serverNow: now, remainingSeconds: getRemainingSeconds(deadline, now) }
      });
    } catch (error) {
      console.error('Error saving aptitude answers:', error);
      return res.status(500).json({ success: false, error: 'Server error saving answers' });
    }
  },

  // POST /api/aptitude/attempt/:attemptId/submit - submit + trigger scoring
  submitAttempt: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { autoSubmitted, timeRemainingSnapshot, violations } = req.body;
      const studentId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId });
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized' });
      }

      const deadline = attempt.attemptDeadline || computeAttemptDeadline(attempt.startedAt, 60 * 60, attempt.slotEndTime || null);
      const now = new Date();
      const graceWindowMs = 5000;
      const expiredByDeadline = now.getTime() > new Date(deadline).getTime() + graceWindowMs;

      if (attempt.completed) {
        const existingResult = await aptitudeTestController.getScoredResult({
          params: { attemptId },
          user: req.user
        }, { status: () => ({ json: (payload) => payload }) });
        return res.status(200).json({
          success: true,
          data: existingResult.data,
          idempotent: true,
          message: 'Attempt already submitted. Returning the existing result.'
        });
      }

      if (expiredByDeadline && !req.internalPolicySubmit) {
        return res.status(403).json({ success: false, error: 'TEST_EXPIRED', message: 'This assessment has expired and cannot be submitted late.' });
      }

      const persistedEvents = await AssessmentSecurityEvent.find({ assessmentType: 'aptitude', attemptId: attempt._id }).sort({ createdAt: 1 }).lean();
      
      // Save any frontend violations that haven't been persisted yet
      if (Array.isArray(violations) && violations.length > 0) {
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
              userId: studentId,
              studentId,
              assessmentType: 'aptitude',
              assessmentId: attempt.testId,
              attemptId: attempt._id,
              eventType: v.type || v.eventType || 'WINDOW_BLUR',
              message: v.message,
              severity: v.severity || 'warning',
              eventId: v.eventId || `aptitude:${attempt._id}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
              createdAt: v.timestamp || new Date()
            }));
            
            try {
              await AssessmentSecurityEvent.insertMany(docs, { ordered: false });
            } catch (err) {
              console.warn('Non-fatal error inserting new security events during submit:', err.message);
            }
            
            // Re-fetch to include the newly inserted events
            const updatedEvents = await AssessmentSecurityEvent.find({ assessmentType: 'aptitude', attemptId: attempt._id }).sort({ createdAt: 1 }).lean();
            persistedEvents.length = 0;
            persistedEvents.push(...updatedEvents);
          }
      }

      const allViolations = persistedEvents.map((event) => ({
        type: event.eventType,
        message: event.message,
        severity: event.severity,
        timestamp: event.createdAt,
        metadata: event.metadata || {}
      }));

      if (allViolations.length > 0) {
        applyViolationSummary(attempt, allViolations);
      }

      const test = await AptitudeTest.findById(attempt.testId);
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
      }

      let totalScore = 0;
      let maxScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let attemptedCount = 0;
      const sectionScoresMap = {};

      test.questions.forEach((q, idx) => {
        const secName = q.sectionName || 'General';
        if (!sectionScoresMap[secName]) {
          sectionScoresMap[secName] = { sectionName: secName, correct: 0, incorrect: 0, score: 0 };
        }

        const qMarks = q.marks || 1;
        const qNeg = q.negativeMarks !== undefined ? q.negativeMarks : 0.25;
        maxScore += qMarks;

        const displayIndex = attempt.questionOrder?.length ? attempt.questionOrder.indexOf(idx) : idx;
        const studentAns = attempt.answers.find(a => a.questionIndex === displayIndex);
        if (studentAns && studentAns.selectedAnswer !== undefined && studentAns.selectedAnswer !== null) {
          attemptedCount++;
          const selectedIdx = Number(studentAns.selectedAnswer);
          const correctIdx = Number(q.correctAnswer);
          if (selectedIdx === correctIdx) {
            correctCount++;
            totalScore += qMarks;
            sectionScoresMap[secName].correct++;
            sectionScoresMap[secName].score += qMarks;
            studentAns.isCorrect = true;
          } else {
            incorrectCount++;
            totalScore -= qNeg;
            sectionScoresMap[secName].incorrect++;
            sectionScoresMap[secName].score -= qNeg;
            studentAns.isCorrect = false;
          }
        }
      });

      let finalCodingScore = 0;
      let maxCodingScore = 0;
      if (attempt.codingAnswers && attempt.codingAnswers.length > 0) {
        attempt.codingAnswers.forEach(ca => {
          finalCodingScore += (ca.score || 0);
          maxCodingScore += 100;
        });
      }

      attempt.codingScore = Number(finalCodingScore.toFixed(2));
      attempt.totalScore = Number(totalScore.toFixed(2)) + attempt.codingScore;
      attempt.score = attempt.totalScore;
      attempt.maxScore = maxScore + maxCodingScore;
      
      attempt.correctCount = correctCount;
      attempt.incorrectCount = incorrectCount;
      attempt.attemptedCount = attemptedCount;
      attempt.totalQuestions = test.questions.length;
      attempt.accuracy = attemptedCount > 0 ? Number(((correctCount / attemptedCount) * 100).toFixed(1)) : 0;
      attempt.sectionScores = Object.values(sectionScoresMap);
      attempt.completed = true;
      attempt.autoSubmitted = !!autoSubmitted;
      attempt.submittedAt = new Date();
      attempt.completedAt = new Date();
      attempt.submissionStatus = autoSubmitted ? 'auto_submitted' : 'submitted';
      
      // Calculate Suspicion Score
      let score = 0;
      allViolations.forEach(v => {
        const type = String(v.type).toUpperCase();
        if (['FULLSCREEN_EXIT', 'TAB_HIDDEN', 'TAB_SWITCH'].includes(type)) score += 15;
        else if (type === 'WINDOW_BLUR') score += 10;
        else if (type === 'NO_FACE') score += 20;
        else if (type === 'MULTIPLE_FACES') score += 30;
        else if (type === 'LOOKING_AWAY') score += 10;
        else if (type === 'FACE_MISMATCH') score += 40;
        else if (type === 'OFFLINE_PERIOD') score += 20;
        else if (type === 'CAMERA_STOPPED') score += 40;
        else score += 5; // default fallback
      });
      attempt.suspicionScore = Math.min(100, score);
      attempt.suspicious = attempt.suspicionScore >= 30;
      
      attempt.timeRemainingSnapshot = getRemainingSeconds(deadline, now);

      await attempt.save();

      // Update assignedCandidate status in AptitudeTest
      const candIndex = test.assignedCandidates.findIndex(
        c => (c.candidateId && c.candidateId.toString() === studentId.toString()) ||
             (c.email && req.user.email && c.email.toLowerCase() === req.user.email.toLowerCase())
      );
      if (candIndex !== -1) {
        test.assignedCandidates[candIndex].status = 'Completed';
        await AptitudeTest.updateOne(
          { _id: test._id },
          { $set: { assignedCandidates: test.assignedCandidates } }
        );
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

      let attempt = await AptitudeAttempt.findById(attemptId).populate('testId');
      if (!attempt) {
        // Fallback: frontend might pass testId instead of attemptId
        attempt = await AptitudeAttempt.findOne({ testId: attemptId, studentId: userId }).populate('testId');
      }

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
      const totalViolations = attempt.securitySummary?.totalViolations ?? attempt.violationEvents?.length ?? 0;
      const cleanlinessScore = Math.max(0, Math.min(100, 100 - (totalViolations * 15)));

      const resultPayload = {
        attemptId: attempt._id,
        testTitle: test.title,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage,
        passThreshold,
        passed,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        attemptedCount: attempt.attemptedCount,
        totalQuestions: attempt.totalQuestions,
        accuracy: attempt.accuracy,
        sectionScores: attempt.sectionScores,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        autoSubmitted: attempt.autoSubmitted,
        submissionStatus: attempt.submissionStatus || 'submitted',
        violationsCount: totalViolations,
        cleanlinessScore,
        suspicionScore: attempt.suspicionScore || 0,
        referencePhotoUrl: attempt.referencePhotoUrl,
        securitySummary: attempt.securitySummary || {
          totalViolations,
          highestSeverity: 'info',
          lastViolationAt: null
        },
        violationEvents: attempt.violationEvents || []
      };

      // Only include correct answers and explanation if showAnswersAfterSubmit is true or company
      if (test.showAnswersAfterSubmit || isCompany) {
        resultPayload.questions = test.questions.map((q, idx) => {
          const displayIndex = attempt.questionOrder?.length ? attempt.questionOrder.indexOf(idx) : idx;
          const studentAns = attempt.answers.find(a => a.questionIndex === displayIndex);
          return {
            index: idx,
            sectionName: q.sectionName,
            text: q.text,
            options: q.options,
            correctIndex: q.correctAnswer !== undefined ? q.correctAnswer : q.correctIndex,
            selectedAnswer: studentAns ? studentAns.selectedAnswer : -1,
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

  // POST /api/aptitude/attempt/:attemptId/false-alarm
  markFalseAlarm: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const companyId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findById(attemptId).populate('testId');
      if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });
      
      const test = attempt.testId;
      if (test.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      attempt.suspicious = false;
      attempt.suspicionScore = 0;
      if (!attempt.securitySummary) attempt.securitySummary = {};
      attempt.securitySummary.totalViolations = 0;
      await attempt.save();

      return res.status(200).json({ success: true, message: 'Attempt marked as false alarm' });
    } catch (error) {
      console.error('Error in markFalseAlarm:', error);
      return res.status(500).json({ success: false, error: 'Server error marking false alarm' });
    }
  },

  // GET /api/aptitude/attempt/:attemptId/pdf
  generatePdfReport: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user.id || req.user._id;

      const attempt = await AptitudeAttempt.findById(attemptId).populate('studentId', 'name email');
      if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });
      
      const test = await AptitudeTest.findById(attempt.testId);
      if (!test) return res.status(404).json({ success: false, error: 'Test not found' });

      // Verify access: either it's the student themselves, or the company who owns the test
      if (attempt.studentId._id.toString() !== userId.toString() && test.companyId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this report' });
      }

      if (!attempt.completed) {
        return res.status(400).json({ success: false, error: 'Assessment is not completed yet' });
      }

      const passThreshold = test.passThreshold !== undefined ? test.passThreshold : 60;
      const percentage = attempt.maxScore > 0 ? Number(((attempt.totalScore / attempt.maxScore) * 100).toFixed(1)) : 0;
      const passed = percentage >= passThreshold;

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Assessment_Report_${attemptId}.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('QUICKHIRE AI', { align: 'center' });
      doc.fontSize(16).text('ASSESSMENT REPORT', { align: 'center' });
      doc.moveDown(2);

      // Candidate Info
      doc.fontSize(14).font('Helvetica-Bold').text('Candidate Information');
      doc.fontSize(12).font('Helvetica').text(`Name: ${attempt.studentId.name || 'N/A'}`);
      doc.text(`Email: ${attempt.studentId.email || 'N/A'}`);
      doc.moveDown();

      // Test Info
      doc.fontSize(14).font('Helvetica-Bold').text('Test Information');
      doc.fontSize(12).font('Helvetica').text(`Test Title: ${test.title}`);
      doc.text(`Test Code: ${test.entranceCode || 'N/A'}`);
      doc.text(`Submitted At: ${new Date(attempt.submittedAt).toLocaleString()}`);
      doc.moveDown();

      // Overall Score
      doc.fontSize(14).font('Helvetica-Bold').text('Overall Performance');
      doc.fontSize(12).font('Helvetica').text(`Total Score: ${attempt.totalScore} / ${attempt.maxScore}`);
      doc.text(`Percentage: ${percentage}%`);
      doc.text(`Status: ${passed ? 'PASSED' : 'FAILED'} (Threshold: ${passThreshold}%)`);
      doc.moveDown();

      // Aptitude Performance
      if (test.questions && test.questions.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Aptitude Performance');
        doc.fontSize(12).font('Helvetica').text(`Total Questions: ${attempt.totalQuestions}`);
        doc.text(`Attempted: ${attempt.attemptedCount}`);
        doc.text(`Correct: ${attempt.correctCount}`);
        doc.text(`Incorrect: ${attempt.incorrectCount}`);
        doc.text(`Accuracy: ${attempt.accuracy}%`);
        doc.moveDown();
      }

      // Coding Performance
      if (attempt.codingAnswers && attempt.codingAnswers.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Coding Performance');
        attempt.codingAnswers.forEach((ca, i) => {
          doc.fontSize(12).font('Helvetica').text(`Problem ${i + 1} Score: ${ca.score || 0} / 100`);
          if (ca.verdict) {
            doc.text(`Verdict: ${ca.verdict} (${ca.passedTests || 0}/${ca.totalTests || 0} cases passed)`);
          }
          doc.moveDown(0.5);
        });
      }

      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: 'Failed to generate PDF' });
      }
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

      const passCount = attempts.filter(a => {
        const percentage = a.maxScore > 0 ? ((a.totalScore / a.maxScore) * 100) : 0;
        return percentage >= (test.passThreshold || 60);
      }).length;

      const candidateSummaries = await Promise.all(attempts.map(async (a) => {
        const percentage = a.maxScore > 0 ? ((a.totalScore / a.maxScore) * 100) : 0;
        const passed = percentage >= (test.passThreshold || 60);
        const persistedViolations = await AssessmentSecurityEvent.find({ assessmentType: 'aptitude', attemptId: a._id }).sort({ createdAt: 1 }).lean();
        const securityTimeline = (persistedViolations || []).map((event) => ({
          id: event._id,
          type: event.eventType,
          message: event.message,
          severity: event.severity,
          timestamp: event.createdAt,
          metadata: event.metadata || {},
          snapshotUrl: event.snapshotUrl ? `/assessment/snapshots/${event._id}` : null
        }));
        const violationEvents = securityTimeline.filter(event => isViolationEvent(event.type));
        const violationsCount = Number(a.securitySummary?.totalViolations ?? violationEvents.length);
        const cleanlinessScore = Math.max(0, Math.min(100, 100 - (violationsCount * 15)));
        const proctoringStatus = violationsCount === 0 ? 'CLEAN' : (violationsCount <= 2 ? 'FLAGGED' : 'REVIEW_REQUIRED');

        return {
          attemptId: a._id,
          student: a.studentId,
          totalScore: a.totalScore,
          maxScore: a.maxScore,
          percentage: Number(percentage.toFixed(1)),
          passed,
          submittedAt: a.submittedAt,
          autoSubmitted: a.autoSubmitted,
                    suspicious: !!a.suspicious || violationsCount > 0,
          sectionScores: a.sectionScores,
          violationsCount,
          cleanlinessScore,
          suspicionScore: a.suspicionScore || 0,
          proctoringStatus,
          referencePhotoUrl: a.referencePhotoUrl,
          idCardPhotoUrl: a.idCardPhotoUrl,
          fullscreenExitCount: a.fullscreenExitCount || violationEvents.filter(e => e.type === 'FULLSCREEN_EXIT' || e.type === 'fullscreen_exit').length,
          tabSwitchCount: a.tabSwitchCount || violationEvents.filter(e => e.type === 'TAB_HIDDEN' || e.type === 'tab_switch').length,
          windowBlurCount: a.windowBlurCount || violationEvents.filter(e => e.type === 'WINDOW_BLUR' || e.type === 'window_blur').length,
          securitySummary: a.securitySummary || {
            totalViolations: violationsCount,
            highestSeverity: violationEvents[0]?.severity || 'info',
            lastViolationAt: violationEvents[violationEvents.length - 1]?.timestamp || null
          },
          violationEvents,
          securityTimeline
        };
      }));

      const stats = {
        totalAssigned: test.assignedCandidates.length,
        totalCompleted: attempts.length,
        averageScore: attempts.length > 0 ? Number((attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / attempts.length).toFixed(2)) : 0,
        passCount,
        failCount: attempts.length - passCount,
        candidates: candidateSummaries
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

  // DELETE /api/aptitude/:id - Delete or archive a test
  deleteTest: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.id || req.user._id;

      const test = await AptitudeTest.findOne({ _id: id, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found or unauthorized' });
      }

      // Check if there are completed attempts.
      const attemptsCount = await AptitudeAttempt.countDocuments({ testId: id });
      
      if (attemptsCount > 0) {
        // Soft delete / archive
        // Soft delete / archive without triggering full document validation on legacy data
        await AptitudeTest.updateOne(
          { _id: id },
          { $set: { isActive: false, status: 'Archived' } }
        );
        return res.status(200).json({ success: true, message: 'Test archived successfully because attempts exist' });
      } else {
        // Hard delete using the raw collection so legacy documents with outdated nested
        // question data can still be removed without Mongoose schema validation blocking it.
        const deleteResult = await AptitudeTest.collection.deleteOne({ _id: id });

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ success: false, error: 'Test not found or already deleted' });
        }

        return res.status(200).json({ success: true, message: 'Test deleted permanently' });
      }

    } catch (error) {
      console.error('Error deleting test:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error deleting test' });
    }
  },

  // POST /api/aptitude/:id/hide - Student hides test from their list
  hideTest: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user._id;
      const User = require('../../users/models/User');

      await User.updateOne(
        { _id: userId },
        { $addToSet: { hiddenAptitudeTests: id } }
      );

      return res.status(200).json({ success: true, message: 'Test removed from your list' });
    } catch (error) {
      console.error('Error hiding test:', error);
      return res.status(500).json({ success: false, error: error.message || 'Server error hiding test' });
    }
  },

  // GET /api/aptitude/company/leaderboard - Get leaderboard of all students who took company tests
  getCompanyLeaderboard: async (req, res) => {
    try {
      const companyId = req.user.id || req.user._id;
      
      const { testId } = req.query;

      // 1. Get all tests created by this company (or a specific test)
      let testQuery = { companyId };
      if (testId && testId !== 'all') {
        // Use the strict rank logic for a single test
        const ranked = await rankAttemptsForTest(testId);
        // Map to expected frontend format
        const formatted = ranked.map(r => ({
          studentId: { _id: r.candidateId },
          name: r.candidateName,
          email: r.candidateEmail,
          totalXP: r.score,
          testsTaken: 1,
          rank: r.rank,
          accuracy: r.accuracy || 0,
          timeTaken: r.timeTaken,
          submittedAt: r.submittedAt,
          violationsCount: r.violationsCount
        }));
        return res.status(200).json({ success: true, data: formatted });
      }

      const tests = await AptitudeTest.find(testQuery).select('_id');
      const testIds = tests.map(t => t._id);

      if (testIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      // 2. Get all completed attempts for these tests
      const attempts = await AptitudeAttempt.find({
        testId: { $in: testIds },
        completed: true
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
        
        // Use persisted attempt totals instead of section metadata that isn't stored on the attempt.
        correct = attempt.correctCount || 0;
        totalQ = attempt.totalQuestions || 0;
        
        if (totalQ === 0 && attempt.answers && attempt.answers.length > 0) {
            totalQ = attempt.answers.length;
            correct = attempt.answers.filter(a => a.isCorrect).length;
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

  // GET /api/aptitude/company/tests/:testId/leaderboard/pdf
  getLeaderboardPdf: async (req, res) => {
    try {
      const companyId = req.user.id || req.user._id;
      const { testId } = req.params;

      const test = await AptitudeTest.findOne({ _id: testId, companyId });
      if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
      }

      const ranked = await rankAttemptsForTest(testId);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=leaderboard-${testId}.pdf`);

      await buildLeaderboardPdf(test, ranked, res);

    } catch (error) {
      console.error('Error generating PDF:', error);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: 'Server error generating PDF' });
      }
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
  },

  // GET /api/aptitude/chapters
  getChapters: async (req, res) => {
    try {
      const { APTITUDE_CATEGORIES } = require('../constants/categories');
      const AptitudeQuestion = require('../models/AptitudeQuestion');
      
      const chapters = [];
      
      for (const [category, subtopics] of Object.entries(APTITUDE_CATEGORIES)) {
        for (const subtopic of subtopics) {
          // Count active questions per difficulty
          const counts = await AptitudeQuestion.aggregate([
            { $match: { category, subtopic, isActive: true } },
            { $group: { _id: '$difficulty', count: { $sum: 1 } } }
          ]);
          
          let totalCount = 0;
          const diffCounts = { Easy: 0, Medium: 0, Hard: 0 };
          
          counts.forEach(c => {
            if (diffCounts[c._id] !== undefined) {
              diffCounts[c._id] = c.count;
              totalCount += c.count;
            }
          });
          
          chapters.push({
            category,
            subtopic,
            totalCount,
            difficultyDistribution: diffCounts
          });
        }
      }
      
      return res.status(200).json({ success: true, data: chapters });
    } catch (error) {
      console.error('Error fetching chapters:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching chapters' });
    }
  },

  // POST /api/aptitude/start-chapter
  startChapterTest: async (req, res) => {
    try {
      const { category, subtopic } = req.body;
      const AptitudeMockTest = require('../models/AptitudeMockTest');
      const AptitudeAttempt = require('../models/AptitudeAttempt');
      const { generateQuestionSet } = require('../services/testGenerationService');

      let blueprint = await AptitudeMockTest.findOne({
        testType: 'chapter',
        'topicMix.0.category': category,
        'topicMix.0.subtopics': subtopic
      });

      if (!blueprint) {
        blueprint = await AptitudeMockTest.create({
          title: `${subtopic} - Chapter Test`,
          testType: 'chapter',
          generationMode: 'randomized-per-attempt',
          topicMix: [{
            category,
            subtopics: [subtopic],
            questionCount: 10,
            difficultyDistribution: { easy: 4, medium: 4, hard: 2 }
          }],
          duration: 1200,
          totalMarks: 10,
          isActive: true
        });
      }

      const result = await generateQuestionSet(blueprint.topicMix, { dryRun: false });
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.errors.join(', ') });
      }

      const attempt = await AptitudeAttempt.create({
        studentId: req.user._id || req.user.id,
        testId: blueprint._id, // Notice: AptitudeAttempt in aptitude feature uses testId
        answers: result.questions.map(q => ({
          questionId: q._id,
          questionText: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks || 1,
          negativeMarks: q.negativeMarking || 0.25,
          selectedAnswer: null,
          timeSpentSeconds: 0
        })),
        startTime: new Date(),
        completed: false
      });

      res.json({ success: true, data: attempt });
    } catch (error) {
      console.error('Error starting chapter test:', error);
      res.status(500).json({ success: false, error: 'Server error starting chapter test' });
    }
  }
};

module.exports = aptitudeTestController;
