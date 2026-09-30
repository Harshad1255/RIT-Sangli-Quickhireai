const express = require('express');
const router = express.Router();
const companyScholasticController = require('../controllers/companyScholasticController');
const auth = require('../../../middleware/auth');
const checkRole = require('../../../middleware/checkRole');

// All routes require authentication and 'company' role
router.use(auth);
router.use(checkRole(['company']));

// Questions
router.get('/questions', companyScholasticController.getQuestions);
router.post('/questions', companyScholasticController.createQuestion);
router.put('/questions/:id', companyScholasticController.updateQuestion);
router.delete('/questions/:id', companyScholasticController.deleteQuestion);
router.post('/questions/:id/publish', companyScholasticController.publishQuestion);
router.post('/questions/:id/unpublish', companyScholasticController.unpublishQuestion);
router.post('/questions/:id/archive', companyScholasticController.archiveQuestion);
router.post('/questions/:id/duplicate', companyScholasticController.duplicateQuestion);

// Practice Sets
router.get('/practice-sets', companyScholasticController.getPracticeSets);
router.post('/practice-sets', companyScholasticController.createPracticeSet);
router.put('/practice-sets/:id', companyScholasticController.updatePracticeSet);
router.delete('/practice-sets/:id', companyScholasticController.deletePracticeSet);
router.post('/practice-sets/:id/publish', companyScholasticController.publishPracticeSet);
router.post('/practice-sets/:id/unpublish', companyScholasticController.unpublishPracticeSet);
router.post('/practice-sets/:id/archive', companyScholasticController.archivePracticeSet);

// Analytics
router.get('/analytics', companyScholasticController.getAnalytics);

module.exports = router;
