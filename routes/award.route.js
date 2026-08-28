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
  authorize,
} = require('../middleware/auth.middleware');
const { uploadSingleImage } = require('../middleware/upload.middleware');

const router = express.Router();
const adminOnly = [authenticate, authorize('admin')];

router.get('/', optionalAuthenticate, getAwards);
router.get('/:slugOrId', optionalAuthenticate, getAwardBySlugOrId);

router.post('/', ...adminOnly, uploadSingleImage, createAward);
router.patch('/:id/status', ...adminOnly, toggleAwardStatus);
router.patch('/:id', ...adminOnly, uploadSingleImage, updateAward);
router.delete('/:id', ...adminOnly, deleteAward);

module.exports = router;
