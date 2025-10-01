import { supabase, subscribeToTable } from "@/lib/supabase-browser";

export type TestStatus = "pending" | "completed" | "missed";

export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null;
  createdAt: string;
  patient: { id: string; name: string; email: string | null };
};

function shape(row: any): DrugTest {
  const name =
    row?.patients?.full_name ??
    `${row?.patients?.first_name ?? ""} ${row?.patients?.last_name ?? ""}`.trim() ||
    "Unknown";
  return {
    id: row.id,
    status: row.status,
    scheduledFor: row.scheduled_for ?? null,
    createdAt: row.created_at,
    patient: {
      id: row.patients?.user_id ?? row.patient_id,
      name,
      email: row.patients?.email ?? null,
    },
  };
}

export async function createDrugTest(input: { patientId: string; scheduledFor: string | null }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("drug_tests")
    .insert({
      patient_id: input.patientId,
      scheduled_for: input.scheduledFor,
      created_by: auth.user.id,
      status: "pending",
    })
    .select(
      `id, status, scheduled_for, created_at, patient_id,
       patients:patient_id ( user_id, full_name, first_name, last_name, email )`
    )
    .single();

  if (error) throw new Error(error.message);
  return shape(data);
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

export function subscribeDrugTests(onEvent: (evt: { type: "INSERT" | "UPDATE" | "DELETE"; row: any }) => void) {
  return subscribeToTable({
    table: "drug_tests",
    event: "*",
    onInsert: (row) => onEvent({ type: "INSERT", row }),
    onUpdate: (row) => onEvent({ type: "UPDATE", row }),
    onDelete: (row) => onEvent({ type: "DELETE", row }),
  });
}
