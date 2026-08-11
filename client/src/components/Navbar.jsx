import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LifeBuoy, Bell, LogOut, Check, CheckCheck, Clock, Star } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleNotifClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif._id);
    }
    // Dispatch a custom event so parent dashboards can select this request
    const event = new CustomEvent('notification-click', { detail: notif });
    window.dispatchEvent(event);
    setShowDropdown(false);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-500/10 text-red-600 border border-red-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">Admin</span>;
      case 'volunteer':
        return <span className="bg-green-100 text-primary-dark border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">Volunteer</span>;
      case 'user':
      default:
        return <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">User</span>;
    }
  };

  const getNotifIconColor = (type) => {
    switch (type) {
      case 'new_request':
        return 'text-red-500 bg-red-500/10';
      case 'volunteer_assigned':
      case 'volunteer_accepted':
        return 'text-primary bg-primary/10 border border-primary/20';
      case 'rescue_completed':
        return 'text-emerald-500 bg-emerald-500/10';
      case 'user_cancelled':
        return 'text-amber-500 bg-amber-500/10';
      default:
        return 'text-slate-400 bg-slate-100';
    }
  };

  return (
    <nav className="bg-white border-b border-slate-100 text-slate-800 py-4 px-6 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-2">
          <LifeBuoy className="text-primary h-7 w-7 stroke-[2.5] animate-spin-slow" />
          <span className="font-extrabold text-lg tracking-tight text-primary-dark">
            The Saviour
          </span>
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 text-right">
            <div>
              <p className="text-sm font-semibold text-slate-800 flex items-center justify-end space-x-1.5">
                <span>{user?.name}</span>
                {user?.role === 'volunteer' && user.averageRating && (
                  <span className="flex items-center text-amber-500 font-extrabold text-xs">
                    <Star size={12} className="fill-current mr-0.5" />
                    <span>{user.averageRating}</span>
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">{user?.email}</p>
            </div>
            {getRoleBadge(user?.role)}
          </div>

          {/* Notifications Drawer Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 text-slate-500 hover:text-slate-850 hover:bg-slate-50 border border-slate-200 rounded-xl transition relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-700">Alerts & Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-xs text-primary hover:text-primary-light flex items-center font-semibold transition"
                    >
                      <CheckCheck size={14} className="mr-1" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No notifications received yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`p-3 text-xs transition flex space-x-3 cursor-pointer ${
                          notif.read ? 'bg-white' : 'bg-green-50/15 hover:bg-slate-50'
                        }`}
                        onClick={() => handleNotifClick(notif)}
                      >
                        <div className={`p-1.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${getNotifIconColor(notif.type)}`}>
                          <LifeBuoy size={14} />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className={`font-semibold ${notif.read ? 'text-slate-400' : 'text-slate-800'}`}>
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <button className="text-primary hover:text-primary-light p-0.5">
                                <Check size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-slate-500 leading-normal break-words">{notif.message}</p>
                          <div className="flex items-center space-x-1 text-[10px] text-slate-400 pt-0.5">
                            <Clock size={10} />
                            <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 text-red-600 hover:text-white border border-red-200 hover:bg-red-600 rounded-xl transition"
            title="Log Out"
          >
            <LogOut size={20} />
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
