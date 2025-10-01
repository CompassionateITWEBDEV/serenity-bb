import { supabase } from "./supabase/browser";

export type TestStatus = "pending" | "completed" | "missed";

export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    email: string | null;
  };
};

type ListOpts = { q?: string; status?: TestStatus };

function shapeTest(row: any): DrugTest {
  return {
    id: row.id,
    status: row.status,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    patient: {
      id: row.patients?.user_id ?? row.patient_id,
      name: row.patients?.full_name ?? `${row.patients?.first_name ?? ""} ${row.patients?.last_name ?? ""}`.trim() || "Unknown",
      email: row.patients?.email ?? null,
    },
  };
}

/**
 * Why: enforce creating user identity for RLS policies.
 */
export async function createDrugTest(input: { patientId: string; scheduledFor: string | null }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated.");

  const payload = {
    patient_id: input.patientId,
    scheduled_for: input.scheduledFor,
    created_by: auth.user.id, // harmless if DB trigger auto-fills; required otherwise
    status: "pending" as const,
  };

  const { data, error } = await supabase
    .from("drug_tests")
    .insert(payload)
    .select(
      `
      id, status, scheduled_for, created_at, patient_id,
      patients:patient_id ( user_id, full_name, first_name, last_name, email )
    `
    )
    .single();

  if (error) throw new Error(error.message);
  return shapeTest(data);
}

export async function listDrugTests(opts: ListOpts) {
  let q = supabase
    .from("drug_tests")
    .select(
      `
      id, status, scheduled_for, created_at, patient_id,
      patients:patient_id ( user_id, full_name, first_name, last_name, email )
      `
    )
    .order("created_at", { ascending: false });

  if (opts.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map(shapeTest);
  if (!opts.q) return rows;

  const needle = opts.q.trim().toLowerCase();
  return rows.filter((r) => {
    const name = r.patient.name.toLowerCase();
    const email = (r.patient.email ?? "").toLowerCase();
    return name.includes(needle) || email.includes(needle);
  });
}

/**
 * Why: use Postgres Changes for low-latency updates across tabs/devices.
 */
export function subscribeDrugTests(onChange: () => void) {
  const channel = supabase
    .channel("rt-drug-tests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "drug_tests" },
      () => onChange()
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
