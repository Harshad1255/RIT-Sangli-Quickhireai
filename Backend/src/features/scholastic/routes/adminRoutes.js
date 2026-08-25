const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const auth = require('../../../middleware/auth');

// Optional role check for admin (or allow for development/testing when env is dev)
const adminAuth = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.user?.userType !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin authorization required' });
  }
  next();
};

router.post('/questions/aptitude', adminController.addAptitudeQuestion);
router.put('/questions/aptitude/:id', adminController.updateAptitudeQuestion);
router.delete('/questions/aptitude/:id', adminController.deleteAptitudeQuestion);

router.post('/questions/coding', adminController.addCodingQuestion);
router.post('/bulk-upload', adminController.bulkUploadJSON);

router.post('/mock-tests', adminController.createMockTest);
router.delete('/mock-tests/:id', adminController.deleteMockTest);

module.exports = router;
