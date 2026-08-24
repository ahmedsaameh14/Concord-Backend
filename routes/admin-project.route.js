const express = require('express');
const {
  createProject,
  getAdminProjects,
  getAdminProjectById,
  updateProject,
  toggleProjectStatus,
  deleteProject,
} = require('../controllers/admin-project.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.route('/').post(createProject).get(getAdminProjects);
router.patch('/:id/status', toggleProjectStatus);
router
  .route('/:id')
  .get(getAdminProjectById)
  .patch(updateProject)
  .delete(deleteProject);

module.exports = router;
