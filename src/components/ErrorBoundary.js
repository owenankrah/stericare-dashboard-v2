// src/components/ErrorBoundary.js
// Prevents app crashes by catching errors and showing fallback UI

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // ✅ Log error to console
    console.error('❌ Error Boundary caught:', error);
    console.error('Error Info:', errorInfo);
    
    // ✅ Track error count
    this.setState(prev => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1
    }));
    
    // ✅ Log to external service (optional)
    // this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('Error logged:', errorData);
    // fetch('/api/log-error', { method: 'POST', body: JSON.stringify(errorData) });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, darkMode } = this.props;

    if (hasError) {
      // ✅ Show user-friendly error page
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className={`max-w-2xl w-full rounded-xl shadow-lg p-8 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className={`text-2xl font-bold text-center mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Oops! Something went wrong
            </h1>

            {/* Description */}
            <p className={`text-center mb-6 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Don't worry, this happens sometimes. Try one of the options below to get back on track.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <RefreshCw size={18} />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <Home size={18} />
                Go Home
              </button>
            </div>

            {/* Error Details (collapsible) */}
            <details className={`rounded-lg p-4 ${
              darkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
              <summary className={`cursor-pointer font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Error Details (for developers)
              </summary>
              
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="mb-2">
                  <strong>Error Count:</strong> {errorCount}
                </div>
                
                {error && (
                  <div className="mb-2">
                    <strong>Error:</strong>
                    <pre className={`mt-1 p-2 rounded overflow-auto text-xs ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      {error.toString()}
                    </pre>
                  </div>
                )}
                
                {error?.stack && (
                  <div className="mb-2">
                    <strong>Stack Trace:</strong>
                    <pre className={`mt-1 p-2 rounded overflow-auto text-xs max-h-40 ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      {error.stack}
                    </pre>
                  </div>
                )}
                
                {errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className={`mt-1 p-2 rounded overflow-auto text-xs max-h-40 ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>

            {/* Help Text */}
            <p className={`text-center text-sm mt-6 ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              If this problem persists, please contact support or try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
