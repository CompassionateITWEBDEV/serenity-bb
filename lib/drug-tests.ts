import { supabase } from "@/lib/supabase-browser";

export type TestStatus = "pending" | "completed" | "missed";
export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null;
  createdAt: string;
  patient: { id: string; name: string; email: string | null };
};

function coalesceName(row: any): string {
  const full = row?.patients?.full_name ?? `${row?.patients?.first_name ?? ""} ${row?.patients?.last_name ?? ""}`.trim();
  return full && full.length > 0 ? full : "Unknown";
}
function shape(row: any): DrugTest {
  return {
    id: row.id,
    status: row.status,
    scheduledFor: row.scheduled_for ?? null,
    createdAt: row.created_at,
    patient: {
      id: row.patients?.user_id ?? row.patient_id,
      name: coalesceName(row),
      email: row.patients?.email ?? null,
    },
  };
}

/** Server-backed creation so it works even when browser session is missing. */
export async function createDrugTest(input: { patientId: string; scheduledFor: string | null }) {
  const res = await fetch("/api/drug-tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to create");
  return shape(json.data);
}

export async function listDrugTests(opts: { q?: string; status?: TestStatus }) {
  let q = supabase
    .from("drug_tests")
    .select(
      `id, status, scheduled_for, created_at, patient_id,
       patients:patient_id ( user_id, full_name, first_name, last_name, email )`
    )
    .order("created_at", { ascending: false });

  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map(shape);
  if (!opts.q) return rows;

  const needle = opts.q.trim().toLowerCase();
  return rows.filter((r) => {
    const name = r.patient.name.toLowerCase();
    const email = (r.patient.email ?? "").toLowerCase();
    return name.includes(needle) || email.includes(needle);
  });
}

export function subscribeDrugTests(onChange: () => void) {
  const ch = supabase
    .channel("rt-drug-tests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "drug_tests" },
      () => onChange()
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
