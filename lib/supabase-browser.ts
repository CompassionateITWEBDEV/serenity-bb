"use client";

import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from "@supabase/supabase-js";

type DB = any;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const STORAGE_KEY = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || "sb-app-auth";
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);

// Check if Supabase is properly configured
const isSupabaseConfigured = URL && ANON;

declare global {
  // eslint-disable-next-line no-var
  var __SB_CLIENT__: SupabaseClient<DB> | undefined;
}

function makeClient(): SupabaseClient<DB> {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured - using fallback client');
    // Return a minimal client that won't cause errors
    return createClient<DB>('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storageKey: STORAGE_KEY,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createClient<DB>(URL!, ANON!, {
    auth: {
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    db: { schema: "public" },
    global: DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

// HMR-safe singleton
export const supabase: SupabaseClient<DB> =
  globalThis.__SB_CLIENT__ ?? (globalThis.__SB_CLIENT__ = makeClient());
export default supabase;

// Global auth error handler
if (typeof window !== "undefined" && isSupabaseConfigured) {
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        console.log('🔄 Auth state changed:', event);
      }
      if (event === 'SIGNED_OUT') {
        // Clear all auth-related storage when signed out
        try {
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.clear();
        } catch (e) {
          console.warn('⚠️ Error clearing storage:', e);
        }
      }
    });
    
    // Enhanced error handling for auth errors
    const handleAuthError = (error: any) => {
      const errorMessage = error?.message || error?.toString() || '';
      const isRefreshTokenError = /invalid\s+refresh\s+token|refresh\s+token\s+not\s+found|not\s+found/i.test(errorMessage);
      
      if (isRefreshTokenError) {
        console.warn('⚠️ Auth error detected:', errorMessage);
        // Clear session and redirect
        supabase.auth.signOut().then(() => {
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.clear();
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}`;
        }).catch(() => {
          // Force redirect even if signOut fails
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.clear();
          window.location.href = '/login';
        });
        return true;
      }
      return false;
    };
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (handleAuthError(event.reason)) {
        event.preventDefault();
      }
    });
    
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      if (handleAuthError(event.error)) {
        event.preventDefault();
      }
    });
    
    // Override console.error to catch auth errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (/invalid\s+refresh\s+token|refresh\s+token\s+not\s+found|not\s+found/i.test(errorMessage)) {
        handleAuthError({ message: errorMessage });
      }
      originalConsoleError.apply(console, args);
    };
  } catch (error) {
    console.warn('⚠️ Failed to initialize auth handlers:', error);
  }
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  try {
    // First try to get existing session
    let { data } = await supabase.auth.getSession();
    let token = data.session?.access_token ?? null;
    
    // If we have a valid token, return it
    if (token && data.session?.expires_at) {
      const expiresAt = new Date(data.session.expires_at * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // If token expires in more than 5 minutes, it's still valid
      if (timeUntilExpiry > 5 * 60 * 1000) {
        return token;
      }
    }
    
    // Try to refresh the session
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session?.access_token ?? null;
  } catch (e: any) {
    console.warn('⚠️ Auth error in getAccessToken:', e);
    
    // Check if it's a refresh token error
    const errorMessage = e?.message || e?.toString() || '';
    const isRefreshTokenError = /invalid\s+refresh\s+token|not\s+found|refresh\s+token\s+not\s+found/i.test(errorMessage);
    
    if (isRefreshTokenError) {
      console.log('🔄 Invalid refresh token detected, clearing session and redirecting to login');
      
      // Clear all auth data
      try { 
        await supabase.auth.signOut(); 
      } catch (signOutError) {
        console.warn('⚠️ Error during signOut:', signOutError);
      }
      
      try { 
        localStorage.removeItem(STORAGE_KEY); 
      } catch (storageError) {
        console.warn('⚠️ Error clearing localStorage:', storageError);
      }
      
      try { 
        sessionStorage.clear(); 
      } catch (storageError) {
        console.warn('⚠️ Error clearing sessionStorage:', storageError);
      }
      
      // Redirect to login
      if (typeof window !== "undefined") {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
      return null;
    }
    
    // Re-throw non-refresh-token errors
    throw e;
  }
}

export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* no-op */
  }
}

/** Ensure a session exists (prevents false-unauth during navigation). */
export async function ensureSession(opts?: {
  graceMs?: number;    // wait for storage hydration
  fallbackMs?: number; // timeout while waiting for the first auth event
}): Promise<Session | null> {
  const graceMs = opts?.graceMs ?? 300;
  const fallbackMs = opts?.fallbackMs ?? 500;

  // 1) immediate
  let { data } = await supabase.auth.getSession();
  let session = data.session ?? null;
  if (session) return session;

  // 2) brief grace
  await new Promise((r) => setTimeout(r, graceMs));
  ({ data } = await supabase.auth.getSession());
  session = data.session ?? null;
  if (session) return session;

  // 3) wait for the first auth event OR fallback
  return await new Promise<Session | null>((resolve) => {
    let decided = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (decided) return;
      decided = true;
      sub.subscription.unsubscribe();
      resolve(newSession ?? null);
    });
    setTimeout(async () => {
      if (decided) return;
      decided = true;
      sub.subscription.unsubscribe();
      const again = (await supabase.auth.getSession()).data.session ?? null;
      resolve(again);
    }, fallbackMs);
  });
}

// ── Realtime helper ──────────────────────────────────────────────────────────
export function subscribeToTable<T = unknown>(opts: {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
}): () => void {
  const { table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete } = opts;

  const ch = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on("postgres_changes" as any, { schema, table, event, filter }, (p: any) => {
      if (p.eventType === "INSERT") onInsert?.(p.new as T);
      else if (p.eventType === "UPDATE") onUpdate?.(p.new as T);
      else if (p.eventType === "DELETE") onDelete?.(p.old as T);
    })
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(ch);
    } catch {}
  };
}
