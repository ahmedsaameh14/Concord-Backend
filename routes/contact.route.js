const express = require('express');
const {
  createContactMessage,
  getContactMessages,
  deleteContactMessage,
} = require('../controllers/contact.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const messagesAccess = [authenticate, authorize('admin', 'hr')];

router.post('/', createContactMessage);
router.get('/', ...messagesAccess, getContactMessages);
router.delete('/:id', ...messagesAccess, deleteContactMessage);

module.exports = router;
