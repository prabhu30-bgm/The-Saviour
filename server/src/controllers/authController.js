const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token');
const { ROLES } = require('../constants');
const ActivityLog = require('../models/ActivityLog');
const crypto = require('crypto');

/**
 * Register User / Volunteer
 */
const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new AppError('A user with this email address already exists.', 400));
    }

    // Check if mobile already exists
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return next(new AppError('A user with this mobile number already exists.', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      mobile,
      password,
      role
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Remove password and refreshToken from response output
    user.password = undefined;
    user.refreshToken = undefined;

    // Log Activity
    await ActivityLog.create({
      user: user._id,
      action: 'REGISTER',
      details: { role: user.role },
      ipAddress: req.ip
    });

    return sendSuccess(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Login User / Volunteer / Admin
 */
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // Check if user exists (explicitly select password)
    const user = await User.findOne({ email }).select('+password +status');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Validate password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Verify role matches selected role
    if (user.role !== role) {
      return next(new AppError(`You are not registered as a ${role}`, 401));
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return next(new AppError('Your account has been suspended. Please contact admin.', 403));
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set HTTPOnly cookie for refresh token (optional enhancement)
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    user.password = undefined;
    user.refreshToken = undefined;
    user.status = undefined;

    // Log Activity
    await ActivityLog.create({
      user: user._id,
      action: 'LOGIN',
      details: { role: user.role },
      ipAddress: req.ip
    });

    return sendSuccess(res, { user, accessToken, refreshToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Token Refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return next(new AppError('Invalid refresh token session', 401));
    }

    // Check suspension
    if (user.status === 'suspended') {
      return next(new AppError('Your account has been suspended.', 403));
    }

    // Generate new access and refresh tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    user.refreshToken = undefined;

    return sendSuccess(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Clear refresh token in database
    await User.findByIdAndUpdate(userId, { refreshToken: null });

    // Clear cookie
    res.clearCookie('token');

    // Log Activity
    await ActivityLog.create({
      user: userId,
      action: 'LOGOUT',
      ipAddress: req.ip
    });

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    const message = 'If an account exists for that email, a password reset link has been created.';
    if (!user) return sendSuccess(res, null, message);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    if (process.env.NODE_ENV === 'production') {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save({ validateBeforeSave: false });
      return next(new AppError('Password reset email delivery is not configured.', 503));
    }

    return sendSuccess(res, { resetUrl }, message);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      return next(new AppError('Password reset token is invalid or has expired.', 400));
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null;
    await user.save();

    return sendSuccess(res, null, 'Password reset successful. You can now login with your new password.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (user && user.role === ROLES.VOLUNTEER) {
      const EmergencyRequest = require('../models/EmergencyRequest');
      const ratedMissions = await EmergencyRequest.find({
        assignedVolunteer: user._id,
        rating: { $ne: null }
      });
      if (ratedMissions.length > 0) {
        const totalRating = ratedMissions.reduce((sum, m) => sum + m.rating, 0);
        user.averageRating = (totalRating / ratedMissions.length).toFixed(1);
        user.totalRatingsCount = ratedMissions.length;
      } else {
        user.averageRating = null;
        user.totalRatingsCount = 0;
      }
    }
    return sendSuccess(res, { user }, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getProfile
};
