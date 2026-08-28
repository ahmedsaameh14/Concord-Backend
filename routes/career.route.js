const express = require('express');
const controller = require('../controllers/career.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', controller.listCareers);
router.get('/admin/list', authenticate, controller.listAdminCareers);
router.get('/admin/:id', authenticate, controller.getAdminCareer);
router.get('/:id', controller.getCareer);
router.post('/:id/applications', controller.createApplication);
router.get('/:id/applications', authenticate, controller.listApplications);
router.patch('/:id/applications/:applicationId/status', authenticate, controller.updateApplicationStatus);
router.delete('/:id/applications/:applicationId', authenticate, controller.deleteApplication);
router.post('/', authenticate, controller.createCareer);
router.patch('/:id/status', authenticate, controller.toggleCareerStatus);
router.patch('/:id', authenticate, controller.updateCareer);
router.delete('/:id', authenticate, controller.deleteCareer);

module.exports = router;
