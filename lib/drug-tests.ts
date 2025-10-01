import { supabase, getAuthUser, subscribeToTable } from "@/lib/supabase-browser";

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

function coalesceName(row: any): string {
  const fullName =
    row?.patients?.full_name ??
    `${row?.patients?.first_name ?? ""} ${row?.patients?.last_name ?? ""}`.trim();
  return fullName && fullName.length > 0 ? fullName : "Unknown";
}

function shapeTest(row: any): DrugTest {
  return {
    id: row.id,
    status: row.status,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    patient: {
      id: row.patients?.user_id ?? row.patient_id,
      name: coalesceName(row),
      email: row.patients?.email ?? null,
    },
  };
}

export async function createDrugTest(input: { patientId: string; scheduledFor: string | null }) {
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated.");

  const payload = {
    patient_id: input.patientId,
    scheduled_for: input.scheduledFor,
    created_by: user.id, // trigger will also set; explicit keeps intent clear
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

export function subscribeDrugTests(onChange: () => void) {
  // Fire on any INSERT/UPDATE/DELETE
  return subscribeToTable({
    table: "drug_tests",
    onInsert: () => onChange(),
    onUpdate: () => onChange(),
    onDelete: () => onChange(),
  });
}
