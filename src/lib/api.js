// src/api.js - OPTIMIZED VERSION
// Performance improvements: caching, retry logic, error handling

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ✅ Request cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ✅ Request deduplication (prevent multiple identical requests)
const pendingRequests = new Map();

// ✅ Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Enhanced fetch with caching, retry, and error handling
 */
async function enhancedFetch(url, options = {}, cacheKey = null) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // ✅ Check cache for GET requests
  if (options.method === 'GET' || !options.method) {
    if (cacheKey && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📦 Cache hit:', cacheKey);
        return cached.data;
      }
      cache.delete(cacheKey);
    }
    
    // ✅ Deduplicate identical pending requests
    if (cacheKey && pendingRequests.has(cacheKey)) {
      console.log('⏳ Waiting for pending request:', cacheKey);
      return pendingRequests.get(cacheKey);
    }
  }
  
  // ✅ Fetch with retry logic
  const fetchWithRetry = async (retryCount = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
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
        // Handle specific error codes
        if (response.status === 404) {
          throw new Error('Resource not found');
        }
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        if (response.status === 503) {
          throw new Error('Service temporarily unavailable');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // ✅ Cache successful GET responses
      if ((options.method === 'GET' || !options.method) && cacheKey) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      return data;
      
    } catch (error) {
      // ✅ Retry on network errors
      if (retryCount < MAX_RETRIES && 
          (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn(`⚠️ Retry ${retryCount + 1}/${MAX_RETRIES}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return fetchWithRetry(retryCount + 1);
      }
      
      throw error;
    }
  };
  
  // ✅ Store pending request promise
  const requestPromise = fetchWithRetry();
  if (cacheKey && (options.method === 'GET' || !options.method)) {
    pendingRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => pendingRequests.delete(cacheKey));
  }
  
  return requestPromise;
}

/**
 * Clear cache (call after mutations)
 */
export function clearCache(pattern) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * Prefetch data (for predictive loading)
 */
export function prefetch(url, cacheKey) {
  return enhancedFetch(url, { method: 'GET' }, cacheKey).catch(() => {
    // Silently fail prefetch
  });
}

// ============================================
// API METHODS
// ============================================

/**
 * Health check with wake-up logic
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10s timeout for health check
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error.message);
    return false;
  }
}

/**
 * Keep backend alive (ping every 14 min)
 */
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
  
  ping(); // Immediate ping
  keepAliveInterval = setInterval(ping, 14 * 60 * 1000); // Every 14 minutes
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
  clearCache('invoices'); // Invalidate cache
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

// ============================================
// INVENTORY
// ============================================



export async function getInventory() {
  return enhancedFetch('/api/inventory', { method: 'GET' }, 'inventory:all');
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


// Add this export
export async function getInventoryAnalytics() {
  return apiFetch('/api/inventory/analytics');
}

export async function getLowStockAlerts() {
  return apiFetch('/api/inventory/low-stock');
}

export async function getStockMovements() {
  return apiFetch('/api/inventory/movements');
}

export async function adjustStock(id, quantity, reason) {
  return apiFetch(`/api/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ quantity, reason })
  });
}
// ============================================
// ANALYTICS
// ============================================

export async function getAnalytics(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const cacheKey = `analytics:${queryString}`;
  return enhancedFetch(`/api/analytics?${queryString}`, { method: 'GET' }, cacheKey);
}

// ============================================
// UTILITY
// ============================================

/**
 * Batch fetch multiple resources
 */
export async function batchFetch(requests) {
  return Promise.allSettled(
    requests.map(({ url, cacheKey }) => 
      enhancedFetch(url, { method: 'GET' }, cacheKey)
    )
  );
}

/**
 * Prefetch common data on app load
 */
export function prefetchCommonData() {
  // Prefetch frequently accessed data
  prefetch('/api/products', 'products:all');
  prefetch('/api/customers', 'customers:all');
}

// ============================================
// EXPORTS
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
  
  // Products
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  
  // Inventory
  getInventory,
  updateInventory,
  getInventoryReport,
  
  // Analytics
  getAnalytics,
  
  // Utility
  clearCache,
  prefetch,
  batchFetch,
  prefetchCommonData
};