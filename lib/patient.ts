import { supabase } from "@/lib/supabase/client";

export type PatientRow = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string | null;
};

export type ApptRow = {
  id: string;
  patient_id: string;
  appointment_time: string;
  status: "scheduled" | "confirmed" | "pending" | "cancelled" | "completed";
  provider: string | null;
  type: string | null;
  title: string | null;
  duration_min: number | null;
  is_virtual: boolean;
  location: string | null;
  notes: string | null;
};

export async function getPatientById(patientId: string) {
  return await supabase
    .from("patients")
    .select("user_id, full_name, first_name, last_name, email, phone_number, created_at")
    .eq("user_id", patientId)
    .maybeSingle();
}

export async function getAppointmentsForPatient(patientId: string) {
  return await supabase
    .from("appointments")
    .select("id, patient_id, appointment_time, status, provider, type, title, duration_min, is_virtual, location, notes")
    .eq("patient_id", patientId)
    .order("appointment_time", { ascending: true });
}

/** Optional helper you can call right after auth sign-up to make sure a row exists in public.patients */
export async function ensurePatient(params: {
  user_id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
}) {
  const { user_id, ...rest } = params;
  const { data: existing, error: e1 } = await supabase
    .from("patients")
    .select("user_id")
    .eq("user_id", user_id)
    .maybeSingle();

  if (e1) return { data: null, error: e1 };

  if (existing) return { data: existing, error: null };

  const { data, error } = await supabase
    .from("patients")
    .insert({
      user_id,
      email: rest.email ?? null,
      first_name: rest.first_name ?? null,
      last_name: rest.last_name ?? null,
      full_name: rest.full_name ?? ((rest.first_name || "") + " " + (rest.last_name || "")).trim() || null,
      phone_number: rest.phone_number ?? null,
    })
    .select("user_id")
    .single();

  return { data, error };
}
