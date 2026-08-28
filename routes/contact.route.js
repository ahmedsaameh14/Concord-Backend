const express = require('express');
const {
  createContactMessage,
  getContactMessages,
  deleteContactMessage,
} = require('../controllers/contact.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', createContactMessage);
router.get('/', authenticate, getContactMessages);
router.delete('/:id', authenticate, deleteContactMessage);

module.exports = router;
