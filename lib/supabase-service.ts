import { createClient, type RealtimeChannel } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Avoid silent failures
  console.warn("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

function requireSupabase() {
  if (!supabase) throw new Error("Supabase client not configured")
  return supabase
}

async function getCurrentUserId(): Promise<string> {
  const sb = requireSupabase()
  const { data, error } = await sb.auth.getUser()
  if (error) throw error
  const id = data.user?.id
  if (!id) throw new Error("Not authenticated")
  return id
}

/** Matches `public.patients` where PK = user_id (uuid) */
export interface PatientRecord {
  user_id: string
  email: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone_number?: string | null
  date_of_birth?: string | null // YYYY-MM-DD
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  treatment_program?: string | null
  created_at?: string
  updated_at?: string
}

/** Adjust if your `intake_forms` table differs */
export interface IntakeFormRecord {
  id: string
  patient_id: string // references patients.user_id
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  current_medications?: string | null
  medical_conditions?: string | null
  allergies?: string | null
  previous_treatment?: boolean | null
  previous_treatment_details?: string | null
  treatment_type: "inpatient" | "outpatient" | "intensive_outpatient"
  preferred_contact_method: "phone" | "email" | "text"
  insurance_provider?: string | null
  insurance_policy_number?: string | null
  consent_to_treatment: boolean
  privacy_policy_agreed: boolean
  status: "pending" | "reviewed" | "approved" | "rejected"
  submitted_at: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  notes?: string | null
}

// Only allow safe fields to be patched by the user
const EDITABLE_PATIENT_FIELDS = new Set<keyof PatientRecord>([
  "email",
  "full_name",
  "first_name",
  "last_name",
  "phone_number",
  "date_of_birth",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
  "treatment_program",
])

function pickEditablePatientPatch(patch: Partial<PatientRecord>): Partial<PatientRecord> {
  const out: Partial<PatientRecord> = {}
  for (const k of Object.keys(patch) as (keyof PatientRecord)[]) {
    if (EDITABLE_PATIENT_FIELDS.has(k)) {
      // normalize undefined → null to satisfy PostgREST
      // @ts-expect-error index type ok
      out[k] = patch[k] ?? null
    }
  }
  return out
}

export class SupabaseService {
  private static instance: SupabaseService
  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) SupabaseService.instance = new SupabaseService()
    return SupabaseService.instance
  }

  isAvailable(): boolean { return !!supabase }

  /** Create/update my patient row (idempotent). Pull defaults from Auth metadata. */
  async upsertMyPatient(initial?: Partial<PatientRecord>): Promise<PatientRecord> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()
    const { data: userRes } = await sb.auth.getUser()
    const auth = userRes.user

    const payload: PatientRecord = {
      user_id,
      email: auth?.email ?? null,
      full_name: (auth?.user_metadata?.full_name as string | undefined) ?? null,
      first_name: (auth?.user_metadata?.first_name as string | undefined) ?? null,
      last_name: (auth?.user_metadata?.last_name as string | undefined) ?? null,
      phone_number: (auth?.user_metadata?.phone as string | undefined) ?? null,
      ...initial,
    }

    const { data, error } = await sb
      .from("patients")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single()

    if (error) throw error
    return data as PatientRecord
  }

  async getMyPatient(): Promise<PatientRecord | null> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()
    const { data, error } = await sb
      .from("patients")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle()
    if (error) throw error
    return (data as PatientRecord) ?? null
  }

  async updateMyPatient(patch: Partial<PatientRecord>): Promise<PatientRecord> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()
    const safePatch = pickEditablePatientPatch(patch)

    const { data, error } = await sb
      .from("patients")
      .update(safePatch)
      .eq("user_id", user_id)
      .select("*")
      .single()

    if (error) throw error
    return data as PatientRecord
  }

  // ==== Intake forms (scoped to my user) ====

  async createIntakeForm(form: Omit<IntakeFormRecord, "id" | "submitted_at" | "patient_id">)
    : Promise<IntakeFormRecord> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()
    const payload = { ...form, patient_id: user_id }

    const { data, error } = await sb
      .from("intake_forms")
      .insert(payload)
      .select("*")
      .single()
    if (error) throw error
    return data as IntakeFormRecord
  }

  async getMyIntakeForms(): Promise<IntakeFormRecord[]> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()
    const { data, error } = await sb
      .from("intake_forms")
      .select("*")
      .eq("patient_id", user_id)
      .order("submitted_at", { ascending: false })
    if (error) throw error
    return (data as IntakeFormRecord[]) ?? []
  }

  // ==== Realtime subscriptions ====

  async subscribeToMyPatient(
    callback: (row: PatientRecord | null, ev: "INSERT" | "UPDATE" | "DELETE") => void
  ): Promise<RealtimeChannel> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()

    return sb
      .channel(`patients:${user_id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "patients",
        filter: `user_id=eq.${user_id}`,
      }, (payload) => {
        // @ts-expect-error payload shapes depend on event
        callback((payload.new as PatientRecord) ?? null, payload.eventType as any)
      })
      .subscribe()
  }

  async subscribeToMyIntakeForms(callback: (payload: any) => void): Promise<RealtimeChannel> {
    const sb = requireSupabase()
    const user_id = await getCurrentUserId()
    return sb
      .channel(`intake_forms:${user_id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "intake_forms",
        filter: `patient_id=eq.${user_id}`,
      }, callback)
      .subscribe()
  }

  async unsubscribe(channel: RealtimeChannel) {
    const sb = requireSupabase()
    await sb.removeChannel(channel)
  }
}

export const supabaseService = SupabaseService.getInstance()
