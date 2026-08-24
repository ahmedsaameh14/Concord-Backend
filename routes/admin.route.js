const express = require('express');
const {
	createAdmin,
	getAdmins,
	getAdminById,
	removeAdmin,
} = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.route('/').post(createAdmin).get(getAdmins);
router.route('/:id').get(getAdminById).delete(removeAdmin);

module.exports = router;
