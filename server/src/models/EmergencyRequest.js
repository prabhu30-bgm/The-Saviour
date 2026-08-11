const mongoose = require('mongoose');
const { EMERGENCY_STATUS, EMERGENCY_CATEGORIES, SEVERITY_LEVELS } = require('../constants');

const EmergencyRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    enum: EMERGENCY_CATEGORIES,
    required: [true, 'Category is required']
  },
  severity: {
    type: String,
    enum: SEVERITY_LEVELS,
    required: [true, 'Severity level is required']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(arr) {
          return arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number';
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  },
  image: {
    type: String,
    default: null
  },
  emergencyContact: {
    type: String,
    required: [true, 'Emergency contact number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit mobile number!`
    }
  },
  status: {
    type: String,
    enum: Object.values(EMERGENCY_STATUS),
    default: EMERGENCY_STATUS.PENDING
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Request creator is required']
  },
  resolutionReport: {
    type: String,
    default: null
  },
  resolutionImage: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  }
}, {
  timestamps: true
});

// Geo-index for spatial queries (finding near disasters)
EmergencyRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('EmergencyRequest', EmergencyRequestSchema);
