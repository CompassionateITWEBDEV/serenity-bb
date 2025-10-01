import type { PostgrestError } from "@supabase/supabase-js";
import { supabase, getAccessToken } from "./supabase-browser";

/** Narrow status union used throughout the UI. */
export type TestStatus = "pending" | "completed" | "missed";

export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null; // ISO
  createdAt: string; // ISO
  patientId: string;
  patient: { id: string; name: string; email?: string | null };
};

type ListOptions = { q?: string; status?: TestStatus };

/** Map DB rows → UI shape. */
function mapRow(row: any): DrugTest {
  const p =
    row.patients ??
    row.patient ??
    {
      user_id: row.patient_id,
      full_name: null,
      first_name: null,
      last_name: null,
      email: null,
    };

  const name =
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
    "Unknown";

  return {
    id: row.id,
    status: row.status as TestStatus,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    patientId: row.patient_id,
    patient: { id: p.user_id, name, email: p.email ?? null },
  };
}

/** Read tests, optional search/status filter (client-side filter keeps SQL simple). */
export async function listDrugTests(opts: ListOptions): Promise<DrugTest[]> {
  const sel = `
    id, status, scheduled_for, created_at, patient_id,
    patients:patient_id ( user_id, full_name, first_name, last_name, email )
  `;
  const { data, error } = await supabase
    .from("drug_tests")
    .select(sel)
    .order("created_at", { ascending: false });

  if (error) throw decorate(error);

  let items = (data ?? []).map(mapRow);

  if (opts.status) items = items.filter((t) => t.status === opts.status);
  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    items = items.filter(
      (t) =>
        t.patient.name.toLowerCase().includes(q) ||
        (t.patient.email ?? "").toLowerCase().includes(q)
    );
  }
  return items;
}

/** Realtime subscription to drug_tests changes. Returns an unsubscribe fn. */
export function subscribeDrugTests(onChange: () => void): () => void {
  const ch = supabase
    .channel("realtime:drug_tests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "drug_tests" },
      () => onChange()
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(ch);
    } catch {
      /* no-op */
    }
  };
}

/** Create a test by calling our API with a Bearer token (fixes 'Auth session missing!'). */
export async function createDrugTest(args: { patientId: string; scheduledFor: string | null }): Promise<DrugTest> {
  const token = await getAccessToken();
  if (!token) {
    const err = new Error("Not signed in") as any;
    err.status = 401;
    throw err;
  }

  const res = await fetch("/api/drug-tests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`, // <-- crucial for your route
    },
    body: JSON.stringify({
      patientId: args.patientId,
      scheduledFor: args.scheduledFor, // must be ISO string or null per Zod
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(json?.error ?? `Request failed (${res.status})`);
    e.status = res.status;
    e.debug = res.headers.get("x-debug") ?? null;
    throw e;
  }

  // Shape: { data: { id, status, scheduled_for, created_at, patient_id, patients: {...} } }
  return mapRow(json.data);
}

/** Uniform error for PostgrestError. */
function decorate(error: PostgrestError): Error {
  const e: any = new Error(error.message);
  e.hint = error.hint;
  e.details = error.details;
  e.code = error.code;
  return e;
}
