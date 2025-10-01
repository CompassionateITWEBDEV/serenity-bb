import { supabase, getAccessToken } from "@/lib/supabase-browser";
import type { PostgrestError } from "@supabase/supabase-js";

export type TestStatus = "pending" | "completed" | "missed";
export type DrugTest = {
  id: string; status: TestStatus; scheduledFor: string | null; createdAt: string;
  patientId: string; patient: { id: string; name: string; email?: string | null };
};

function mapRow(r: any): DrugTest {
  const p = r.patients ?? r.patient ?? { user_id: r.patient_id, full_name: null, first_name: null, last_name: null, email: null };
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Unknown";
  return { id: r.id, status: r.status, scheduledFor: r.scheduled_for, createdAt: r.created_at, patientId: r.patient_id, patient: { id: p.user_id, name, email: p.email ?? null } };
}

export async function listDrugTests(_: { q?: string; status?: TestStatus } = {}): Promise<DrugTest[]> {
  const sel = `id,status,scheduled_for,created_at,patient_id,patients:patient_id(user_id,full_name,first_name,last_name,email)`;
  const { data, error } = await supabase.from("drug_tests").select(sel).order("created_at", { ascending: false });
  if (error) throw pgErr(error);
  return (data ?? []).map(mapRow);
}

export function subscribeDrugTests(onChange: () => void): () => void {
  const ch = supabase
    .channel("realtime:drug_tests")
    .on("postgres_changes", { event: "*", schema: "public", table: "drug_tests" }, () => onChange())
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch {} };
}

export async function createDrugTest(args: { patientId: string; scheduledFor: string | null }): Promise<DrugTest> {
  // 1) get/refresh token (critical after reloads)
  let token = await getAccessToken();
  if (!token) {
    const r = await supabase.auth.refreshSession();
    token = r.data.session?.access_token ?? null;
  }
  if (!token) {
    const e: any = new Error("Not signed in on this site");
    e.status = 401; e.debug = "no-session";
    throw e;
  }

  // 2) call API with Bearer
  const res = await fetch("/api/drug-tests", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(args),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(json?.error ?? `HTTP ${res.status}`);
    e.status = res.status; e.debug = res.headers.get("x-debug");
    throw e;
  }
  return mapRow(json.data);
}

function pgErr(err: PostgrestError): Error {
  const e: any = new Error(err.message);
  e.code = err.code; e.details = err.details; e.hint = err.hint;
  return e;
}
