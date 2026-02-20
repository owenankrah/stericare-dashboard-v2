import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Lock, Mail } from 'lucide-react';
import { supabase } from './lib/supabase';
import ForgotPassword from './ForgotPassword';

/**
 * LOGIN COMPONENT - With React Router
 * Features:
 * - Automatic redirect after successful login
 * - Preserves intended destination (redirect to page user was trying to access)
 * - Forgot password integration
 */

const Login = ({ onLogin, darkMode, setDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoadingMessage('Signing in...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setLoadingMessage('Loading profile...');

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userData = {
        ...data.user,
        profile: profile || { 
          full_name: data.user.email.split('@')[0], 
          role: 'sales_rep' 
        }
      };

      // Call parent onLogin handler and wait for it
      await onLogin(userData);
      
      console.log('✅ onLogin complete');

      // Wait for state to propagate
      await new Promise(resolve => setTimeout(resolve, 150));

      // Redirect after successful login
      const from = location.state?.from?.pathname || '/';
      console.log('🚀 Navigating to:', from);
      navigate(from, { replace: true });

    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Show Forgot Password screen
  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-6 right-6 p-3 rounded-lg ${
          darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-700'
        } shadow-lg z-10`}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className={`w-full max-w-md mx-4 p-8 rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <div className="text-center mb-8">
          <div className={`inline-flex w-16 h-16 rounded-full mb-4 items-center justify-center ${
            darkMode ? 'bg-blue-900' : 'bg-blue-100'
          }`}>
            <Lock size={32} className="text-blue-600" />
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Pharma-C Portal
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </label>
            <div className="relative">
              <Mail size={20} className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="username"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <Lock size={20} className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="current-password"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Future: Remember me checkbox */}
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className={`text-sm font-medium transition-colors ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
              {error}
            </div>
          )}

          {loadingMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
            }`}>
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                {loadingMessage}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <strong>Need an account?</strong> Contact your administrator to create an account for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;