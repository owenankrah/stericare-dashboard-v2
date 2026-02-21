import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './Login';
import AppSelector from './AppSelector';
import { supabase } from './lib/supabase';
import ResetPassword from './ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { startKeepAlive, stopKeepAlive, prefetchCommonData } from './lib/api';

// ==========================================
// LAZY LOADING - Load modules only when needed
// This reduces initial bundle size by ~70-80%
// ==========================================

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const SalesInvoicingModule = lazy(() => import('./components/SalesInvoicingModule'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const CRMModule = lazy(() => import('./components/CRMModule'));
const InventoryManagement = lazy(() => import('./components/InventoryManagement'));
const InvoiceDetail = lazy(() => import('./components/InvoiceDetail'));
const CustomerDetail = lazy(() => import('./components/CustomerDetail'));
const NotFound = lazy(() => import('./components/NotFound'));
const CRMDashboard = lazy(() => import('./components/CRM/CRMDashboard'));
const CustomerDetailCRM = lazy(() => import('./components/CRM/CustomerDetailCRM'));
const SalesPipeline = lazy(() => import('./components/CRM/SalesPipeline'));
const DealManager = lazy(() => import('./components/CRM/DealManager'));

// Loading fallback component
const LoadingFallback = ({ darkMode }) => (
  <div className={`min-h-screen flex items-center justify-center ${
    darkMode ? 'bg-gray-900' : 'bg-gray-50'
  }`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
      <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Loading module...
      </p>
    </div>
  </div>
);

function App() {
  const navigate = useNavigate(); // ✅ Now works because BrowserRouter is in index.js
  
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  // Keep backend alive and prefetch common data
  useEffect(() => {
    startKeepAlive();
    prefetchCommonData();
    return () => stopKeepAlive();
  }, []);

  // Check URL for password reset
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Password reset will be handled by route
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    try {
      localStorage.setItem('darkMode', darkMode);
    } catch (error) {
      console.error('Failed to save dark mode preference:', error);
    }
  }, [darkMode]);

  // Auth state management
  useEffect(() => {
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          setCurrentUser({ ...session.user, profile });
          setIsAuthenticated(true);
          console.log('✅ User authenticated:', session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentUser(null);
          console.log('✅ User signed out');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      console.log('🔍 Checking for existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Found session:', session.user.email);
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        setCurrentUser({ ...session.user, profile });
        setIsAuthenticated(true);
      } else {
        console.log('❌ No session found');
      }
    } catch (error) {
      console.error('Session error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (user) => {
    console.log('🔐 Login callback received:', user.email);
    
    setIsAuthenticated(true);
    setCurrentUser(user);
    
    console.log('✅ Auth state updated');
    
    // Return promise so Login.js can await
    return Promise.resolve();
  };

  const handleLogout = async () => {
  console.log('🚪 Logout initiated...');
  
  try {
    // Clear local state FIRST
    setIsAuthenticated(false);
    setCurrentUser(null);
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Then sign out from Supabase (might fail, that's OK)
    try {
      await supabase.auth.signOut();
      console.log('✅ Supabase signOut complete');
    } catch (supabaseError) {
      // Ignore AbortError - we're logging out anyway
      console.log('⚠️ Supabase signOut error (ignored):', supabaseError.message);
    }
    
    // Navigate to login
    navigate('/login');
    console.log('✅ Logged out successfully');
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Force logout even if everything fails
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
};

  // Show loading screen while checking session
  if (loading) {
    return <LoadingFallback darkMode={darkMode} />;
  }

  return (
    <ErrorBoundary darkMode={darkMode}>
      <div className="App">
        <Suspense fallback={<LoadingFallback darkMode={darkMode} />}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login 
                    onLogin={handleLogin} 
                    darkMode={darkMode} 
                    setDarkMode={setDarkMode} 
                  />
                )
              } 
            />
            
            <Route 
              path="/reset-password" 
              element={
                <ResetPassword 
                  darkMode={darkMode} 
                  onSuccess={() => window.location.href = '/login'} 
                />
              } 
            />

            {/* Protected Routes - App Selector (Home) */}
            <Route
              path="/"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AppSelector
                    user={currentUser}
                    onLogout={handleLogout}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                  />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Main Modules */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AnalyticsDashboard darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales-invoicing"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <SalesInvoicingModule darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            {/* CRM Routes */}
            <Route
              path="/crm"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <CRMDashboard darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/customer/:id"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <CustomerDetailCRM darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/pipeline"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <SalesPipeline 
                    darkMode={darkMode} 
                    currentUser={currentUser} 
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/deal/new"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <DealManager 
                    darkMode={darkMode} 
                    currentUser={currentUser} 
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/deal/:id/edit"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <DealManager 
                    darkMode={darkMode} 
                    currentUser={currentUser} 
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <InventoryManagement darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/user-management"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <UserManagement 
                    darkMode={darkMode} 
                    currentUser={currentUser} 
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/invoice/:invoiceNumber"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <InvoiceDetail darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            {/* Catch-all Route - 404 */}
            <Route path="*" element={<NotFound darkMode={darkMode} />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;