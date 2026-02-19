// src/lib/api.js - COMPLETE VERSION WITH ALL EXPORTS
// Performance improvements: caching, retry logic, error handling

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ✅ Request cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ✅ Request deduplication
const pendingRequests = new Map();

// ✅ Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Enhanced fetch with caching, retry, and error handling
 */
async function enhancedFetch(url, options = {}, cacheKey = null) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // Check cache for GET requests
  if (options.method === 'GET' || !options.method) {
    if (cacheKey && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📦 Cache hit:', cacheKey);
        return cached.data;
      }
      cache.delete(cacheKey);
    }
    
    // Deduplicate identical pending requests
    if (cacheKey && pendingRequests.has(cacheKey)) {
      console.log('⏳ Waiting for pending request:', cacheKey);
      return pendingRequests.get(cacheKey);
    }
  }
  
  // Fetch with retry logic
  const fetchWithRetry = async (retryCount = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Resource not found');
        if (response.status === 401) throw new Error('Unauthorized - please login again');
        if (response.status === 503) throw new Error('Service temporarily unavailable');
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful GET responses
      if ((options.method === 'GET' || !options.method) && cacheKey) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      return data;
      
    } catch (error) {
      // Retry on network errors
      if (retryCount < MAX_RETRIES && 
          (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn(`⚠️ Retry ${retryCount + 1}/${MAX_RETRIES}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return fetchWithRetry(retryCount + 1);
      }
      
      throw error;
    }
  };
  
  // Store pending request promise
  const requestPromise = fetchWithRetry();
  if (cacheKey && (options.method === 'GET' || !options.method)) {
    pendingRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => pendingRequests.delete(cacheKey));
  }
  
  return requestPromise;
}

/**
 * Clear cache
 */
export function clearCache(pattern) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

/**
 * Prefetch data
 */
export function prefetch(url, cacheKey) {
  return enhancedFetch(url, { method: 'GET' }, cacheKey).catch(() => {});
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Download blob helper - for file downloads
 */
export function downloadBlob(blob, filename) {
  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('en-GH');
  } else if (format === 'long') {
    return d.toLocaleDateString('en-GH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  return d.toISOString();
}

// ============================================
// HEALTH & KEEP-ALIVE
// ============================================

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error.message);
    return false;
  }
}

let keepAliveInterval = null;

export function startKeepAlive() {
  if (keepAliveInterval) return;
  
  const ping = async () => {
    try {
      await checkBackendHealth();
      console.log('🏓 Backend pinged');
    } catch (err) {
      console.warn('⚠️ Ping failed:', err.message);
    }
  };
  
  ping();
  keepAliveInterval = setInterval(ping, 14 * 60 * 1000);
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// ============================================
// INVOICES
// ============================================

export async function getInvoices() {
  return enhancedFetch('/api/invoices', { method: 'GET' }, 'invoices:all');
}

export async function getInvoice(id) {
  return enhancedFetch(`/api/invoices/${id}`, { method: 'GET' }, `invoice:${id}`);
}

export async function createInvoice(data) {
  const result = await enhancedFetch('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  clearCache('invoices');
  return result;
}

export async function updateInvoice(id, data) {
  const result = await enhancedFetch(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  clearCache('invoices');
  clearCache(`invoice:${id}`);
  return result;
}

export async function deleteInvoice(id) {
  const result = await enhancedFetch(`/api/invoices/${id}`, {
    method: 'DELETE'
  });
  clearCache('invoices');
  clearCache(`invoice:${id}`);
  return result;
}

// ============================================
// CUSTOMERS
// ============================================

export async function getCustomers() {
  return enhancedFetch('/api/customers', { method: 'GET' }, 'customers:all');
}

export async function getCustomer(id) {
  return enhancedFetch(`/api/customers/${id}`, { method: 'GET' }, `customer:${id}`);
}

export async function createCustomer(data) {
  const result = await enhancedFetch('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  clearCache('customers');
  return result;
}

export async function updateCustomer(id, data) {
  const result = await enhancedFetch(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  clearCache('customers');
  clearCache(`customer:${id}`);
  return result;
}

export async function deleteCustomer(id) {
  const result = await enhancedFetch(`/api/customers/${id}`, {
    method: 'DELETE'
  });
  clearCache('customers');
  clearCache(`customer:${id}`);
  return result;
}

// ============================================
// PRODUCTS
// ============================================

export async function getProducts() {
  return enhancedFetch('/api/products', { method: 'GET' }, 'products:all');
}

export async function getProduct(id) {
  return enhancedFetch(`/api/products/${id}`, { method: 'GET' }, `product:${id}`);
}

export async function createProduct(data) {
  const result = await enhancedFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  clearCache('products');
  return result;
}

export async function updateProduct(id, data) {
  const result = await enhancedFetch(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  clearCache('products');
  clearCache(`product:${id}`);
  return result;
}

export async function deleteProduct(id) {
  const result = await enhancedFetch(`/api/products/${id}`, {
    method: 'DELETE'
  });
  clearCache('products');
  clearCache(`product:${id}`);
  return result;
}

// ============================================
// INVENTORY - COMPLETE
// ============================================

export async function getInventory() {
  return enhancedFetch('/api/inventory', { method: 'GET' }, 'inventory:all');
}

export async function getInventoryItem(id) {
  return enhancedFetch(`/api/inventory/${id}`, { method: 'GET' }, `inventory:${id}`);
}

export async function updateInventory(id, data) {
  const result = await enhancedFetch(`/api/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  clearCache('inventory');
  return result;
}

export async function getInventoryReport() {
  return enhancedFetch('/api/inventory/report', { method: 'GET' }, 'inventory:report');
}

export async function getInventoryAnalytics() {
  return enhancedFetch('/api/inventory/analytics', { method: 'GET' }, 'inventory:analytics');
}

export async function getLowStockAlerts() {
  return enhancedFetch('/api/inventory/low-stock', { method: 'GET' }, 'inventory:low-stock');
}

export async function getStockMovements(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return enhancedFetch(`/api/inventory/movements?${queryString}`, { method: 'GET' }, 'inventory:movements');
}

export async function adjustStock(id, quantity, reason) {
  const result = await enhancedFetch(`/api/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ quantity, reason })
  });
  clearCache('inventory');
  return result;
}

export async function exportInventoryCSV() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/inventory/export/csv`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    return downloadBlob(blob, filename);
  } catch (error) {
    console.error('CSV export error:', error);
    throw error;
  }
}

export async function exportInventoryPDF() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/inventory/export/pdf`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.pdf`;
    return downloadBlob(blob, filename);
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}

// ============================================
// ANALYTICS
// ============================================

export async function getAnalytics(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const cacheKey = `analytics:${queryString}`;
  return enhancedFetch(`/api/analytics?${queryString}`, { method: 'GET' }, cacheKey);
}

export async function getSalesAnalytics(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return enhancedFetch(`/api/analytics/sales?${queryString}`, { method: 'GET' }, `analytics:sales:${queryString}`);
}

export async function getRevenueTrends(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return enhancedFetch(`/api/analytics/revenue?${queryString}`, { method: 'GET' }, `analytics:revenue:${queryString}`);
}

export async function getDashboardStats() {
  return enhancedFetch('/api/analytics/dashboard', { method: 'GET' }, 'analytics:dashboard');
}

// ============================================
// SALES
// ============================================

export async function getSales(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return enhancedFetch(`/api/sales?${queryString}`, { method: 'GET' }, `sales:${queryString}`);
}

export async function getSale(id) {
  return enhancedFetch(`/api/sales/${id}`, { method: 'GET' }, `sale:${id}`);
}

export async function createSale(data) {
  const result = await enhancedFetch('/api/sales', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  clearCache('sales');
  clearCache('analytics');
  return result;
}

export async function updateSale(id, data) {
  const result = await enhancedFetch(`/api/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  clearCache('sales');
  clearCache(`sale:${id}`);
  return result;
}

export async function deleteSale(id) {
  const result = await enhancedFetch(`/api/sales/${id}`, {
    method: 'DELETE'
  });
  clearCache('sales');
  clearCache(`sale:${id}`);
  return result;
}

// ============================================
// BATCH & UTILITY
// ============================================

export async function batchFetch(requests) {
  return Promise.allSettled(
    requests.map(({ url, cacheKey }) => 
      enhancedFetch(url, { method: 'GET' }, cacheKey)
    )
  );
}

export function prefetchCommonData() {
  prefetch('/api/products', 'products:all');
  prefetch('/api/customers', 'customers:all');
}

// ============================================
// DEFAULT EXPORT - COMPLETE
// ============================================

export default {
  // Health
  checkBackendHealth,
  startKeepAlive,
  stopKeepAlive,
  
  // Invoices
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  
  // Customers
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  
  // Products
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Inventory
  getInventory,
  getInventoryItem,
  updateInventory,
  getInventoryReport,
  getInventoryAnalytics,
  getLowStockAlerts,
  getStockMovements,
  adjustStock,
  exportInventoryCSV,
  exportInventoryPDF,
  
  // Analytics
  getAnalytics,
  getSalesAnalytics,
  getRevenueTrends,
  getDashboardStats,
  
  // Sales
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  
  // Utility
  downloadBlob,
  formatCurrency,
  formatDate,
  clearCache,
  prefetch,
  batchFetch,
  prefetchCommonData
};