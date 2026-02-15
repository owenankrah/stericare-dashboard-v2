import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * PROTECTED ROUTE COMPONENT
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 * Preserves intended destination for redirect after login
 */

const ProtectedRoute = ({ children, isAuthenticated }) => {
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, but save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
