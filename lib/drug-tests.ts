import { supabase } from "@/lib/supabase/client";
import type { StaffPatient } from "@/lib/patients";
import { displayName } from "@/lib/patients";

export type TestStatus = "pending" | "completed" | "missed";
export type DrugTestRow = {
  id: string;
  patient_id: string;
  created_by: string | null;
  status: TestStatus;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
};
export type DrugTest = {
  id: string;
  patient: StaffPatient;
  status: TestStatus;
  scheduledFor?: string | null;
};

export async function listDrugTests(opts?: { q?: string; status?: TestStatus | "all"; limit?: number }): Promise<DrugTest[]> {
  const status = opts?.status && opts.status !== "all" ? opts.status : undefined;

  let query = supabase
    .from("drug_tests")
    .select("id,patient_id,status,scheduled_for,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  const ids = Array.from(new Set((data ?? []).map((r: any) => r.patient_id)));
  if (!ids.length) return [];

  const { data: pats, error: pErr } = await supabase
    .from("patients")
    .select("user_id,full_name,first_name,last_name,email,created_at")
    .in("user_id", ids);
  if (pErr) throw pErr;

  const byId = new Map<string, StaffPatient>(
    (pats ?? []).map((p: any) => [p.user_id, { id: p.user_id, name: displayName(p), email: p.email, created_at: p.created_at }])
  );

  let rows: DrugTest[] = (data ?? []).map((r: any) => ({
    id: r.id,
    patient: byId.get(r.patient_id) ?? { id: r.patient_id, name: "Unknown" },
    status: r.status,
    scheduledFor: r.scheduled_for,
  }));

  if (opts?.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    rows = rows.filter((t) => t.patient.name.toLowerCase().includes(q) || (t.patient.email ?? "").toLowerCase().includes(q));
  }
  return rows;
}

export async function createDrugTest(input: { patientId: string; scheduledFor?: string | null }) {
  const payload = { patient_id: input.patientId, scheduled_for: input.scheduledFor ?? null, status: "pending" as const };
  const { data, error } = await supabase.from("drug_tests").insert(payload).select().single();
  if (error) throw error;
  return data as DrugTestRow;
}

export async function updateDrugTestStatus(id: string, status: TestStatus) {
  const res = await fetch(`/api/drug-tests/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Failed to update status (${res.status})`);
  }
  const j = await res.json();
  return j.data as { id: string; status: TestStatus };
}

export function subscribeDrugTests(onChange: () => void) {
  const chan = supabase
    .channel("drug_tests.realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "drug_tests" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(chan);
}
