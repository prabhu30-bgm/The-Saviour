const User = require('../models/User');
const EmergencyRequest = require('../models/EmergencyRequest');
const ActivityLog = require('../models/ActivityLog');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');
const { ROLES } = require('../constants');
const { createAndSendNotification } = require('../services/notificationService');

/**
 * Get all users and volunteers (Admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isApproved } = req.query;
    let query = { role: { $ne: ROLES.ADMIN } }; // Exclude admins

    if (role) {
      query.role = role;
    }
    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    if (role === ROLES.VOLUNTEER) {
      const EmergencyRequest = require('../models/EmergencyRequest');
      for (let i = 0; i < users.length; i++) {
        const ratedMissions = await EmergencyRequest.find({
          assignedVolunteer: users[i]._id,
          rating: { $ne: null }
        });
        if (ratedMissions.length > 0) {
          const totalRating = ratedMissions.reduce((sum, m) => sum + m.rating, 0);
          users[i].averageRating = (totalRating / ratedMissions.length).toFixed(1);
          users[i].totalRatingsCount = ratedMissions.length;
        } else {
          users[i].averageRating = null;
          users[i].totalRatingsCount = 0;
        }
      }
    }

    return sendSuccess(res, { users }, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Approve / Suspend / Activate / Reject Volunteer status (Admin only)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { action } = req.body; // 'approve', 'reject', 'suspend', 'activate'
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return next(new AppError('User not found', 404));
    }

    if (targetUser.role === ROLES.ADMIN) {
      return next(new AppError('Administrator status cannot be modified', 400));
    }

    let title = '';
    let message = '';

    switch (action) {
      case 'approve':
        if (targetUser.role !== ROLES.VOLUNTEER) {
          return next(new AppError('Only volunteers require manual registration approval', 400));
        }
        targetUser.isApproved = true;
        targetUser.status = 'active';
        title = 'Volunteer Account Approved';
        message = 'Congratulations! Your volunteer registration has been approved. You can now accept missions and deploy.';
        break;

      case 'reject':
        if (targetUser.role !== ROLES.VOLUNTEER) {
          return next(new AppError('Only volunteers can be rejected during onboarding', 400));
        }
        targetUser.isApproved = false;
        title = 'Volunteer Registration Rejected';
        message = 'Your registration request as a volunteer has been rejected. Please verify your details.';
        break;

      case 'suspend':
        targetUser.status = 'suspended';
        title = 'Account Suspended';
        message = 'Your account has been suspended by administrators. You are restricted from accessing system actions.';
        break;

      case 'activate':
        targetUser.status = 'active';
        title = 'Account Activated';
        message = 'Your account has been reactivated. You now have full access to system features.';
        break;

      default:
        return next(new AppError('Invalid action parameters provided', 400));
    }

    await targetUser.save();

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: `ADMIN_${action.toUpperCase()}`,
      details: { targetUserId: targetUser._id, name: targetUser.name },
      ipAddress: req.ip
    });

    // Notify Target User
    await createAndSendNotification({
      title,
      message,
      type: 'approval_status',
      recipient: targetUser._id
    });

    return sendSuccess(res, { user: targetUser }, `User status updated to: ${action}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Analytics for Admin Dashboard (Admin only)
 */
const getAnalytics = async (req, res, next) => {
  try {
    // 1. Total counts
    const totalUsers = await User.countDocuments({ role: ROLES.USER });
    const totalVolunteers = await User.countDocuments({ role: ROLES.VOLUNTEER });
    const totalRequests = await EmergencyRequest.countDocuments();

    // 2. Status breakdowns
    const statusCounts = await EmergencyRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statuses = {};
    statusCounts.forEach(item => {
      statuses[item._id] = item.count;
    });

    // 3. Category breakdowns
    const categoryCounts = await EmergencyRequest.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const categories = {};
    categoryCounts.forEach(item => {
      categories[item._id] = item.count;
    });

    // 4. Severity breakdowns
    const severityCounts = await EmergencyRequest.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const severities = {};
    severityCounts.forEach(item => {
      severities[item._id] = item.count;
    });

    // 5. Recent audit/activities log
    const recentActivities = await ActivityLog.find()
      .populate('user', 'name role email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, {
      stats: {
        totalUsers,
        totalVolunteers,
        totalRequests
      },
      statusBreakdown: statuses,
      categoryBreakdown: categories,
      severityBreakdown: severities,
      recentActivities
    }, 'Analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/Remove a user (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return next(new AppError('User not found', 404));
    }

    if (targetUser.role === ROLES.ADMIN) {
      return next(new AppError('Administrator accounts cannot be deleted', 400));
    }

    // Unassign the volunteer from any active incident requests before deletion
    if (targetUser.role === ROLES.VOLUNTEER) {
      await EmergencyRequest.updateMany(
        { assignedVolunteer: targetUser._id },
        { $unset: { assignedVolunteer: "" }, status: 'pending' }
      );
    }

    await User.findByIdAndDelete(targetUser._id);

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'ADMIN_DELETE_USER',
      details: { targetUserId: targetUser._id, name: targetUser.name, role: targetUser.role },
      ipAddress: req.ip
    });

    return sendSuccess(res, null, `User ${targetUser.name} deleted successfully`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  getAnalytics,
  deleteUser
};
