const express = require('express');
const {
  getArticles,
  getArticleBySlugOrId,
  createArticle,
  updateArticle,
  toggleArticleStatus,
  toggleTopArticle,
  deleteArticle,
} = require('../controllers/article.controller');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../middleware/auth.middleware');
const { uploadSingleImage } = require('../middleware/upload.middleware');

const router = express.Router();
const adminOnly = [authenticate, authorize('admin')];

router.get('/', optionalAuthenticate, getArticles);
router.get('/:slugOrId', optionalAuthenticate, getArticleBySlugOrId);

router.post('/', ...adminOnly, uploadSingleImage, createArticle);
router.patch('/:id/status', ...adminOnly, toggleArticleStatus);
router.patch('/:id/top', ...adminOnly, toggleTopArticle);
router.patch('/:id', ...adminOnly, uploadSingleImage, updateArticle);
router.delete('/:id', ...adminOnly, deleteArticle);

module.exports = router;
