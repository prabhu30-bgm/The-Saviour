const ROLES = {
  USER: 'user',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin'
};

const EMERGENCY_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',       // Volunteer Accepted
  REACHED: 'reached',         // Volunteer Reached
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

const EMERGENCY_CATEGORIES = [
  'medical',
  'fire',
  'flood',
  'earthquake',
  'accident',
  'other'
];

const SEVERITY_LEVELS = [
  'low',
  'medium',
  'high',
  'critical'
];

module.exports = {
  ROLES,
  EMERGENCY_STATUS,
  EMERGENCY_CATEGORIES,
  SEVERITY_LEVELS
};
