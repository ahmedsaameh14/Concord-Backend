const express = require('express');
const router = express.Router();
const {login} = require('../controllers/auth.controller')

router.post('/login', authLimiter, validateBody(loginSchema), login)

module.exports = router;