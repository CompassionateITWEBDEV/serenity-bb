// lib/supabase-browser.ts
import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Give your app a stable, unique storage key.
          storageKey: 'myapp-auth',
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  return _client;
}
