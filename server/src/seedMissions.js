const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const EmergencyRequest = require('./models/EmergencyRequest');
const { ROLES, EMERGENCY_STATUS } = require('./constants');

const seedMissions = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/disaster_response';
    await mongoose.connect(mongoUri);
    console.log('Connected to database for seeding mission...');

    // 1. Create a Volunteer (Approved)
    const volunteerEmail = 'volunteer1@disaster.com';
    let volunteer = await User.findOne({ email: volunteerEmail });
    if (!volunteer) {
      volunteer = await User.create({
        name: 'Jane Smith (Approved Volunteer)',
        email: volunteerEmail,
        mobile: '7777777777',
        password: 'volunteerpassword',
        role: ROLES.VOLUNTEER,
        isApproved: true,
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [80.2600, 13.0800]
        }
      });
      console.log('Created Volunteer:', volunteerEmail);
    }

    // 2. Create a Victim
    const victimEmail = 'victim@disaster.com';
    let victim = await User.findOne({ email: victimEmail });
    if (!victim) {
      victim = await User.create({
        name: 'John Doe (Victim)',
        email: victimEmail,
        mobile: '8888888888',
        password: 'victimpassword',
        role: ROLES.USER,
        isApproved: true,
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [80.2707, 13.0827]
        }
      });
      console.log('Created Victim:', victimEmail);
    }

    // 3. Create a Completed Emergency Request
    const requestTitle = 'Flooded Residential Area';
    await EmergencyRequest.deleteMany({ title: requestTitle }); // clear previous test request

    const request = await EmergencyRequest.create({
      title: requestTitle,
      description: 'Water entering ground floor houses. Families stranded.',
      category: 'flood',
      severity: 'high',
      emergencyContact: '9876543210',
      location: {
        type: 'Point',
        coordinates: [80.2707, 13.0827]
      },
      status: EMERGENCY_STATUS.COMPLETED,
      assignedVolunteer: volunteer._id,
      createdBy: victim._id,
      resolutionReport: 'Evacuated families safely to temporary camp.',
      resolutionImage: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=500' // beautiful flood image
    });
    console.log('Created Completed Emergency Request:', request.title);

    console.log('Missions seeded successfully! 🌱');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedMissions();
