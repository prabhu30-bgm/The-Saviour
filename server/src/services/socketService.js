const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../constants');

let io = null;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // We can restrict this in production (e.g. process.env.CLIENT_URL)
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // JWT Middleware for Socket Authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecretjwtkeyforcommunitydisasterresponseplatform123'
      );

      const user = await User.findById(decoded.id).select('+status');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.status === 'suspended') {
        return next(new Error('Authentication error: Account suspended'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;

    console.log(`Socket Connected: User ${socket.user.name} (${userRole}) [Socket: ${socket.id}]`);

    // Join personal room and role-based room
    socket.join(`user:${userId}`);
    socket.join(`role:${userRole}`);

    // Update user connection state in DB
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });

    // Broadcast updated volunteer list to admins if it is a volunteer connecting
    if (userRole === ROLES.VOLUNTEER) {
      io.to(`role:${ROLES.ADMIN}`).emit('volunteer-status-change', {
        userId,
        isOnline: true
      });
    }

    // Handle incoming volunteer location updates
    socket.on('update-location', async (coords) => {
      // coords format: { latitude, longitude }
      const { latitude, longitude } = coords;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        try {
          await User.findByIdAndUpdate(userId, {
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            }
          });

          // Broadcast to admin room for live map updates
          io.to(`role:${ROLES.ADMIN}`).emit('volunteer-location-updated', {
            volunteerId: userId,
            name: socket.user.name,
            coordinates: [longitude, latitude]
          });
        } catch (error) {
          console.error(`Failed to update volunteer location for ${userId}:`, error.message);
        }
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: User ${socket.user.name} [Socket: ${socket.id}]`);
      await User.findByIdAndUpdate(userId, { isOnline: false, socketId: null });

      if (userRole === ROLES.VOLUNTEER) {
        io.to(`role:${ROLES.ADMIN}`).emit('volunteer-status-change', {
          userId,
          isOnline: false
        });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call init() first.');
  }
  return io;
};

/**
 * Send event to a specific user
 */
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Send event to all users with a specific role
 */
const sendToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

/**
 * Broadcast event to all connections
 */
const sendToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  init,
  getIO,
  sendToUser,
  sendToRole,
  sendToAll
};
