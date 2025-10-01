import { supabase, subscribeToTable } from "@/lib/supabase-browser";

export type StaffPatient = {
  id: string;          // patients.user_id
  name: string;
  email: string | null;
};

function buildName(r: any): string {
  const full = r?.full_name ?? `${r?.first_name ?? ""} ${r?.last_name ?? ""}`.trim();
  return full && full.length > 0 ? full : "Unknown";
}

function shapePatient(r: any): StaffPatient {
  return {
    id: r.user_id,
    name: buildName(r),
    email: r.email ?? null,
  };
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
  return subscribeToTable({
    table: "patients",
    onInsert: () => onChange(),
    onUpdate: () => onChange(),
    onDelete: () => onChange(),
  });
}
