const AssessmentSecurityEvent = require('../models/AssessmentSecurityEvent');
const AptitudeAttempt = require('../../aptitude/models/AptitudeAttempt');
const AptitudeTest = require('../../aptitude/models/AptitudeTest');
const { computeAttemptDeadline, getRemainingSeconds } = require('../../aptitude/utils/slotUtils');
const { counterFields, isViolationEvent, normalizeEventType } = require('../utils/securityPolicy');
const fs = require('fs');
const path = require('path');

const snapshotDirectory = path.join(__dirname, '../../../../private/assessment-snapshots');
const crypto = require('crypto');

const verifyHmacSignature = (payloadString, signature, secret) => {
  if (!signature || !secret) return false;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

const normalizeEvent = (payload = {}) => {
  const valid = Array.isArray(payload) ? payload : [payload];
  return valid
    .filter(Boolean)
    .map((event) => ({
      type: event.type || 'window_blur',
      message: event.message || 'Assessment security event detected.',
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: event.metadata || {},
      severity: event.severity || 'warning',
      eventId: event.eventId
    }));
};

const ensureAttemptOwnership = async ({ assessmentType, attemptId, userId }) => {
  if (!attemptId || !userId || assessmentType !== 'aptitude') return null;

  return AptitudeAttempt.findOne({ _id: attemptId, studentId: userId });
};

const submitForPolicy = async (attemptId, user) => {
  const aptitudeTestController = require('../../aptitude/controllers/aptitudeTestController');
  const response = {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  await aptitudeTestController.submitAttempt({
    params: { attemptId },
    body: { autoSubmitted: true },
    internalPolicySubmit: true,
    user
  }, response);
  return response;
};

const recordEvent = async ({
  userId, assessmentType, assessmentId, attemptId, sessionId,
  eventType, message, metadata, severity, eventId, snapshotUrl, occurredAt
}) => {
  let normalizedType = normalizeEventType(eventType);
  if (!normalizedType || normalizedType.length > 64) {
    const error = new Error('Invalid security event type');
    error.statusCode = 400;
    throw error;
  }

  let attempt = null;
  let normalizedMessage = message;
  let normalizedSeverity = severity || 'warning';
  if (assessmentType === 'aptitude' && attemptId) {
    attempt = await ensureAttemptOwnership({ assessmentType, attemptId, userId });
    if (!attempt) {
      const error = new Error('Attempt not authorized for this candidate');
      error.statusCode = 403;
      throw error;
    }
    if (attempt.activeSessionId && attempt.activeSessionId !== sessionId) {
      normalizedType = 'MULTIPLE_SESSION';
      normalizedMessage = 'A different browser session attempted to access this assessment.';
      normalizedSeverity = 'critical';
      eventId = eventId || `session-mismatch-${attemptId}-${Date.now()}`;
    }
  } else if (assessmentType === 'aptitude') {
    const error = new Error('attemptId is required for aptitude security events');
    error.statusCode = 400;
    throw error;
  }

  const existing = eventId ? await AssessmentSecurityEvent.findOne({ eventId }).lean() : null;
  if (existing) return { event: existing, attempt, duplicate: true, violationCount: attempt?.securitySummary?.totalViolations || 0 };

  const event = await AssessmentSecurityEvent.create({
    userId,
    studentId: userId,
    assessmentType,
    assessmentId,
    attemptId,
    sessionId,
    eventId: eventId || `${assessmentType}:${attemptId || assessmentId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    eventSequence: Number.isFinite(Number(metadata?.eventSequence)) ? Number(metadata.eventSequence) : 0,
    eventType: normalizedType,
    message: normalizedMessage,
    metadata: metadata || {},
    severity: normalizedSeverity,
    snapshotUrl: snapshotUrl || null,
    occurredAt: occurredAt && !Number.isNaN(new Date(occurredAt).getTime()) ? new Date(occurredAt) : new Date()
  });

  if (!attempt || !isViolationEvent(normalizedType)) {
    return { event, attempt, duplicate: false, violationCount: attempt?.securitySummary?.totalViolations || 0 };
  }

  const violation = {
    type: normalizedType,
    message: normalizedMessage,
    severity: normalizedSeverity,
    timestamp: event.createdAt || new Date(),
    metadata: { ...(metadata || {}), snapshotUrl: snapshotUrl || null, eventId: event.eventId }
  };
  const update = {
    $push: { violationEvents: violation },
    $inc: { 'securitySummary.totalViolations': 1 },
    $set: { 'securitySummary.lastViolationAt': violation.timestamp, suspicious: true }
  };
  const counterField = counterFields[normalizedType];
  if (counterField) update.$inc[counterField] = 1;

  attempt = await AptitudeAttempt.findOneAndUpdate(
    { _id: attemptId, studentId: userId, completed: false },
    update,
    { new: true }
  );

  if (!attempt) {
    return { event, attempt: null, duplicate: false, violationCount: 0 };
  }

  const test = await AptitudeTest.findById(attempt.testId).select('maxViolationCount').lean();
  const maxViolationCount = Number(attempt.maxViolationCount || test?.maxViolationCount || 3);
  const violationCount = Number(attempt.securitySummary?.totalViolations || 0);
  let autoSubmitted = false;
  if (violationCount >= maxViolationCount) {
    const submission = await submitForPolicy(attemptId, { id: userId, _id: userId });
    autoSubmitted = submission.statusCode < 400 && !!submission.payload?.success;
  }

  return { event, attempt, duplicate: false, violationCount, maxViolationCount, autoSubmitted };
};

const canReviewAttempt = async (req, attempt) => {
  const userId = req.user?.id || req.user?._id;
  if (req.user?.userType === 'admin') return true;
  if (attempt.studentId?.toString() === userId?.toString()) return true;
  if (req.user?.userType !== 'company') return false;
  const test = await AptitudeTest.findOne({ _id: attempt.testId, companyId: userId }).select('_id').lean();
  return !!test;
};

const assessmentSecurityController = {
  logEvent: async (req, res) => {
    const { assessmentType, assessmentId, attemptId, sessionId, eventType, message, metadata, severity, eventId, eventSequence } = req.body || {};
    const signature = req.headers?.['x-proctor-signature'];

    try {
      if (!assessmentType || !eventType || !message) {
        return res.status(400).json({
          success: false,
          error: 'assessmentType, eventType, and message are required'
        });
      }

      const userId = req.user?.id || req.user?._id || null;
      let attempt = null;
      if (assessmentType === 'aptitude' && attemptId) {
        attempt = await ensureAttemptOwnership({ assessmentType, attemptId, userId });
        if (!req.internalPolicyEvent && attempt && attempt.hmacSecret) {
          const payloadString = `${attemptId}:${eventType}:${eventId || ''}`;
          if (!verifyHmacSignature(payloadString, signature, attempt.hmacSecret)) {
             return res.status(403).json({ success: false, error: 'Invalid security signature' });
          }
        }
      }

      const result = await recordEvent({
        userId,
        assessmentType,
        assessmentId,
        attemptId,
        sessionId,
        eventType,
        message,
        metadata: { ...(metadata || {}), eventSequence },
        severity,
        eventId,
        snapshotUrl: req.body.snapshotUrl,
        occurredAt: req.body.timestamp
      });

      return res.status(result.duplicate ? 200 : 201).json({
        success: true,
        data: result.event,
        duplicate: result.duplicate,
        violationCount: result.violationCount,
        maxViolationCount: result.maxViolationCount || result.attempt?.maxViolationCount || 3,
        autoSubmitted: !!result.autoSubmitted
      });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
      if (error.code === 11000 && eventId) {
        try {
          const existing = await AssessmentSecurityEvent.findOne({ eventId }).lean();
          if (existing) {
            return res.status(200).json({ success: true, data: existing, duplicate: true });
          }
        } catch (lookupError) {
          console.error('Failed to load duplicate assessment event:', lookupError);
        }
      }
      console.error('Error logging assessment event:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to log assessment security event' });
    }
  },

  ingestEvents: async (req, res) => {
    try {
      const { assessmentType, assessmentId, attemptId, sessionId, events = [] } = req.body || {};
      const userId = req.user?.id || req.user?._id || null;
      const normalized = normalizeEvent(events);

      if (!assessmentType || normalized.length === 0) {
        return res.status(400).json({ success: false, error: 'assessmentType and events are required' });
      }

      const docs = normalized.map((event) => ({
        userId,
        studentId: userId,
        assessmentType,
        assessmentId,
        attemptId,
        sessionId,
        eventType: event.type,
        message: event.message,
        metadata: event.metadata || {},
        severity: event.metadata?.severity || 'warning',
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date()
      }));

      const inserted = await AssessmentSecurityEvent.insertMany(docs);
      return res.status(201).json({ success: true, data: inserted });
    } catch (error) {
      console.error('Error ingesting assessment events:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to ingest assessment events' });
    }
  },

  heartbeat: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const { attemptId, sessionId } = req.body || {};
      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId: userId });
      if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized' });
      if (attempt.completed) return res.status(410).json({ success: false, error: 'Attempt is already completed' });

      if (!sessionId || (attempt.activeSessionId && attempt.activeSessionId !== sessionId)) {
        const result = await recordEvent({
          userId,
          assessmentType: 'aptitude',
          assessmentId: attempt.testId,
          attemptId: attempt._id,
          sessionId,
          eventType: 'MULTIPLE_SESSION',
          message: 'A second browser session attempted to resume this assessment.',
          severity: 'critical',
          eventId: `multiple-session-${attempt._id}-${sessionId || 'missing'}`
        });
        return res.status(409).json({ success: false, error: 'A different session currently owns this attempt.', violationCount: result.violationCount, maxViolationCount: result.maxViolationCount || 3, autoSubmitted: !!result.autoSubmitted });
      }

      const now = new Date();
      await AptitudeAttempt.updateOne({ _id: attempt._id, studentId: userId, completed: false }, { $set: { lastHeartbeatAt: now } });
      const deadline = attempt.attemptDeadline || computeAttemptDeadline(attempt.startedAt, 60 * 60, attempt.slotEndTime || null);
      if (now.getTime() > new Date(deadline).getTime() + 5000) {
        const submission = await submitForPolicy(attempt._id, { id: userId, _id: userId });
        return res.status(410).json({ success: false, error: 'TEST_EXPIRED', autoSubmitted: !!submission.payload?.success });
      }

      return res.status(200).json({
        success: true,
        serverNow: now,
        attemptDeadline: deadline,
        remainingSeconds: getRemainingSeconds(deadline, now),
        violationCount: attempt.securitySummary?.totalViolations || 0,
        maxViolationCount: attempt.maxViolationCount || 3
      });
    } catch (error) {
      console.error('Error processing assessment heartbeat:', error);
      return res.status(500).json({ success: false, error: 'Failed to verify assessment session' });
    }
  },

  uploadSnapshot: async (req, res) => {
    let filePath;
    try {
      if (!req.file || req.file.mimetype !== 'image/jpeg' || req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'A JPEG snapshot under 2 MB is required' });
      }
      if (req.file.buffer[0] !== 0xff || req.file.buffer[1] !== 0xd8 || req.file.buffer[2] !== 0xff) {
        return res.status(400).json({ success: false, error: 'Invalid JPEG snapshot' });
      }

      const userId = req.user?.id || req.user?._id;
      const { assessmentType = 'aptitude', assessmentId, attemptId, sessionId, eventType = 'WEBCAM_SNAPSHOT', message, timestamp, metadata, eventId } = req.body || {};
      const signature = req.headers['x-proctor-signature'];

      if (assessmentType === 'aptitude' && attemptId) {
        const attempt = await ensureAttemptOwnership({ assessmentType, attemptId, userId });
        if (attempt && attempt.hmacSecret) {
          const payloadString = `${attemptId}:${eventType}:${eventId || ''}`;
          if (!verifyHmacSignature(payloadString, signature, attempt.hmacSecret)) {
             return res.status(403).json({ success: false, error: 'Invalid security signature' });
          }
        }
      }

      await fs.promises.mkdir(snapshotDirectory, { recursive: true });
      const fileName = `${require('crypto').randomUUID()}.jpg`;
      filePath = path.join(snapshotDirectory, fileName);
      await fs.promises.writeFile(filePath, req.file.buffer, { flag: 'wx' });

      const result = await recordEvent({
        userId,
        assessmentType,
        assessmentId,
        attemptId,
        sessionId,
        eventType,
        message: message || 'Webcam snapshot captured.',
        metadata: metadata ? JSON.parse(metadata) : {},
        severity: eventType === 'WEBCAM_SNAPSHOT' ? 'info' : 'warning',
        eventId: req.body.eventId,
        snapshotUrl: fileName,
        occurredAt: timestamp
      });
      return res.status(201).json({
        success: true,
        data: { eventId: result.event._id, snapshotUrl: `/assessment/snapshots/${result.event._id}`, timestamp: result.event.createdAt },
        violationCount: result.violationCount,
        maxViolationCount: result.maxViolationCount || result.attempt?.maxViolationCount || 3,
        autoSubmitted: !!result.autoSubmitted
      });
    } catch (error) {
      if (filePath) await fs.promises.unlink(filePath).catch(() => {});
      if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
      console.error('Error saving assessment snapshot:', error);
      return res.status(500).json({ success: false, error: 'Failed to save webcam snapshot' });
    }
  },

  getSnapshot: async (req, res) => {
    try {
      let fileName;
      let attempt;
      if (req.params.eventId.startsWith('ref_')) {
        fileName = req.params.eventId;
        attempt = await AptitudeAttempt.findOne({ referencePhotoUrl: `/assessment/snapshots/${fileName}` }).select('studentId testId').lean();
        if (!attempt) return res.status(404).json({ success: false, error: 'Snapshot not found' });
      } else {
        const event = await AssessmentSecurityEvent.findById(req.params.eventId).lean();
        if (!event?.snapshotUrl) return res.status(404).json({ success: false, error: 'Snapshot not found' });
        fileName = path.basename(event.snapshotUrl);
        attempt = await AptitudeAttempt.findById(event.attemptId).select('studentId testId').lean();
      }
      if (!attempt || !(await canReviewAttempt(req, attempt))) return res.status(403).json({ success: false, error: 'Not authorized to view this snapshot' });
      const filePath = path.join(snapshotDirectory, fileName);
      if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Snapshot file is unavailable' });
      res.type('image/jpeg').sendFile(filePath);
    } catch (error) {
      console.error('Error loading assessment snapshot:', error);
      return res.status(500).json({ success: false, error: 'Failed to load assessment snapshot' });
    }
  },

  getRecentEvents: async (req, res) => {
    try {
      const { assessmentType, assessmentId } = req.query;
      const query = {};
      if (assessmentType) query.assessmentType = assessmentType;
      if (assessmentId) query.assessmentId = assessmentId;

      if (req.user?.userType !== 'admin') {
        if (req.user?.userType !== 'company' || !assessmentId) {
          return res.status(403).json({ success: false, error: 'Admin or test-owning company access required' });
        }
        const test = await AptitudeTest.findOne({ _id: assessmentId, companyId: req.user.id || req.user._id }).select('_id').lean();
        if (!test) return res.status(403).json({ success: false, error: 'Not authorized to review this assessment' });
      }

      const events = await AssessmentSecurityEvent.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return res.status(200).json({ success: true, data: events });
    } catch (error) {
      console.error('Error fetching assessment events:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch assessment events' });
    }
  },

  initProctoring: async (req, res) => {
    try {
      const { attemptId, consentAccepted } = req.body;
      const userId = req.user?.id || req.user?._id;

      if (!attemptId) return res.status(400).json({ success: false, error: 'attemptId is required' });

      const attempt = await AptitudeAttempt.findOne({ _id: attemptId, studentId: userId });
      if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });

      if (consentAccepted === 'true' || consentAccepted === true) {
        attempt.consentAccepted = true;
        attempt.consentAcceptedAt = new Date();
      }

      if (req.file) {
        await fs.promises.mkdir(snapshotDirectory, { recursive: true });
        const fileName = `ref_${require('crypto').randomUUID()}.jpg`;
        const filePath = path.join(snapshotDirectory, fileName);
        await fs.promises.writeFile(filePath, req.file.buffer, { flag: 'wx' });
        attempt.referencePhotoUrl = `/assessment/snapshots/${fileName}`;
      }

      await attempt.save();
      return res.status(200).json({ success: true, message: 'Proctoring initialized' });
    } catch (error) {
      console.error('Error initializing proctoring:', error);
      return res.status(500).json({ success: false, error: 'Failed to initialize proctoring' });
    }
  },

  markFalseAlarm: async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await AssessmentSecurityEvent.findOne({ eventId });
      if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

      // Admin or Company check
      if (req.user?.userType !== 'admin') {
        if (req.user?.userType !== 'company') {
          return res.status(403).json({ success: false, error: 'Not authorized' });
        }
        // Company must own the test
        const test = await AptitudeTest.findOne({ _id: event.assessmentId, companyId: req.user.id || req.user._id }).select('_id').lean();
        if (!test) return res.status(403).json({ success: false, error: 'Not authorized to review this assessment' });
      }

      // Mark it as false alarm
      event.severity = 'info';
      event.message = '[FALSE ALARM] ' + event.message;
      await event.save();
      
      // We should ideally decrement the violation counter in AptitudeAttempt here, but for simplicity we just update the event.
      // Re-calculating the suspicion score would be done here.
      
      return res.status(200).json({ success: true, message: 'Event marked as false alarm' });
    } catch (error) {
      console.error('Error marking false alarm:', error);
      return res.status(500).json({ success: false, error: 'Failed to mark false alarm' });
    }
  }
};

module.exports = assessmentSecurityController;
