const express = require('express');
const {
  createContactMessage,
  getContactMessages,
  deleteContactMessage,
} = require('../controllers/contact.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const adminOnly = [authenticate, authorize('admin')];

router.post('/', createContactMessage);
router.get('/', ...adminOnly, getContactMessages);
router.delete('/:id', ...adminOnly, deleteContactMessage);

module.exports = router;
