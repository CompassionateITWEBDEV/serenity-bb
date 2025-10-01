import { supabase } from "./supabase/browser";

export type StaffPatient = {
  id: string;          // patients.user_id
  name: string;
  email: string | null;
};

function shapePatient(r: any): StaffPatient {
  const name = r.full_name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unknown";
  return { id: r.user_id, name, email: r.email ?? null };
}

export async function fetchPatients(q?: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("user_id, full_name, first_name, last_name, email")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []).map(shapePatient);
  if (!q) return rows;

  const needle = q.trim().toLowerCase();
  return rows.filter((p) => p.name.toLowerCase().includes(needle) || (p.email ?? "").toLowerCase().includes(needle));
}

export function subscribePatients(onChange: () => void) {
  const ch = supabase
    .channel("rt-patients")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patients" },
      () => onChange()
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
