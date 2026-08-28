const express = require('express');
const controller = require('../controllers/career.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const dashboardAuth = [authenticate, authorize('admin', 'hr')];

router.get('/', controller.listCareers);
router.get('/admin/list', ...dashboardAuth, controller.listAdminCareers);
router.get('/admin/:id', ...dashboardAuth, controller.getAdminCareer);
router.get('/:id', controller.getCareer);
router.post('/:id/applications', controller.createApplication);
router.get('/:id/applications', ...dashboardAuth, controller.listApplications);
router.patch('/:id/applications/:applicationId/status', ...dashboardAuth, controller.updateApplicationStatus);
router.delete('/:id/applications/:applicationId', ...dashboardAuth, controller.deleteApplication);
router.post('/', ...dashboardAuth, controller.createCareer);
router.patch('/:id/status', ...dashboardAuth, controller.toggleCareerStatus);
router.patch('/:id', ...dashboardAuth, controller.updateCareer);
router.delete('/:id', ...dashboardAuth, controller.deleteCareer);

module.exports = router;
