"use client";

import { supabase } from '@/lib/supabase-browser';

const STORAGE_KEY = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || "sb-app-auth";

/**
 * Completely clears all authentication data and redirects to login
 * Use this as a last resort if users are stuck in auth error loops
 */
export async function clearAllAuthData(): Promise<void> {
  console.log('🧹 Clearing all authentication data...');
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('⚠️ Error during signOut:', error);
  }
  
  try {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('patient_data');
  } catch (error) {
    console.warn('⚠️ Error clearing localStorage:', error);
  }
  
  try {
    // Clear sessionStorage
    sessionStorage.clear();
  } catch (error) {
    console.warn('⚠️ Error clearing sessionStorage:', error);
  }
  
  try {
    // Clear all cookies (if possible)
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      });
    }
  } catch (error) {
    console.warn('⚠️ Error clearing cookies:', error);
  }
  
  // Redirect to login
  if (typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
}

/**
 * Check if there are any auth-related issues and clear them if needed
 */
export async function checkAndFixAuthIssues(): Promise<boolean> {
  try {
    // Try to get session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      const errorMessage = error.message || error.toString();
      if (/invalid\s+refresh\s+token|refresh\s+token\s+not\s+found|not\s+found/i.test(errorMessage)) {
        console.log('🔧 Auth issues detected, clearing data...');
        await clearAllAuthData();
        return true;
      }
    }
    
    // If no session but we have storage data, clear it
    if (!data.session) {
      const hasStorageData = localStorage.getItem(STORAGE_KEY) || 
                            localStorage.getItem('auth_token') || 
                            sessionStorage.length > 0;
      
      if (hasStorageData) {
        console.log('🔧 Stale auth data detected, clearing...');
        await clearAllAuthData();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ Error checking auth issues:', error);
    // If we can't even check, clear everything to be safe
    await clearAllAuthData();
    return true;
  }
}

// Make it available globally for debugging
if (typeof window !== "undefined") {
  (window as any).clearAllAuthData = clearAllAuthData;
  (window as any).checkAndFixAuthIssues = checkAndFixAuthIssues;
}
