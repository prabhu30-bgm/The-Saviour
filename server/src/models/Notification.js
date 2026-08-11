const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required']
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'new_request',
      'volunteer_assigned',
      'volunteer_accepted',
      'volunteer_rejected',
      'volunteer_reached',
      'rescue_started',
      'rescue_completed',
      'rescue_confirmed',
      'status_change',
      'user_cancelled',
      'system',
      'approval_status'
    ]
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null means broadcast or role-targeted
  },
  role: {
    type: String,
    enum: [...Object.values(ROLES), null],
    default: null // Optional role target (e.g. notify all admins)
  },
  read: {
    type: Boolean,
    default: false
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyRequest',
    default: null
  }
}, {
  timestamps: true
});

// Indexing for faster reads on notifications
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ role: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
