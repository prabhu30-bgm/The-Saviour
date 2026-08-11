const { body } = require('express-validator');
const validateResults = require('./validateResults');
const { ROLES } = require('../constants');

const registerValidator = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('mobile')
    .notEmpty().withMessage('Mobile number is required')
    .trim()
    .matches(/^\d{10}$/).withMessage('Mobile number must be exactly 10 digits'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('role')
    .notEmpty().withMessage('Role selection is required')
    .isIn([ROLES.USER, ROLES.VOLUNTEER]).withMessage('Public registration only allowed for users and volunteers'),

  validateResults
];

const loginValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Must be a valid email address'),

  body('password')
    .notEmpty().withMessage('Password is required'),

  body('role')
    .notEmpty().withMessage('Role selection is required')
    .isIn(Object.values(ROLES)).withMessage('Invalid role selected'),

  validateResults
];

const forgotPasswordValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  validateResults
];

const resetPasswordValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  validateResults
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};
