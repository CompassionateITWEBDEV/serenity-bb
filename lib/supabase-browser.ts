import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_* envs");

export const supabase = createClient(url, anon);
