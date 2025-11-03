"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const CreateTestSchema = z.object({
  patientId: z.string().min(1, "patientId required"),
  scheduledFor: z.string().datetime().nullable(), // ISO or null
});

export async function createRandomTest(payload: {
  patientId: string;
  scheduledFor: string | null;
}) {
  const parse = CreateTestSchema.safeParse(payload);
  if (!parse.success) {
    throw new Error(parse.error.issues.map(i => i.message).join(", "));
  }

  const supabase = supabaseServer();

  // Will throw the “Auth session missing!” error if we didn't bind cookies.
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    // Why: surface auth-helper issues explicitly for quicker diagnosis.
    throw new Error(`Auth error: ${authErr.message}`);
  }
  if (!auth?.user) {
    // Why: clarity for callers (e.g., show login modal).
    throw new Error("Unauthorized: no active user session.");
  }

  const { patientId, scheduledFor } = parse.data;

  // Example table. Change to your real table/columns.
  const { error: insertErr } = await supabase
    .from("drug_tests")
    .insert({
      patient_id: patientId,
      scheduled_for: scheduledFor, // null or ISO string is fine for timestamptz
      created_by: auth.user.id,
    });

  if (insertErr) {
    throw new Error(`Insert failed: ${insertErr.message}`);
  }
}
