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
    return 'https://stericare-dashboard-v2-1.onrender.com';
  }

  // Production: use your deployed backend URL
  // You can also use relative URL if backend is on same domain
  return 'https://stericare-dashboard-v2-1.onrender.com'; // Change this to your Render URL
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
  
  // CRM Operations
  CRM_REPORT: `${API_BASE_URL}/api/crm/customers/report`,
  CRM_EXPORT: `${API_BASE_URL}/api/crm/customers/export`,
  CRM_ANALYTICS: `${API_BASE_URL}/api/crm/analytics`,
  
  // Inventory Operations
  INVENTORY_REPORT: `${API_BASE_URL}/api/inventory/report`,
  INVENTORY_EXPORT: `${API_BASE_URL}/api/inventory/export`,
  INVENTORY_ANALYTICS: `${API_BASE_URL}/api/inventory/analytics`,
  INVENTORY_LOW_STOCK: `${API_BASE_URL}/api/inventory/low-stock`,
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

// ==========================================
// CRM API FUNCTIONS
// ==========================================

// Get CRM customer report
export const getCustomerReport = async () => {
  try {
    console.log('📊 Fetching customer report...');
    
    const response = await fetch(API_ENDPOINTS.CRM_REPORT, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch customer report');
    }
    
    const data = await response.json();
    console.log('✅ Customer report fetched');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Customer report error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to fetch customer report'
    };
  }
};

// Export customers to CSV
export const exportCustomersCSV = async () => {
  try {
    console.log('📥 Exporting customers to CSV...');
    
    const response = await fetch(API_ENDPOINTS.CRM_EXPORT);
    
    if (!response.ok) {
      throw new Error('Failed to export customers');
    }
    
    const blob = await response.blob();
    console.log('✅ Customers exported');
    return { success: true, blob };
  } catch (error) {
    console.error('❌ Export error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to export customers'
    };
  }
};

// Get CRM analytics
export const getCRMAnalytics = async () => {
  try {
    console.log('📈 Fetching CRM analytics...');
    
    const response = await fetch(API_ENDPOINTS.CRM_ANALYTICS, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch analytics');
    }
    
    const data = await response.json();
    console.log('✅ Analytics fetched');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Analytics error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to fetch analytics'
    };
  }
};

// ==========================================
// INVENTORY API FUNCTIONS
// ==========================================

// Get inventory report
export const getInventoryReport = async () => {
  try {
    console.log('📊 Fetching inventory report...');
    
    const response = await fetch(API_ENDPOINTS.INVENTORY_REPORT, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch inventory report');
    }
    
    const data = await response.json();
    console.log('✅ Inventory report fetched');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Inventory report error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to fetch inventory report'
    };
  }
};

// Export inventory to CSV
export const exportInventoryCSV = async () => {
  try {
    console.log('📥 Exporting inventory to CSV...');
    
    const response = await fetch(API_ENDPOINTS.INVENTORY_EXPORT);
    
    if (!response.ok) {
      throw new Error('Failed to export inventory');
    }
    
    const blob = await response.blob();
    console.log('✅ Inventory exported');
    return { success: true, blob };
  } catch (error) {
    console.error('❌ Export error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to export inventory'
    };
  }
};

// Get inventory analytics
export const getInventoryAnalytics = async () => {
  try {
    console.log('📈 Fetching inventory analytics...');
    
    const response = await fetch(API_ENDPOINTS.INVENTORY_ANALYTICS, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch analytics');
    }
    
    const data = await response.json();
    console.log('✅ Inventory analytics fetched');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Analytics error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to fetch analytics'
    };
  }
};

// Get low stock alerts
export const getLowStockAlerts = async () => {
  try {
    console.log('⚠️ Fetching low stock alerts...');
    
    const response = await fetch(API_ENDPOINTS.INVENTORY_LOW_STOCK, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch low stock alerts');
    }
    
    const data = await response.json();
    console.log('✅ Low stock alerts fetched');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Low stock alerts error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to fetch low stock alerts'
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
  getCustomerReport,
  exportCustomersCSV,
  getCRMAnalytics,
  getInventoryReport,
  exportInventoryCSV,
  getInventoryAnalytics,
  getLowStockAlerts,
};
