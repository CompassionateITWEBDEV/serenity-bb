"use client";

import { supabase } from '@/lib/supabase-browser';

const STORAGE_KEY = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || "sb-app-auth";

/**
 * Checks if an error is related to authentication issues
 */
export function isAuthError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return /invalid\s+refresh\s+token|refresh\s+token\s+not\s+found|not\s+found|auth/i.test(errorMessage);
}

/**
 * Handles authentication errors by clearing session and redirecting to login
 */
export async function handleAuthError(error?: any): Promise<void> {
  console.warn('⚠️ Handling auth error:', error);
  
  try {
    // Clear Supabase session
    await supabase.auth.signOut();
  } catch (signOutError) {
    console.warn('⚠️ Error during signOut:', signOutError);
  }
  
  try {
    // Clear all auth-related storage
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  } catch (storageError) {
    console.warn('⚠️ Error clearing storage:', storageError);
  }
  
  // Redirect to login with current page as next parameter
  if (typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
}

/**
 * Wraps async functions to automatically handle auth errors
 */
export function withAuthErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isAuthError(error)) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }
  };
}

/**
 * Safe wrapper for Supabase auth operations
 */
export const safeAuth = {
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && isAuthError(error)) {
        await handleAuthError(error);
        return { data: { session: null }, error: null };
      }
      return { data, error };
    } catch (error) {
      if (isAuthError(error)) {
        await handleAuthError(error);
        return { data: { session: null }, error: null };
      }
      throw error;
    }
  },

  async getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isAuthError(error)) {
        await handleAuthError(error);
        return { data: { user: null }, error: null };
      }
      return { data, error };
    } catch (error) {
      if (isAuthError(error)) {
        await handleAuthError(error);
        return { data: { user: null }, error: null };
      }
      throw error;
    }
  },

  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error && isAuthError(error)) {
        await handleAuthError(error);
        return { data: { session: null }, error: null };
      }
      return { data, error };
    } catch (error) {
      if (isAuthError(error)) {
        await handleAuthError(error);
        return { data: { session: null }, error: null };
      }
      throw error;
    }
  }
};
