import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial notifications when user is logged in
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.status === 'success') {
        const list = res.data.data.notifications;
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch initial notifications:', error.message);
    }
  };

  useEffect(() => {
    if (!user) {
      // Disconnect socket if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Connect to Socket.IO server
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('accessToken')
      },
      transports: ['websocket'] // Force websocket for stability
    });

    setSocket(newSocket);
    fetchNotifications();

    newSocket.on('connect', () => {
      console.log('Socket.IO connection established with server');
    });

    // Listen for real-time notifications
    newSocket.on('notification', (newNotif) => {
      console.log('Received real-time notification:', newNotif);
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Clean up connections on unmount/user change
    return () => {
      newSocket.disconnect();
      console.log('Socket.IO disconnected');
    };
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      const res = await api.patch(`/notifications/${notificationId}/read`);
      if (res.data.status === 'success') {
        setNotifications(prev => 
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await api.patch('/notifications/mark-all-read');
      if (res.data.status === 'success') {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error.message);
    }
  };

  const value = {
    socket,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
