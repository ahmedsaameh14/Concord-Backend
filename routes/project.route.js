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
} = require('../middleware/auth.middleware');
const { uploadProjectImages } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/filters', getProjectFilters);
router.get('/', optionalAuthenticate, getProjects);
router.get('/:slugOrId', optionalAuthenticate, getProjectBySlugOrId);

router.post('/', authenticate, uploadProjectImages, createProject);
router.patch('/:id/status', authenticate, toggleProjectStatus);
router.patch('/:id', authenticate, uploadProjectImages, updateProject);
router.delete('/:id', authenticate, deleteProject);

module.exports = router;
