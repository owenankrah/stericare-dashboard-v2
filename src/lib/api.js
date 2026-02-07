/**
 * API CONFIGURATION
 * Central configuration for all backend API endpoints
 */

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Environment variable takes priority
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Development: localhost backend
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }

  // Production: use your deployed backend URL
  // You can also use relative URL if backend is on same domain
  return 'http://localhost:3001'; // Change this to your Render URL
};

export const API_BASE_URL = getApiBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Health & Info
  HEALTH: `${API_BASE_URL}/health`,
  INFO: `${API_BASE_URL}/`,
  
  // Invoice Operations
  INVOICE_PDF: `${API_BASE_URL}/api/invoices/pdf`,
  INVOICE_EMAIL: `${API_BASE_URL}/api/invoices/email`,
  
  // Admin Operations
  CREATE_USER: `${API_BASE_URL}/api/admin/users`,
};

// Helper function to check backend health
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH);
    if (!response.ok) {
      throw new Error('Backend not responding');
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Backend server is not running or not reachable'
    };
  }
};

// Helper function to wake up backend (for free tier Render that sleeps)
export const wakeUpBackend = async (maxRetries = 3, retryDelay = 2000) => {
  console.log('🔄 Waking up backend server...');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(API_ENDPOINTS.HEALTH, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend is awake!', data);
        return { success: true, data, attempts: attempt };
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelay / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  console.error('❌ Failed to wake up backend after', maxRetries, 'attempts');
  return { 
    success: false, 
    error: 'Backend did not respond',
    message: 'Backend server is taking too long to start. Please try again in a minute.'
  };
};

// Helper function to generate PDF
export const generateInvoicePDF = async (invoiceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.INVOICE_PDF, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invoiceId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'PDF generation failed');
    }

    const blob = await response.blob();
    return { success: true, blob };
  } catch (error) {
    console.error('PDF generation error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to generate PDF. Make sure backend server is running.'
    };
  }
};

// Helper function to download blob as file
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Helper function to create user
export const createUser = async (userData) => {
  try {
    const response = await fetch(API_ENDPOINTS.CREATE_USER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'User creation failed');
    }

    return { success: true, data };
  } catch (error) {
    console.error('User creation error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to create user. Make sure backend server is running.'
    };
  }
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  checkBackendHealth,
  wakeUpBackend,
  generateInvoicePDF,
  downloadBlob,
  createUser,
};
