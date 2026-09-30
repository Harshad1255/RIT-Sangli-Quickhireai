const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../auth/middleware/auth');
const assessmentSecurityController = require('../controllers/assessmentSecurityController');
const multer = require('multer');

const router = express.Router();
const snapshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, file.mimetype === 'image/jpeg')
});

router.post('/heartbeat', authenticateToken, assessmentSecurityController.heartbeat);
router.post('/snapshot', authenticateToken, snapshotUpload.single('snapshot'), assessmentSecurityController.uploadSnapshot);
router.get('/snapshots/:eventId', authenticateToken, assessmentSecurityController.getSnapshot);

// New endpoints for webcam proctoring
router.post('/init-proctoring', authenticateToken, snapshotUpload.single('referencePhoto'), assessmentSecurityController.initProctoring);
router.post('/false-alarm/:eventId', authenticateToken, assessmentSecurityController.markFalseAlarm);


router.post(
  '/log',
  authenticateToken,
  [
    body('assessmentType').notEmpty().withMessage('assessmentType is required'),
    body('eventType').notEmpty().withMessage('eventType is required'),
    body('message').notEmpty().withMessage('message is required')
  ],
  assessmentSecurityController.logEvent
);

router.post(
  '/ingest',
  authenticateToken,
  assessmentSecurityController.ingestEvents
);

router.get(
  '/events',
  authenticateToken,
  assessmentSecurityController.getRecentEvents
);

module.exports = router;
