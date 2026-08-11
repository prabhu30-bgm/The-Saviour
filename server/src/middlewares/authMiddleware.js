const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/token');
const { ROLES } = require('../constants');

/**
 * Protect routes by verifying JWT access tokens
 */
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Fallback to cookie
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your token has expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if user is suspended
    if (currentUser.status === 'suspended') {
      return next(new AppError('Your account has been suspended. Please contact administration.', 403));
    }

    // Grant access
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict routes to specific user roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

/**
 * Ensure the volunteer is approved by an Admin
 */
const isApprovedVolunteer = (req, res, next) => {
  if (req.user.role === ROLES.VOLUNTEER && !req.user.isApproved) {
    return next(
      new AppError('Your volunteer registration is pending administrator approval.', 403)
    );
  }
  next();
};

module.exports = {
  protect,
  restrictTo,
  isApprovedVolunteer
};
