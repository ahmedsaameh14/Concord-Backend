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
} = require('../middleware/auth.middleware');
const { uploadSingleImage } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', optionalAuthenticate, getArticles);
router.get('/:slugOrId', optionalAuthenticate, getArticleBySlugOrId);

router.post('/', authenticate, uploadSingleImage, createArticle);
router.patch('/:id/status', authenticate, toggleArticleStatus);
router.patch('/:id/top', authenticate, toggleTopArticle);
router.patch('/:id', authenticate, uploadSingleImage, updateArticle);
router.delete('/:id', authenticate, deleteArticle);

module.exports = router;
