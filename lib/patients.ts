import { supabase, subscribeToTable } from "@/lib/supabase-browser";

export type StaffPatient = { id: string; name: string; email: string | null };

function shape(r: any): StaffPatient {
  const n = r?.full_name ?? `${r?.first_name ?? ""} ${r?.last_name ?? ""}`.trim();
  return { id: r.user_id, name: n && n.length ? n : "Unknown", email: r.email ?? null };
}

export async function fetchPatients(q?: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("user_id, full_name, first_name, last_name, email")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map(shape);
  if (!q) return rows;
  const needle = q.trim().toLowerCase();
  return rows.filter((p) => p.name.toLowerCase().includes(needle) || (p.email ?? "").toLowerCase().includes(needle));
}

export function subscribePatients(onEvent: (evt: { type: "INSERT" | "UPDATE" | "DELETE"; row: any }) => void) {
  const off = subscribeToTable({
    table: "patients",
    event: "*",
    onInsert: (row) => onEvent({ type: "INSERT", row }),
    onUpdate: (row) => onEvent({ type: "UPDATE", row }),
    onDelete: (row) => onEvent({ type: "DELETE", row }),
  });
  return off;
}
