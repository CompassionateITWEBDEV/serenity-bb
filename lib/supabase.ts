import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export interface PatientRecord {
  id: string
  email: string
  password_hash: string
  full_name: string
  phone_number?: string
  date_of_birth?: string
  created_at: string
  updated_at: string
  is_active: boolean
  last_login?: string
}

export interface IntakeFormRecord {
  id: string
  patient_id: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  current_medications?: string
  medical_conditions?: string
  allergies?: string
  previous_treatment?: boolean
  previous_treatment_details?: string
  treatment_type: "inpatient" | "outpatient" | "intensive_outpatient"
  preferred_contact_method: "phone" | "email" | "text"
  insurance_provider?: string
  insurance_policy_number?: string
  consent_to_treatment: boolean
  privacy_policy_agreed: boolean
  status: "pending" | "reviewed" | "approved" | "rejected"
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  notes?: string
}

export class SupabaseService {
  private static instance: SupabaseService

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService()
    }
    return SupabaseService.instance
  }

  isAvailable(): boolean {
    return supabase !== null
  }

  async createPatient(
    patientData: Omit<PatientRecord, "id" | "created_at" | "updated_at">,
  ): Promise<PatientRecord | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase.from("patients").insert([patientData]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating patient:", error)
      return null
    }
  }

  async getPatientByEmail(email: string): Promise<PatientRecord | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase.from("patients").select("*").eq("email", email).single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error getting patient by email:", error)
      return null
    }
  }

  async updatePatient(patientId: string, updateData: Partial<PatientRecord>): Promise<PatientRecord | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase.from("patients").update(updateData).eq("id", patientId).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating patient:", error)
      return null
    }
  }

  async createIntakeForm(formData: Omit<IntakeFormRecord, "id" | "submitted_at">): Promise<IntakeFormRecord | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase.from("intake_forms").insert([formData]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating intake form:", error)
      return null
    }
  }

  async getPatientIntakeForms(patientId: string): Promise<IntakeFormRecord[]> {
    if (!supabase) return []

    try {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("*")
        .eq("patient_id", patientId)
        .order("submitted_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting intake forms:", error)
      return []
    }
  }

  async subscribeToPatientUpdates(patientId: string, callback: (payload: any) => void) {
    if (!supabase) return null

    return supabase
      .channel(`patient-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patients",
          filter: `id=eq.${patientId}`,
        },
        callback,
      )
      .subscribe()
  }

  async subscribeToIntakeFormUpdates(callback: (payload: any) => void) {
    if (!supabase) return null

    return supabase
      .channel("intake-forms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "intake_forms",
        },
        callback,
      )
      .subscribe()
  }
}

export const supabaseService = SupabaseService.getInstance()
