const Notification = require('../models/Notification');
const { sendSuccess } = require('../utils/response');

/**
 * Retrieve notifications for the currently logged-in user
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Fetch alerts targeting the user specifically OR their role group, sorted by newest first
    const notifications = await Notification.find({
      $or: [
        { recipient: userId },
        { role: userRole }
      ]
    })
    .populate('referenceId')
    .sort({ createdAt: -1 })
    .limit(50); // limit to 50 recent notifications

    return sendSuccess(res, { notifications }, 'Notifications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ recipient: req.user._id }, { role: req.user.role }]
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ status: 'fail', message: 'Notification not found' });
    }

    return sendSuccess(res, { notification }, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all user notifications as read
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    await Notification.updateMany(
      {
        $or: [
          { recipient: userId },
          { role: userRole }
        ],
        read: false
      },
      { read: true }
    );

    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
