import { supabase } from "@/lib/supabase/client";

export type StaffPatient = { id: string; name: string; email?: string | null; created_at?: string };

export function displayName(p: { full_name?: string | null; first_name?: string | null; last_name?: string | null }) {
  const full = (p.full_name ?? "").trim();
  if (full) return full;
  const combo = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return combo || "Unnamed Patient";
}

export async function fetchPatients(q?: string, limit = 500): Promise<StaffPatient[]> {
  let query = supabase
    .from("patients")
    .select("user_id,full_name,first_name,last_name,email,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    query = query.or(`full_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.user_id,
    name: displayName(p),
    email: p.email,
    created_at: p.created_at,
  }));
}

export function subscribePatients(onChange: () => void) {
  const chan = supabase
    .channel("patients.realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(chan);
}
