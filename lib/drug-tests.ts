import { supabase } from "@/lib/supabase-browser";

export type TestStatus = "pending" | "completed" | "missed";
export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null;
  createdAt: string;
  patient: { id: string; name: string; email: string | null };
};

function personName(row: any): string {
  const full = row?.patients?.full_name;
  if (full && String(full).trim()) return String(full).trim();
  const first = row?.patients?.first_name ?? "";
  const last = row?.patients?.last_name ?? "";
  const combo = `${first} ${last}`.trim();
  return combo || "Unknown";
}
function shape(row: any): DrugTest {
  return {
    id: row.id,
    status: row.status,
    scheduledFor: row.scheduled_for ?? null,
    createdAt: row.created_at,
    patient: {
      id: row?.patients?.user_id ?? row.patient_id,
      name: personName(row),
      email: row?.patients?.email ?? null,
    },
  };
}

export async function createDrugTest(input: { patientId: string; scheduledFor: string | null }) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;

  const res = await fetch("/api/drug-tests", {
    method: "POST",
    credentials: "include", // send cookies if any
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // <-- important
    },
    body: JSON.stringify(input),
  });

  let json: any = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) {
    const err: any = new Error(json?.error ?? `Failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
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
  const needle = (opts.q ?? "").trim().toLowerCase();
  if (!needle) return rows;

  return rows.filter((r) => {
    const name = r.patient.name.toLowerCase();
    const email = (r.patient.email ?? "").toLowerCase();
    return name.includes(needle) || email.includes(needle);
  });
}

export function subscribeDrugTests(onChange: () => void) {
  const ch = supabase
    .channel("rt_drug_tests")
    .on("postgres_changes", { event: "*", schema: "public", table: "drug_tests" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}
