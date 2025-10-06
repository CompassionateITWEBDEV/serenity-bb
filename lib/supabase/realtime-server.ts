import { createClient } from "@supabase/supabase-js";

export function createRealtimeWithJwt(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // WHY: we attach the user's JWT so RLS is enforced per-connection
  const client = createClient(supabaseUrl, supabaseAnon, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    realtime: {
      params: { eventsPerSecond: "2" },
    },
    auth: {
      persistSession: false, // server
      autoRefreshToken: false,
    },
  });

  return client;
}
