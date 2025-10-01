// File: /lib/patients.ts
import { supabase } from "./supabase/browser";

export type StaffPatient = {
  id: string;
  name: string;
  email: string | null;
};

function buildName(r: any): string {
  const full =
    r?.full_name ??
    `${r?.first_name ?? ""} ${r?.last_name ?? ""}`.trim();
  // why: avoid `??` + `||`, and also handle empty strings
  if (full && full.length > 0) return full;
  return "Unknown";
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
  return rows.filter((p) => {
    const name = p.name.toLowerCase();
    const email = (p.email ?? "").toLowerCase();
    return name.includes(needle) || email.includes(needle);
  });
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
