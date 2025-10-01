import type { PostgrestError } from "@supabase/supabase-js";
import { supabase, getAccessToken } from "@/lib/supabase-browser";

export type TestStatus = "pending" | "completed" | "missed";
export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null;
  createdAt: string;
  patientId: string;
  patient: { id: string; name: string; email?: string | null };
};

type ListOptions = { q?: string; status?: TestStatus };

function mapRow(row: any): DrugTest {
  const p =
    row.patients ??
    row.patient ?? { user_id: row.patient_id, full_name: null, first_name: null, last_name: null, email: null };

  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Unknown";

  return {
    id: row.id,
    status: row.status as TestStatus,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    patientId: row.patient_id,
    patient: { id: p.user_id, name, email: p.email ?? null },
  };
}

export async function listDrugTests(opts: ListOptions): Promise<DrugTest[]> {
  const sel = `
    id, status, scheduled_for, created_at, patient_id,
    patients:patient_id ( user_id, full_name, first_name, last_name, email )
  `;
  const { data, error } = await supabase.from("drug_tests").select(sel).order("created_at", { ascending: false });
  if (error) throw pgErr(error);

  let items = (data ?? []).map(mapRow);
  if (opts.status) items = items.filter((t) => t.status === opts.status);
  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    items = items.filter((t) => t.patient.name.toLowerCase().includes(q) || (t.patient.email ?? "").toLowerCase().includes(q));
  }
  return items;
}

export function subscribeDrugTests(onChange: () => void): () => void {
  const ch = supabase
    .channel("realtime:drug_tests")
    .on("postgres_changes", { event: "*", schema: "public", table: "drug_tests" }, () => onChange())
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch {} };
}

export async function createDrugTest(args: { patientId: string; scheduledFor: string | null }): Promise<DrugTest> {
  const token = await getAccessToken();
  if (!token) { const e: any = new Error("Not signed in on this site"); e.status = 401; e.debug = "no-session"; throw e; }

  const res = await fetch("/api/drug-tests", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(args),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.error ?? `HTTP ${res.status}`); e.status = res.status; e.debug = res.headers.get("x-debug"); throw e; }
  return mapRow(json.data);
}

function pgErr(err: PostgrestError): Error {
  const e: any = new Error(err.message);
  e.code = err.code; e.details = err.details; e.hint = err.hint;
  return e;
