import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { checkBackendHealth, API_BASE_URL } from '../lib/api';

/**
 * BACKEND STATUS INDICATOR
 * Shows connection status to backend API
 */

const BackendStatus = ({ darkMode }) => {
  const [status, setStatus] = useState('checking'); // checking, connected, disconnected
  const [lastCheck, setLastCheck] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkStatus();
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    
    // First attempt
    let result = await checkBackendHealth();
    
    // If failed, it might be waking up - retry after delay
    if (!result.success) {
      console.log('Backend appears offline, waiting for wake-up...');
      setStatus('waking');
      
      // Wait 5 seconds and retry (Render cold start)
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await checkBackendHealth();
      
      // If still failed, one more retry after 10 seconds
      if (!result.success) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        result = await checkBackendHealth();
      }
    }
    
    setStatus(result.success ? 'connected' : 'disconnected');
    setLastCheck(new Date());
    setChecking(false);
  };

  if (status === 'checking' || status === 'waking') {
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
      }`}>
        <RefreshCw size={12} className="animate-spin" />
        <span>{status === 'waking' ? 'Waking backend...' : 'Checking backend...'}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs cursor-pointer ${
        status === 'connected'
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}
      onClick={checkStatus}
      title={`Last checked: ${lastCheck?.toLocaleTimeString() || 'Never'}\nClick to refresh`}
    >
      {checking ? (
        <RefreshCw size={12} className="animate-spin" />
      ) : status === 'connected' ? (
        <Wifi size={12} />
      ) : (
        <WifiOff size={12} />
      )}
      <span>
        {status === 'connected' ? 'Backend connected' : 'Backend offline'}
      </span>
    </div>
  );
};

export default BackendStatus;
