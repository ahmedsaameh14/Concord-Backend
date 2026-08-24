const express = require('express');
const {
  getProjects,
  getProjectBySlugOrId,
  getProjectFilters,
} = require('../controllers/project.controller');

const router = express.Router();

router.get('/filters', getProjectFilters);
router.get('/', getProjects);
router.get('/:slugOrId', getProjectBySlugOrId);

module.exports = router;
