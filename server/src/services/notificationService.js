const Notification = require('../models/Notification');
const socketService = require('./socketService');

/**
 * Creates a notification in the database and broadcasts it in real-time
 * @param {Object} params - Notification attributes
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Category of notification (e.g. new_request, rescue_completed)
 * @param {string} [params.recipient] - MongoDB User ID of target recipient
 * @param {string} [params.role] - Target role group (e.g. admin)
 * @param {string} [params.referenceId] - MongoDB Emergency Request ID
 */
const createAndSendNotification = async ({ title, message, type, recipient = null, role = null, referenceId = null }) => {
  try {
    const notification = await Notification.create({
      title,
      message,
      type,
      recipient,
      role,
      referenceId
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('referenceId')
      .lean();

    // Broadcast in real-time
    if (recipient) {
      socketService.sendToUser(recipient.toString(), 'notification', populatedNotification);
    } else if (role) {
      socketService.sendToRole(role, 'notification', populatedNotification);
    } else {
      socketService.sendToAll('notification', populatedNotification);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create or send notification:', error.message);
  }
};

module.exports = {
  createAndSendNotification
};
