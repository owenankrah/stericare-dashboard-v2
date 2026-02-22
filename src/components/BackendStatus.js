import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { checkBackendHealth } from '../lib/api';

/**
 * BACKEND STATUS INDICATOR
 * Shows connection status to backend API
 * Handles Render free tier wake-up (30-90 seconds)
 */

const BackendStatus = ({ darkMode }) => {
  const [status, setStatus] = useState('checking'); // checking, waking, connected, failed
  const [attempts, setAttempts] = useState(0);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    let mounted = true;
    let checkInterval;

    const checkStatus = async () => {
      if (!mounted) return;

      try {
        const currentAttempt = attempts + 1;
        console.log(`[BackendStatus] Checking... attempt ${currentAttempt}`);
        
        const isHealthy = await checkBackendHealth();
        
        if (!mounted) return;

        if (isHealthy) {
          console.log('[BackendStatus] Backend is online!');
          setStatus('connected');
          setLastCheck(new Date());
          clearInterval(checkInterval);
        } else {
          setAttempts(prev => prev + 1);
          
          if (currentAttempt === 1) {
            setStatus('waking');
            console.log('[BackendStatus] Backend appears offline, waiting for wake-up...');
          } else if (currentAttempt >= 18) {
            // After 90 seconds (18 attempts x 5 sec)
            setStatus('failed');
            console.error('[BackendStatus] Backend failed to wake up after 90 seconds');
            clearInterval(checkInterval);
          }
        }
      } catch (error) {
        console.error('[BackendStatus] Check failed:', error);
        setAttempts(prev => prev + 1);
      }
    };

    // Initial check
    checkStatus();

    // Check every 5 seconds until connected or failed
    if (status !== 'connected' && status !== 'failed') {
      checkInterval = setInterval(checkStatus, 5000);
    }

    return () => {
      mounted = false;
      clearInterval(checkInterval);
    };
  }, [attempts, status]);

  // Once connected, check periodically in background
  useEffect(() => {
    if (status !== 'connected') return;

    const periodicCheck = setInterval(async () => {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        console.warn('[BackendStatus] Backend went offline');
        setStatus('waking');
        setAttempts(0);
      } else {
        setLastCheck(new Date());
      }
    }, 60000); // Check every minute once connected

    return () => clearInterval(periodicCheck);
  }, [status]);

  // Don't show anything if connected
  if (status === 'connected') {
    return null;
  }

  // Show banner for checking, waking, or failed states
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${
      status === 'failed' 
        ? (darkMode ? 'bg-red-900' : 'bg-red-100')
        : (darkMode ? 'bg-yellow-900' : 'bg-yellow-100')
    } border-b ${
      status === 'failed'
        ? (darkMode ? 'border-red-700' : 'border-red-300')
        : (darkMode ? 'border-yellow-700' : 'border-yellow-300')
    } p-3 shadow-lg`}>
      <div className="flex items-center justify-center gap-3">
        {status === 'checking' && (
          <>
            <RefreshCw size={20} className="animate-spin text-yellow-600" />
            <p className={darkMode ? 'text-yellow-200' : 'text-yellow-800'}>
              Connecting to server...
            </p>
          </>
        )}
        
        {status === 'waking' && (
          <>
            <RefreshCw size={20} className="animate-spin text-yellow-600" />
            <div className="text-center">
              <p className={`font-medium ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                Waking up server... (attempt {attempts}/18)
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                Free tier backend is starting up. This may take 30-90 seconds.
              </p>
            </div>
          </>
        )}
        
        {status === 'failed' && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle size={20} className="text-red-600" />
              <p className={`font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                Server failed to wake up after 90 seconds
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setStatus('checking');
                  setAttempts(0);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry Connection
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              If this persists, the backend may be suspended. Check Render dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackendStatus;
