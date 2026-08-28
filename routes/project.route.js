const express = require('express');
const {
  getProjects,
  getProjectBySlugOrId,
  getProjectFilters,
  createProject,
  updateProject,
  toggleProjectStatus,
  deleteProject,
} = require('../controllers/project.controller');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../middleware/auth.middleware');
const { uploadProjectImages } = require('../middleware/upload.middleware');

const router = express.Router();
const adminOnly = [authenticate, authorize('admin')];

router.get('/filters', getProjectFilters);
router.get('/', optionalAuthenticate, getProjects);
router.get('/:slugOrId', optionalAuthenticate, getProjectBySlugOrId);

router.post('/', ...adminOnly, uploadProjectImages, createProject);
router.patch('/:id/status', ...adminOnly, toggleProjectStatus);
router.patch('/:id', ...adminOnly, uploadProjectImages, updateProject);
router.delete('/:id', ...adminOnly, deleteProject);

module.exports = router;
