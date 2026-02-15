import { createClient } from '@supabase/supabase-js';

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================

const supabaseUrl = 'https://fcqfywylbvkxayafpedy.supabase.co';

// REPLACE THIS WITH YOUR ACTUAL ANON KEY FROM:
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcWZ5d3lsYnZreGF5YWZwZWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzQyODEsImV4cCI6MjA4NTU1MDI4MX0.h8aaDs5IGt_dnrZxOzBwDtFpvKslglxzFTFFiI9JL7Q';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('REPLACE_THIS')) {
  console.error('❌ SUPABASE NOT CONFIGURED!');
  console.error('Please update src/lib/supabase.js with your actual anon key');
  console.error('Get it from: https://supabase.com/dashboard/project/fcqfywylbvkxayafpedy/settings/api');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  console.log('✅ Supabase client loaded');
}

export default supabase;
