const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const EmergencyRequest = require('./models/EmergencyRequest');
const Notification = require('./models/Notification');
const ActivityLog = require('./models/ActivityLog');
const { ROLES } = require('./constants');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/disaster_response';
    await mongoose.connect(mongoUri);
    console.log('Connected to database for seeding...');

    // Clear existing collections to start clean
    await User.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    console.log('Cleared all database collections (Users, EmergencyRequests, Notifications, ActivityLogs).');

    // 1. Seed Admins
    const admin = await User.create({
      name: 'Central Admin Commander',
      email: 'admin@disaster.com',
      mobile: '9876543210',
      password: 'adminpassword',
      role: ROLES.ADMIN,
      isApproved: true,
      status: 'active'
    });
    console.log('Seeded Admin: admin@disaster.com / adminpassword');

    const admin2 = await User.create({
      name: 'Basavaprabhu Kudenatti (Admin)',
      email: 'basavaprabhukudenatti@gmail.com',
      mobile: '9876543211',
      password: 'Prabhuman@1310',
      role: ROLES.ADMIN,
      isApproved: true,
      status: 'active'
    });
    console.log('Seeded Admin: basavaprabhukudenatti@gmail.com / Prabhuman@1310');

    const admin3 = await User.create({
      name: 'Abhijeet Gavane (Admin)',
      email: 'abhijeetGavane@gmail.com',
      mobile: '9876543212',
      password: 'Abhijeet@2026',
      role: ROLES.ADMIN,
      isApproved: true,
      status: 'active'
    });
    console.log('Seeded Admin: abhijeetGavane@gmail.com / Abhijeet@2026');

    // 2. Seed Victim/User
    const victim = await User.create({
      name: 'John Doe (Victim)',
      email: 'victim@disaster.com',
      mobile: '8888888888',
      password: 'victimpassword',
      role: ROLES.USER,
      isApproved: true,
      status: 'active',
      location: {
        type: 'Point',
        coordinates: [80.2707, 13.0827] // Chennai coordinates
      }
    });
    console.log('Seeded Victim/User: victim@disaster.com / victimpassword');

    // 3. Seed Approved Volunteer
    const approvedVolunteer = await User.create({
      name: 'Jane Smith (Approved Volunteer)',
      email: 'volunteer1@disaster.com',
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
    console.log('Seeded Approved Volunteer: volunteer1@disaster.com / volunteerpassword');

    // 4. Seed Pending Volunteer
    const pendingVolunteer = await User.create({
      name: 'Bob Miller (Pending Volunteer)',
      email: 'volunteer2@disaster.com',
      mobile: '6666666666',
      password: 'volunteerpassword',
      role: ROLES.VOLUNTEER,
      isApproved: false,
      status: 'active',
      location: {
        type: 'Point',
        coordinates: [80.2800, 13.0900]
      }
    });
    console.log('Seeded Pending Volunteer: volunteer2@disaster.com / volunteerpassword');

    // 5. Seed Guest Reporter (for anonymous SOS submissions)
    const guestReporter = await User.create({
      name: 'Anonymous Guest Reporter',
      email: 'guest@thesaviour.com',
      mobile: '0000000000',
      password: 'guestreporterpassword',
      role: ROLES.USER,
      isApproved: true,
      status: 'active'
    });
    console.log('Seeded System Guest User: guest@thesaviour.com / guestreporterpassword');

    console.log('The Saviour database seeded successfully! 🌱');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
