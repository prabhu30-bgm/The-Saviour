const { body } = require('express-validator');
const validateResults = require('./validateResults');
const { EMERGENCY_CATEGORIES, SEVERITY_LEVELS } = require('../constants');

const createEmergencyValidator = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),

  body('description')
    .notEmpty().withMessage('Description is required')
    .trim(),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(EMERGENCY_CATEGORIES).withMessage(`Category must be one of: ${EMERGENCY_CATEGORIES.join(', ')}`),

  body('severity')
    .notEmpty().withMessage('Severity is required')
    .isIn(SEVERITY_LEVELS).withMessage(`Severity must be one of: ${SEVERITY_LEVELS.join(', ')}`),

  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid float between -90 and 90'),

  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid float between -180 and 180'),

  body('emergencyContact')
    .notEmpty().withMessage('Emergency contact mobile is required')
    .trim()
    .matches(/^\d{10}$/).withMessage('Emergency contact must be exactly 10 digits'),

  validateResults
];

module.exports = {
  createEmergencyValidator
};
