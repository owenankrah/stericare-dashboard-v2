import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

/**
 * NOT FOUND (404) PAGE
 * Shown when user navigates to invalid route
 */

const NotFound = ({ darkMode }) => {
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className={`mb-8 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
          <div className="text-9xl font-bold">404</div>
        </div>

        {/* Message */}
        <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Page Not Found
        </h1>
        <p className={`text-lg mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
            }`}
          >
            <ArrowLeft size={20} />
            Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Home size={20} />
            Go Home
          </button>
        </div>

        {/* Suggestions */}
        <div className={`mt-12 p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Looking for something?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className={`p-3 rounded-lg text-left transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
              }`}
            >
              <div className="font-medium">Dashboard</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                View analytics and reports
              </div>
            </button>

            <button
              onClick={() => navigate('/crm')}
              className={`p-3 rounded-lg text-left transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
              }`}
            >
              <div className="font-medium">CRM</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage customers
              </div>
            </button>

            <button
              onClick={() => navigate('/sales-invoicing')}
              className={`p-3 rounded-lg text-left transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
              }`}
            >
              <div className="font-medium">Sales & Invoicing</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create and view invoices
              </div>
            </button>

            <button
              onClick={() => navigate('/inventory')}
              className={`p-3 rounded-lg text-left transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
              }`}
            >
              <div className="font-medium">Inventory</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage stock levels
              </div>
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className={`mt-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
