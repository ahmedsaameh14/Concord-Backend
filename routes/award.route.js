const express = require('express');
const {
  getAwards,
  getAwardBySlugOrId,
  createAward,
  updateAward,
  toggleAwardStatus,
  deleteAward,
} = require('../controllers/award.controller');
const {
  authenticate,
  optionalAuthenticate,
} = require('../middleware/auth.middleware');
const { uploadSingleImage } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', optionalAuthenticate, getAwards);
router.get('/:slugOrId', optionalAuthenticate, getAwardBySlugOrId);

router.post('/', authenticate, uploadSingleImage, createAward);
router.patch('/:id/status', authenticate, toggleAwardStatus);
router.patch('/:id', authenticate, uploadSingleImage, updateAward);
router.delete('/:id', authenticate, deleteAward);

module.exports = router;
