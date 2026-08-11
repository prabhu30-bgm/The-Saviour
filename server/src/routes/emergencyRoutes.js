const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { protect, restrictTo, isApprovedVolunteer } = require('../middlewares/authMiddleware');
const { createEmergencyValidator } = require('../validators/emergencyValidator');
const upload = require('../middlewares/multer');
const { ROLES } = require('../constants');

// Public endpoints (no authentication required)
router.get('/public-stats', emergencyController.getPublicStats);
router.post('/guest', upload.single('image'), emergencyController.createGuestEmergencyRequest);

// Apply protection to all other emergency requests
router.use(protect);

// Get emergency requests (Dynamic by Role) and Create new emergency request (User role only)
router.route('/')
  .get(emergencyController.getEmergencyRequests)
  .post(
    restrictTo(ROLES.USER), 
    upload.single('image'), 
    createEmergencyValidator, 
    emergencyController.createEmergencyRequest
  );

// Details of a request
router.get('/:id', emergencyController.getEmergencyRequestDetails);

// Edit an emergency request (User/Victim only)
router.patch(
  '/:id', 
  restrictTo(ROLES.USER), 
  upload.single('image'), 
  emergencyController.updateEmergencyRequest
);

// Cancel a request (User/Victim only)
router.post('/:id/cancel', restrictTo(ROLES.USER), emergencyController.cancelEmergencyRequest);

// Assign/reassign/remove a volunteer (Admin only)
router.patch('/:id/assign', restrictTo(ROLES.ADMIN), emergencyController.assignVolunteer);

// Reject an emergency request (Admin only)
router.patch('/:id/reject', restrictTo(ROLES.ADMIN), emergencyController.rejectEmergencyRequest);

// Confirm resolution (Admin only)
router.patch('/:id/confirm', restrictTo(ROLES.ADMIN), emergencyController.confirmEmergencyResolution);

// Update status of rescue (Volunteer only, must be approved)
router.patch(
  '/:id/status', 
  restrictTo(ROLES.VOLUNTEER), 
  isApprovedVolunteer, 
  upload.single('resolutionImage'),
  emergencyController.updateRescueStatus
);

// Rate volunteer (User/Victim only)
router.patch(
  '/:id/rate',
  restrictTo(ROLES.USER),
  emergencyController.rateVolunteer
);

module.exports = router;
