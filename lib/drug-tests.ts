import { supabase } from "@/lib/supabase/client";

export type StaffPatient = { id: string; name: string };
export type DrugTestRow = {
  id: string;
  patient_id: string;
  created_by: string | null;
  status: "pending" | "completed" | "missed";
  scheduled_for: string | null; // ISO
  created_at: string;
  updated_at: string;
};
export type DrugTest = {
  id: string;
  patient: StaffPatient;
  status: DrugTestRow["status"];
  scheduledFor?: string | null;
};

function displayName(p: { full_name: string | null; first_name: string | null; last_name: string | null }) {
  // Why: patient names are fragmented in schema; prefer full_name when present.
  const fn = (p.full_name && p.full_name.trim()) || "";
  if (fn) return fn;
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Unnamed Patient";
}

export async function getPatientsMinimal(q?: string): Promise<StaffPatient[]> {
  let query = supabase
    .from("patients")
    .select("user_id,full_name,first_name,last_name")
    .order("created_at", { ascending: false })
    .limit(500);

  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    query = query.or(
      `full_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p: any) => ({ id: p.user_id, name: displayName(p) }));
}

export async function listDrugTests(opts?: { q?: string; status?: "pending" | "completed" | "missed" | "all" }): Promise<DrugTest[]> {
  const status = opts?.status && opts.status !== "all" ? opts.status : undefined;

  let query = supabase
    .from("drug_tests")
    .select("id,patient_id,status,scheduled_for,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  const ids = Array.from(new Set((data ?? []).map((r: any) => r.patient_id)));
  if (ids.length === 0) return [];

  const { data: pats, error: pErr } = await supabase
    .from("patients")
    .select("user_id,full_name,first_name,last_name")
    .in("user_id", ids);
  if (pErr) throw pErr;

  const byId = new Map<string, StaffPatient>(
    (pats ?? []).map((p: any) => [p.user_id, { id: p.user_id, name: displayName(p) }])
  );

  let rows = (data ?? []).map((r: any) => ({
    id: r.id,
    patient: byId.get(r.patient_id) ?? { id: r.patient_id, name: "Unknown" },
    status: r.status,
    scheduledFor: r.scheduled_for,
  })) as DrugTest[];

  if (opts?.q && opts.q.trim()) {
    const q = opts.q.trim().toLowerCase();
    rows = rows.filter((t) => t.patient.name.toLowerCase().includes(q));
  }
  return rows;
}

export async function createDrugTest(input: { patientId: string; scheduledFor?: string | null }) {
  const payload = {
    patient_id: input.patientId,
    scheduled_for: input.scheduledFor ?? null,
    status: "pending",
  };
  const { data, error } = await supabase.from("drug_tests").insert(payload).select().single();
  if (error) throw error;
  return data as DrugTestRow;
}
