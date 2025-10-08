// File: lib/supabase/admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
// If you have generated types, uncomment and import them:
// import type { Database } from "@/lib/supabase/types"; // optional

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
}
if (!serviceKey) {
  throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY (server only)");
}

export const supabaseAdmin = createClient(
  url,
  serviceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
  // <Database> // pass your Database type here if you have it
);
