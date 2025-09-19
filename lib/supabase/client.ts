// lib/supabase/client.ts
'use client';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Global singleton to prevent multiple instances
let supabaseInstance: SupabaseClient | null = null;

function createClient(): SupabaseClient {
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create new instance and store it
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'src-health-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'src-health-app'
      }
    }
  });

  return supabaseInstance;
}

// Export singleton instance
export const supabase = createClient();

// Export factory function for compatibility
export { createClient };
