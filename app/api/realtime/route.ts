import { getServerSupabase, supabaseRealtimeForToken } from "@/lib/supabase/server";

const ssr = getServerSupabase();
const { data: { session } } = await ssr.auth.getSession();
const rt = supabaseRealtimeForToken(session!.access_token);
// rt.channel(...).on(...).subscribe()
