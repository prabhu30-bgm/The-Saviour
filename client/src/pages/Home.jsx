import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard matching user role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'volunteer':
      return <Navigate to="/volunteer" replace />;
    case 'user':
    default:
      return <Navigate to="/user" replace />;
  }
};

export default Home;
