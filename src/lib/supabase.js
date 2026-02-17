// src/lib/supabase.js - OPTIMIZED VERSION
// Performance improvements: connection management, error handling, retry logic

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Required: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY');
}

// ✅ Optimized Supabase configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ✅ Better token management
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    
    // ✅ Storage configuration
    storage: window.localStorage,
    storageKey: 'pharma-c-auth',
    
    // ✅ Flow type for better security
    flowType: 'pkce'
  },
  
  db: {
    // ✅ Database optimizations
    schema: 'public'
  },
  
  global: {
    // ✅ Headers for better tracking
    headers: {
      'x-application-name': 'pharma-c-bms',
      'x-client-version': '3.1.1'
    }
  },
  
  realtime: {
    // ✅ Realtime configuration
    params: {
      eventsPerSecond: 10
    }
  }
});

// ✅ Enhanced error handling wrapper
export async function supabaseQuery(queryFn, options = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    onError = null
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // ✅ Add timeout to query
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      );
      
      const queryPromise = queryFn();
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      // ✅ Check for Supabase errors
      if (result.error) {
        throw result.error;
      }
      
      return result.data;
      
    } catch (error) {
      lastError = error;
      
      // ✅ Handle specific error types
      if (error.code === 'PGRST301') {
        // Row not found - don't retry
        break;
      }
      
      if (error.message?.includes('JWT')) {
        // Auth error - refresh token
        console.warn('🔄 Refreshing auth token...');
        await supabase.auth.refreshSession();
        continue;
      }
      
      // ✅ Retry on network errors
      if (attempt < retries && (
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout')
      )) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`⚠️ Query retry ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  // ✅ Call error handler if provided
  if (onError) {
    onError(lastError);
  }
  
  throw lastError;
}

// ✅ Auth helpers with better error handling
export const auth = {
  /**
   * Sign in with email and password
   */
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        // ✅ Better error messages
        if (error.message.includes('Invalid')) {
          throw new Error('Invalid email or password');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address');
        }
        throw error;
      }
      
      console.log('✅ User logged in:', data.user.email);
      return data;
      
    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  },
  
  /**
   * Sign out
   */
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // ✅ Clear local cache
      localStorage.removeItem('pharma-c-cache');
      sessionStorage.clear();
      
      console.log('✅ User logged out');
      
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      // Force logout even if API fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  },
  
  /**
   * Get current user
   */
  getUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // ✅ Handle stale tokens
        if (error.message?.includes('Refresh Token')) {
          console.warn('🔄 Clearing stale auth token');
          await auth.signOut();
          return null;
        }
        throw error;
      }
      
      return user;
      
    } catch (error) {
      console.error('❌ Get user error:', error.message);
      return null;
    }
  },
  
  /**
   * Get session with refresh
   */
  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      // ✅ Refresh if expiring soon (< 5 min)
      if (session && session.expires_at) {
        const expiresIn = session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          console.log('🔄 Refreshing session');
          await supabase.auth.refreshSession();
        }
      }
      
      return session;
      
    } catch (error) {
      console.error('❌ Get session error:', error.message);
      return null;
    }
  },
  
  /**
   * Set up auth state listener
   */
  onAuthStateChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        // ✅ Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed successfully');
        }
        
        // ✅ Handle sign out
        if (event === 'SIGNED_OUT') {
          localStorage.clear();
          sessionStorage.clear();
        }
        
        callback(event, session);
      }
    );
    
    return subscription;
  }
};

// ✅ Database helpers with caching
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const db = {
  /**
   * Select with caching
   */
  select: async (table, { columns = '*', filters = {}, cache = true } = {}) => {
    const cacheKey = `${table}:${JSON.stringify({ columns, filters })}`;
    
    // ✅ Check cache
    if (cache && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📦 Query cache hit:', table);
        return cached.data;
      }
      queryCache.delete(cacheKey);
    }
    
    // ✅ Build query
    let query = supabase.from(table).select(columns);
    
    // ✅ Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value.gte !== undefined) {
        query = query.gte(key, value.gte);
      } else if (typeof value === 'object' && value.lte !== undefined) {
        query = query.lte(key, value.lte);
      } else {
        query = query.eq(key, value);
      }
    });
    
    const data = await supabaseQuery(() => query);
    
    // ✅ Cache result
    if (cache) {
      queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
    
    return data;
  },
  
  /**
   * Insert
   */
  insert: async (table, data) => {
    const result = await supabaseQuery(() =>
      supabase.from(table).insert(data).select()
    );
    
    // ✅ Clear cache for this table
    for (const key of queryCache.keys()) {
      if (key.startsWith(`${table}:`)) {
        queryCache.delete(key);
      }
    }
    
    return result;
  },
  
  /**
   * Update
   */
  update: async (table, id, data) => {
    const result = await supabaseQuery(() =>
      supabase.from(table).update(data).eq('id', id).select()
    );
    
    // ✅ Clear cache
    for (const key of queryCache.keys()) {
      if (key.startsWith(`${table}:`)) {
        queryCache.delete(key);
      }
    }
    
    return result;
  },
  
  /**
   * Delete
   */
  delete: async (table, id) => {
    const result = await supabaseQuery(() =>
      supabase.from(table).delete().eq('id', id)
    );
    
    // ✅ Clear cache
    for (const key of queryCache.keys()) {
      if (key.startsWith(`${table}:`)) {
        queryCache.delete(key);
      }
    }
    
    return result;
  },
  
  /**
   * Clear query cache
   */
  clearCache: (table) => {
    if (table) {
      for (const key of queryCache.keys()) {
        if (key.startsWith(`${table}:`)) {
          queryCache.delete(key);
        }
      }
    } else {
      queryCache.clear();
    }
  }
};

// ✅ Real-time helpers
export const realtime = {
  /**
   * Subscribe to table changes
   */
  subscribe: (table, callback, filter = '*') => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: filter, schema: 'public', table },
        callback
      )
      .subscribe();
    
    console.log(`📡 Subscribed to ${table} changes`);
    
    return channel;
  },
  
  /**
   * Unsubscribe from channel
   */
  unsubscribe: async (channel) => {
    if (channel) {
      await supabase.removeChannel(channel);
      console.log('🔌 Unsubscribed from channel');
    }
  }
};

// ✅ Export everything
export default supabase;

// ✅ Make available in console for debugging (dev only)
if (process.env.NODE_ENV === 'development') {
  window.supabase = supabase;
  window.supabaseAuth = auth;
  window.supabaseDb = db;
  console.log('✅ Supabase client loaded');
  console.log('Debug: window.supabase, window.supabaseAuth, window.supabaseDb');
}