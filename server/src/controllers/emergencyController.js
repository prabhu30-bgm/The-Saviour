const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');
const { uploadFile } = require('../services/fileUploadService');
const { createAndSendNotification } = require('../services/notificationService');
const { EMERGENCY_STATUS, ROLES } = require('../constants');
const ActivityLog = require('../models/ActivityLog');

/**
 * Create a new emergency request (User/Victim only)
 */
const createEmergencyRequest = async (req, res, next) => {
  try {
    const { title, description, category, severity, latitude, longitude, emergencyContact } = req.body;
    
    // Upload image if present
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadFile(req.file);
    }

    // Create request
    const request = await EmergencyRequest.create({
      title,
      description,
      category,
      severity,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // [lng, lat]
      },
      image: imageUrl,
      emergencyContact,
      createdBy: req.user._id,
      status: EMERGENCY_STATUS.PENDING
    });

    // Populate creator info
    const populatedRequest = await EmergencyRequest.findById(request._id)
      .populate('createdBy', 'name email mobile');

    // Notify Admins
    await createAndSendNotification({
      title: 'New Emergency Alert Raised',
      message: `A new emergency request (${category.toUpperCase()} - ${severity.toUpperCase()}) has been raised by ${req.user.name}.`,
      type: 'new_request',
      role: ROLES.ADMIN,
      referenceId: request._id
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'CREATE_EMERGENCY',
      details: { requestId: request._id, category },
      ipAddress: req.ip
    });

    return sendSuccess(res, { request: populatedRequest }, 'Emergency request raised successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get emergency requests based on roles:
 * - Admin: Sees all requests
 * - Volunteer: Sees requests assigned to them
 * - User: Sees requests created by them
 */
const getEmergencyRequests = async (req, res, next) => {
  try {
    const { role } = req.user;
    let query = {};

    if (role === ROLES.USER) {
      query.createdBy = req.user._id;
    } else if (role === ROLES.VOLUNTEER) {
      query.assignedVolunteer = req.user._id;
    }

    // Populate creator and volunteer details
    const requests = await EmergencyRequest.find(query)
      .populate('createdBy', 'name email mobile location isOnline')
      .populate('assignedVolunteer', 'name email mobile location isOnline')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { requests }, 'Emergency requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get details of a single emergency request
 */
const getEmergencyRequestDetails = async (req, res, next) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id)
      .populate('createdBy', 'name email mobile location isOnline')
      .populate('assignedVolunteer', 'name email mobile location isOnline');

    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    // Role check: User and Volunteer can only see their own requests.
    if (req.user.role === ROLES.USER && request.createdBy._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Unauthorized access to this request details', 403));
    }
    if (req.user.role === ROLES.VOLUNTEER && request.assignedVolunteer && request.assignedVolunteer._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Unauthorized access to this mission details', 403));
    }

    return sendSuccess(res, { request }, 'Emergency request details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Edit an emergency request (User/Victim only, and only if status is pending or verified)
 */
const updateEmergencyRequest = async (req, res, next) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    if (request.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only update your own requests', 403));
    }

    if (![EMERGENCY_STATUS.PENDING, EMERGENCY_STATUS.VERIFIED].includes(request.status)) {
      return next(new AppError('Requests can only be edited before a volunteer is assigned.', 400));
    }

    const { title, description, category, severity, latitude, longitude, emergencyContact } = req.body;

    if (title) request.title = title;
    if (description) request.description = description;
    if (category) request.category = category;
    if (severity) request.severity = severity;
    if (emergencyContact) request.emergencyContact = emergencyContact;
    if (latitude && longitude) {
      request.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    // Handle new image upload
    if (req.file) {
      request.image = await uploadFile(req.file);
    }

    await request.save();

    const updatedRequest = await EmergencyRequest.findById(request._id)
      .populate('createdBy', 'name email mobile');

    // Notify Admins
    await createAndSendNotification({
      title: 'Emergency Request Updated',
      message: `Emergency request raised by ${req.user.name} has been updated.`,
      type: 'system',
      role: ROLES.ADMIN,
      referenceId: request._id
    });

    return sendSuccess(res, { request: updatedRequest }, 'Emergency request updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel emergency request (User/Victim only)
 */
const cancelEmergencyRequest = async (req, res, next) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    if (request.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only cancel your own requests', 403));
    }

    if (request.status === EMERGENCY_STATUS.COMPLETED || request.status === EMERGENCY_STATUS.CANCELLED) {
      return next(new AppError('Cannot cancel a completed or already cancelled request', 400));
    }

    const oldStatus = request.status;
    request.status = EMERGENCY_STATUS.CANCELLED;
    await request.save();

    // Notify Admin and assigned Volunteer
    await createAndSendNotification({
      title: 'Emergency Request Cancelled',
      message: `The incident "${request.title}" was cancelled by the reporter (${req.user.name}).`,
      type: 'user_cancelled',
      role: ROLES.ADMIN,
      referenceId: request._id
    });

    if (request.assignedVolunteer) {
      await createAndSendNotification({
        title: 'Mission Cancelled',
        message: `Your assigned emergency mission "${request.title}" has been cancelled by the reporter.`,
        type: 'user_cancelled',
        recipient: request.assignedVolunteer,
        referenceId: request._id
      });
    }

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'CANCEL_EMERGENCY',
      details: { requestId: request._id, oldStatus },
      ipAddress: req.ip
    });

    return sendSuccess(res, { request }, 'Emergency request cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Assign Volunteer to an Emergency Request (Admin only)
 */
const assignVolunteer = async (req, res, next) => {
  try {
    const { volunteerId } = req.body;
    const request = await EmergencyRequest.findById(req.params.id);
    
    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    if (request.status === EMERGENCY_STATUS.COMPLETED || request.status === EMERGENCY_STATUS.CANCELLED) {
      return next(new AppError('Cannot assign volunteers to a completed or cancelled request', 400));
    }

    // If removing volunteer assignment
    if (!volunteerId) {
      const oldVolunteer = request.assignedVolunteer;
      request.assignedVolunteer = null;
      request.status = EMERGENCY_STATUS.PENDING;
      await request.save();

      if (oldVolunteer) {
        await createAndSendNotification({
          title: 'Mission Unassigned',
          message: `You have been unassigned from the mission: "${request.title}".`,
          type: 'system',
          recipient: oldVolunteer,
          referenceId: request._id
        });
      }

      await createAndSendNotification({
        title: 'Volunteer Unassigned',
        message: `A volunteer has been removed from your emergency request: "${request.title}".`,
        type: 'status_change',
        recipient: request.createdBy,
        referenceId: request._id
      });

      return sendSuccess(res, { request }, 'Volunteer unassigned successfully');
    }

    // Check if volunteer exists, is a volunteer, and is approved
    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== ROLES.VOLUNTEER) {
      return next(new AppError('Selected user is not a valid volunteer', 400));
    }
    
    if (!volunteer.isApproved) {
      return next(new AppError('Selected volunteer is not approved by administrators yet', 400));
    }

    if (volunteer.status === 'suspended') {
      return next(new AppError('Selected volunteer is currently suspended', 400));
    }

    const previousVolunteer = request.assignedVolunteer;
    request.assignedVolunteer = volunteer._id;
    request.status = EMERGENCY_STATUS.ASSIGNED;
    await request.save();

    // Log Action
    await ActivityLog.create({
      user: req.user._id,
      action: 'ASSIGN_VOLUNTEER',
      details: { requestId: request._id, volunteerId },
      ipAddress: req.ip
    });

    // Notify the volunteer
    await createAndSendNotification({
      title: 'New Rescue Mission Assigned',
      message: `You have been assigned a new rescue mission: "${request.title}" (${request.severity.toUpperCase()}). Please review and accept.`,
      type: 'volunteer_assigned',
      recipient: volunteer._id,
      referenceId: request._id
    });

    // Notify the victim
    await createAndSendNotification({
      title: 'Rescue Worker Dispatched',
      message: `Volunteer "${volunteer.name}" has been assigned to assist you. Tracking information will activate once they accept.`,
      type: 'status_change',
      recipient: request.createdBy,
      referenceId: request._id
    });

    // Notify previous volunteer if changed
    if (previousVolunteer && previousVolunteer.toString() !== volunteerId) {
      await createAndSendNotification({
        title: 'Mission Reassigned',
        message: `Your assignment for "${request.title}" has been reassigned to another volunteer.`,
        type: 'system',
        recipient: previousVolunteer,
        referenceId: request._id
      });
    }

    const updatedRequest = await EmergencyRequest.findById(request._id)
      .populate('createdBy', 'name email mobile location')
      .populate('assignedVolunteer', 'name email mobile location');

    return sendSuccess(res, { request: updatedRequest }, 'Volunteer assigned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Volunteer updates status of assigned emergency
 */
const updateRescueStatus = async (req, res, next) => {
  try {
    const { status, resolutionReport } = req.body;
    const request = await EmergencyRequest.findById(req.params.id);

    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    // Verify volunteer is the one assigned
    if (!request.assignedVolunteer || request.assignedVolunteer.toString() !== req.user._id.toString()) {
      return next(new AppError('You are not authorized to edit this rescue request', 403));
    }

    // Verify status transition
    const validStatusTransitions = [
      EMERGENCY_STATUS.ACCEPTED,
      EMERGENCY_STATUS.REACHED,
      EMERGENCY_STATUS.IN_PROGRESS,
      EMERGENCY_STATUS.COMPLETED,
      EMERGENCY_STATUS.REJECTED
    ];

    if (!validStatusTransitions.includes(status)) {
      return next(new AppError('Invalid rescue status update', 400));
    }

    const oldStatus = request.status;

    if (status === EMERGENCY_STATUS.REJECTED) {
      // Revert to pending, clear volunteer
      request.status = EMERGENCY_STATUS.PENDING;
      request.assignedVolunteer = null;
      await request.save();

      // Notify Admins
      await createAndSendNotification({
        title: 'Volunteer Rejected Assignment',
        message: `Volunteer "${req.user.name}" has rejected the assignment for: "${request.title}".`,
        type: 'volunteer_rejected',
        role: ROLES.ADMIN,
        referenceId: request._id
      });

      // Notify Victim
      await createAndSendNotification({
        title: 'Rescue Worker Assignment Changed',
        message: `Your assigned rescue worker was unassigned. We are routing another responder immediately.`,
        type: 'status_change',
        recipient: request.createdBy,
        referenceId: request._id
      });

      // Log Activity
      await ActivityLog.create({
        user: req.user._id,
        action: 'REJECT_ASSIGNMENT',
        details: { requestId: request._id },
        ipAddress: req.ip
      });

      return sendSuccess(res, { request }, 'Assignment rejected successfully. Request returned to queue.');
    }

    // Normal progression
    request.status = status;
    
    if (status === EMERGENCY_STATUS.COMPLETED) {
      request.resolutionReport = resolutionReport;
      if (req.file) {
        request.resolutionImage = await uploadFile(req.file);
      }
    }

    await request.save();

    // Map status to notification text
    let userMessage = '';
    let adminMessage = '';
    let notificationType = 'status_change';

    switch (status) {
      case EMERGENCY_STATUS.ACCEPTED:
        userMessage = `Volunteer "${req.user.name}" has accepted your rescue request and is prepairing to deploy.`;
        adminMessage = `Volunteer "${req.user.name}" accepted the assignment for "${request.title}".`;
        notificationType = 'volunteer_accepted';
        break;
      case EMERGENCY_STATUS.REACHED:
        userMessage = `Rescue worker "${req.user.name}" has reached your destination location.`;
        adminMessage = `Volunteer "${req.user.name}" reached the destination for "${request.title}".`;
        notificationType = 'volunteer_reached';
        break;
      case EMERGENCY_STATUS.IN_PROGRESS:
        userMessage = `Rescue operation has actively started for your emergency request.`;
        adminMessage = `Volunteer "${req.user.name}" started rescue operations for "${request.title}".`;
        notificationType = 'rescue_started';
        break;
      case EMERGENCY_STATUS.COMPLETED:
        userMessage = `Your emergency request has been resolved and completed. Report: "${resolutionReport}".`;
        adminMessage = `Volunteer "${req.user.name}" completed rescue for "${request.title}". Report: "${resolutionReport}".`;
        notificationType = 'rescue_completed';
        break;
    }

    // Send notifications to reporter and admin
    await createAndSendNotification({
      title: 'Rescue Progress Update',
      message: userMessage,
      type: notificationType,
      recipient: request.createdBy,
      referenceId: request._id
    });

    await createAndSendNotification({
      title: 'Rescue Progress Alert',
      message: adminMessage,
      type: notificationType,
      role: ROLES.ADMIN,
      referenceId: request._id
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: `RESCUE_${status.toUpperCase()}`,
      details: { requestId: request._id, oldStatus },
      ipAddress: req.ip
    });

    const updatedRequest = await EmergencyRequest.findById(request._id)
      .populate('createdBy', 'name email mobile location')
      .populate('assignedVolunteer', 'name email mobile location');

    return sendSuccess(res, { request: updatedRequest }, `Incident status updated to: ${status}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Public Statistics for Landing Page
 */
const getPublicStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: ROLES.USER, email: { $ne: 'guest@thesaviour.com' } });
    const totalVolunteers = await User.countDocuments({ role: ROLES.VOLUNTEER, isApproved: true });
    const totalRequests = await EmergencyRequest.countDocuments();
    const completedRequests = await EmergencyRequest.countDocuments({ status: EMERGENCY_STATUS.COMPLETED });
    
    // Response success rate
    const successRate = totalRequests > 0 
      ? Math.round((completedRequests / totalRequests) * 100) 
      : 100;

    return sendSuccess(res, {
      totalUsers,
      totalVolunteers,
      totalRequests,
      completedRequests,
      successRate
    }, 'Public stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create Guest Emergency Request (Anonymous/No-Login SOS)
 */
const createGuestEmergencyRequest = async (req, res, next) => {
  try {
    const { name, mobile, category, description, latitude, longitude } = req.body;

    // Find the system guest user
    const guestUser = await User.findOne({ email: 'guest@thesaviour.com' });
    if (!guestUser) {
      return next(new AppError('System guest reporter account not found. Please run seed script.', 500));
    }

    // Process image if uploaded
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadFile(req.file);
    }

    // Create request
    const request = await EmergencyRequest.create({
      title: `SOS Alert: ${category.toUpperCase()} - ${name}`,
      description: `[GUEST SOS REPORT]\nReporter Name: ${name}\nMobile Contact: ${mobile}\n\nDescription: ${description}`,
      category,
      severity: 'critical', // Guest SOS is always critical
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      image: imageUrl,
      emergencyContact: mobile,
      createdBy: guestUser._id,
      status: EMERGENCY_STATUS.PENDING
    });

    // Notify Admins in real-time
    await createAndSendNotification({
      title: 'CRITICAL GUEST SOS ALERT!',
      message: `An anonymous SOS alert (${category.toUpperCase()}) was raised by ${name} (${mobile}).`,
      type: 'new_request',
      role: ROLES.ADMIN,
      referenceId: request._id
    });

    // Log Activity
    await ActivityLog.create({
      user: guestUser._id,
      action: 'GUEST_SOS',
      details: { requestId: request._id, category },
      ipAddress: req.ip
    });

    return sendSuccess(res, { request }, 'Emergency alert submitted successfully. First responders are being dispatched.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin rejects an Emergency Request (Admin only)
 */
const rejectEmergencyRequest = async (req, res, next) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);

    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    if (request.status === EMERGENCY_STATUS.COMPLETED || request.status === EMERGENCY_STATUS.CANCELLED || request.status === EMERGENCY_STATUS.REJECTED) {
      return next(new AppError('Incident is already resolved, cancelled, or rejected', 400));
    }

    const oldStatus = request.status;
    request.status = EMERGENCY_STATUS.REJECTED;

    // Unassign volunteer if any
    const oldVolunteer = request.assignedVolunteer;
    request.assignedVolunteer = null;
    await request.save();

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'ADMIN_REJECT_EMERGENCY',
      details: { requestId: request._id, oldStatus },
      ipAddress: req.ip
    });

    // Notify Reporter/User
    await createAndSendNotification({
      title: 'Emergency Request Rejected',
      message: `Your emergency request "${request.title}" has been rejected by administrators.`,
      type: 'status_change',
      recipient: request.createdBy,
      referenceId: request._id
    });

    // Notify Volunteer if assigned
    if (oldVolunteer) {
      await createAndSendNotification({
        title: 'Mission Cancelled',
        message: `Your assigned incident "${request.title}" has been cancelled by administrators.`,
        type: 'system',
        recipient: oldVolunteer,
        referenceId: request._id
      });
    }

    return sendSuccess(res, { request }, 'Emergency request rejected successfully');
  } catch (error) {
    next(error);
  }
};

const confirmEmergencyResolution = async (req, res, next) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);

    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    if (request.status !== EMERGENCY_STATUS.COMPLETED) {
      return next(new AppError('Only completed rescue requests can be confirmed', 400));
    }

    request.status = EMERGENCY_STATUS.CONFIRMED;
    await request.save();

    // Notify Reporter (Victim)
    await createAndSendNotification({
      title: 'Rescue Resolution Confirmed',
      message: `Administrators have verified and confirmed the resolution of your emergency request: "${request.title}".`,
      type: 'rescue_confirmed',
      recipient: request.createdBy,
      referenceId: request._id
    });

    // Notify Volunteer
    if (request.assignedVolunteer) {
      await createAndSendNotification({
        title: 'Mission Resolution Confirmed',
        message: `Administrators have reviewed and confirmed the resolution of your mission: "${request.title}". Thank you for your service!`,
        type: 'rescue_confirmed',
        recipient: request.assignedVolunteer,
        referenceId: request._id
      });
    }

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'CONFIRM_RESOLUTION',
      details: { requestId: request._id },
      ipAddress: req.ip
    });

    return sendSuccess(res, { request }, 'Resolution confirmed and closed successfully.');
  } catch (error) {
    next(error);
  }
};

const rateVolunteer = async (req, res, next) => {
  try {
    const { rating } = req.body;
    const request = await EmergencyRequest.findById(req.params.id);

    if (!request) {
      return next(new AppError('Emergency request not found', 404));
    }

    // Verify requesting user is the one who created the emergency request
    if (request.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You are not authorized to rate this rescue operation', 403));
    }

    // Verify request is completed or confirmed
    if (!['completed', 'confirmed'].includes(request.status)) {
      return next(new AppError('Rescue operation must be completed before rating', 400));
    }

    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Please provide a valid rating between 1 and 5', 400));
    }

    request.rating = rating;
    await request.save();

    // Notify Volunteer
    if (request.assignedVolunteer) {
      await createAndSendNotification({
        title: 'New Rating Feedback Received',
        message: `You received a ${rating}-star rating feedback for the mission: "${request.title}".`,
        type: 'status_change',
        recipient: request.assignedVolunteer,
        referenceId: request._id
      });
    }

    // Notify Admins
    await createAndSendNotification({
      title: 'Volunteer Rated',
      message: `Volunteer received a ${rating}-star rating for the mission: "${request.title}".`,
      type: 'status_change',
      role: ROLES.ADMIN,
      referenceId: request._id
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'RATE_VOLUNTEER',
      details: { requestId: request._id, volunteerId: request.assignedVolunteer, rating },
      ipAddress: req.ip
    });

    return sendSuccess(res, { request }, 'Volunteer rated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmergencyRequest,
  getEmergencyRequests,
  getEmergencyRequestDetails,
  updateEmergencyRequest,
  cancelEmergencyRequest,
  assignVolunteer,
  updateRescueStatus,
  getPublicStats,
  createGuestEmergencyRequest,
  rejectEmergencyRequest,
  confirmEmergencyResolution,
  rateVolunteer
};
