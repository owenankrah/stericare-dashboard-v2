/**
 * QUERY CACHE - Performance Optimization
 * 
 * Caches Supabase query results to avoid redundant API calls
 * Features:
 * - Time-based expiration (TTL)
 * - Automatic cleanup
 * - Memory management
 * - Cache invalidation
 */

class QueryCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
    this.maxSize = 100; // Maximum cache entries
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {any} - Cached data or undefined
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    return entry.data;
  }

  /**
   * Set cache data with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, data, ttl = 300000) {
    // Check cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    // Clear existing timeout
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Store data
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timeout
    const timeout = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timeouts.set(key, timeout);
  }

  /**
   * Check if cache entry is valid
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in milliseconds (optional, uses stored TTL)
   * @returns {boolean} - True if valid
   */
  isValid(key, maxAge = null) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const ageLimit = maxAge || entry.ttl;
    
    return age < ageLimit;
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    // Clear timeout
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    
    // Remove from cache
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    
    // Clear cache
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match
   */
  clearPattern(pattern) {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Measure function execution time
 * @param {string} name - Operation name
 * @param {Function} fn - Function to measure
 * @returns {any} - Function result
 */
export function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  const duration = (end - start).toFixed(2);
  console.log(`⏱️ ${name}: ${duration}ms`);
  
  return result;
}

/**
 * Create a cached version of an async function
 * @param {Function} fn - Async function to cache
 * @param {Function} keyGenerator - Function to generate cache key from arguments
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Function} - Cached function
 */
export function cached(fn, keyGenerator, ttl = 300000) {
  return async function(...args) {
    const key = keyGenerator(...args);
    
    // Check cache
    if (queryCache.isValid(key)) {
      console.log(`✅ Cache hit: ${key}`);
      return queryCache.get(key);
    }
    
    // Execute function
    console.log(`📡 Cache miss: ${key}`);
    const result = await fn(...args);
    
    // Store in cache
    queryCache.set(key, result, ttl);
    
    return result;
  };
}

// Example usage:
/*
import { queryCache, cached } from './lib/queryCache';

// Simple usage
const loadCustomers = async () => {
  const cacheKey = 'customers_all';
  
  if (queryCache.isValid(cacheKey)) {
    return queryCache.get(cacheKey);
  }
  
  const { data } = await supabase.from('customers').select('*');
  queryCache.set(cacheKey, data);
  return data;
};

// Advanced usage with cached()
const loadCustomers = cached(
  async () => {
    const { data } = await supabase.from('customers').select('*');
    return data;
  },
  () => 'customers_all', // Cache key generator
  300000 // 5 minutes TTL
);

// Invalidate cache when data changes
const addCustomer = async (customer) => {
  await supabase.from('customers').insert([customer]);
  queryCache.clearPattern('customers_'); // Clear all customer caches
};
*/
