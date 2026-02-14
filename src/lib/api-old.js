/**
 * API CONFIGURATION
 * Central configuration for all backend API endpoints
 */

const getApiBaseUrl = () => {
  // Use environment variable if defined (optional for testing)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Development: localhost backend
  if (process.env.NODE_ENV === 'development') {
  

  // Production backend on Render
  return 'https://stericare-dashboard-v2-1.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  INFO: `${API_BASE_URL}/`,
  INVOICE_PDF: `${API_BASE_URL}/api/invoices/pdf`,
  INVOICE_EMAIL: `${API_BASE_URL}/api/invoices/email`,
  CREATE_USER: `${API_BASE_URL}/api/admin/users`,
};

// Check backend health
export const checkBackendHealth = async () => {
  try {
    console.log('Checking backend at', API_ENDPOINTS.HEALTH);
    const response = await fetch(API_ENDPOINTS.HEALTH, { cache: 'no-store' });
    if (!response.ok) throw new Error('Backend not responding');
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { success: false, error: error.message };
  }
};

// Wake up backend (Render free-tier cold start)
export const wakeUpBackend = async (maxRetries = 3, retryDelay = 2000) => {
  console.log('🔄 Waking up backend server...');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(API_ENDPOINTS.HEALTH, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
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
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  console.error('❌ Failed to wake up backend after', maxRetries, 'attempts');
  return { success: false, error: 'Backend did not respond' };
};

// Generate PDF
export const generateInvoicePDF = async (invoiceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.INVOICE_PDF, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    return { success: false, error: error.message };
  }
};

// Download blob as file
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

// Create user
export const createUser = async (userData) => {
  try {
    const response = await fetch(API_ENDPOINTS.CREATE_USER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'User creation failed');
    return { success: true, data };
  } catch (error) {
    console.error('User creation error:', error);
    return { success: false, error: error.message };
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
