const express = require('express');
const {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  updateAdminStatus,
  removeAdmin,
} = require('../controllers/admin.controller');
const { authenticate, authorizeUsersManager } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate, authorizeUsersManager);

router.route('/').post(createAdmin).get(getAdmins);
router.route('/:id/status').patch(updateAdminStatus);
router.route('/:id').get(getAdminById).patch(updateAdmin).delete(removeAdmin);

module.exports = router;
