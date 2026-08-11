const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants');

// Lock down all routes to Administrators only
router.use(protect);
router.use(restrictTo(ROLES.ADMIN));

router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
