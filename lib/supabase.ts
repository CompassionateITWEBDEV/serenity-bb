'use client';

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
// ⬇️ Reuse your ONE browser singleton client to avoid the “Multiple GoTrueClient instances” warning.
import { supabase as browserSupabase } from '@/lib/supabase/client';

/**
 * NOTE: Do NOT manage password hashes in your own table from the browser.
 * Supabase Auth stores the password hash internally. Your `patients` table should
 * only keep profile/demographic fields you control.
 */

export interface PatientRecord {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  last_login?: string;
  // password_hash intentionally omitted – managed by Supabase Auth
}

export interface IntakeFormRecord {
  id: string;
  patient_id: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  current_medications?: string;
  medical_conditions?: string;
  allergies?: string;
  previous_treatment?: boolean;
  previous_treatment_details?: string;
  treatment_type: 'inpatient' | 'outpatient' | 'intensive_outpatient';
  preferred_contact_method: 'phone' | 'email' | 'text';
  insurance_provider?: string;
  insurance_policy_number?: string;
  consent_to_treatment: boolean;
  privacy_policy_agreed: boolean;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

/** Payloads you’re allowed to write from the client */
type PatientInsert = Omit<
  PatientRecord,
  'id' | 'created_at' | 'updated_at' | 'last_login'
>;
type PatientUpdate = Partial<Omit<PatientRecord, 'id' | 'created_at' | 'updated_at'>>;

type IntakeFormInsert = Omit<IntakeFormRecord, 'id' | 'submitted_at' | 'reviewed_at' | 'reviewed_by' | 'notes'> & {
  submitted_at?: string;
  status?: IntakeFormRecord['status'];
};

export class SupabaseService {
  private static _instance: SupabaseService | null = null;
  private sb: SupabaseClient;

  private constructor(sbClient: SupabaseClient) {
    this.sb = sbClient;
  }

  /** Singleton accessor that uses the existing browser client */
  static getInstance(): SupabaseService {
    if (!browserSupabase) {
      // This only runs in the browser; if it triggers, your NEXT_PUBLIC env vars are missing.
      throw new Error('Supabase client not available. Check NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.');
    }
    if (!this._instance) {
      this._instance = new SupabaseService(browserSupabase);
    }
    return this._instance;
  }

  isAvailable(): boolean {
    return !!browserSupabase;
  }

  async createPatient(patientData: PatientInsert): Promise<PatientRecord | null> {
    try {
      const { data, error } = await this.sb
        .from('patients')
        .insert([patientData])
        .select()
        .single();
      if (error) throw error;
      return data as PatientRecord;
    } catch (error) {
      console.error('Error creating patient:', error);
      return null;
    }
  }

  async getPatientByEmail(email: string): Promise<PatientRecord | null> {
    try {
      const { data, error } = await this.sb
        .from('patients')
        .select('*')
        .eq('email', email)
        .single();
      if (error) throw error;
      return data as PatientRecord;
    } catch (error) {
      console.error('Error getting patient by email:', error);
      return null;
    }
  }

  async updatePatient(patientId: string, updateData: PatientUpdate): Promise<PatientRecord | null> {
    try {
      const { data, error } = await this.sb
        .from('patients')
        .update(updateData)
        .eq('id', patientId)
        .select()
        .single();
      if (error) throw error;
      return data as PatientRecord;
    } catch (error) {
      console.error('Error updating patient:', error);
      return null;
    }
  }

  async createIntakeForm(formData: IntakeFormInsert): Promise<IntakeFormRecord | null> {
    try {
      const { data, error } = await this.sb
        .from('intake_forms')
        .insert([formData])
        .select()
        .single();
      if (error) throw error;
      return data as IntakeFormRecord;
    } catch (error) {
      console.error('Error creating intake form:', error);
      return null;
    }
  }

  async getPatientIntakeForms(patientId: string): Promise<IntakeFormRecord[]> {
    try {
      const { data, error } = await this.sb
        .from('intake_forms')
        .select('*')
        .eq('patient_id', patientId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as IntakeFormRecord[];
    } catch (error) {
      console.error('Error getting intake forms:', error);
      return [];
    }
  }

  subscribeToPatientUpdates(patientId: string, callback: (payload: any) => void): RealtimeChannel {
    return this.sb
      .channel(`patient-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter: `id=eq.${patientId}` },
        callback
      )
      .subscribe();
  }

  subscribeToIntakeFormUpdates(callback: (payload: any) => void): RealtimeChannel {
    return this.sb
      .channel('intake-forms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'intake_forms' },
        callback
      )
      .subscribe();
  }
}

export const supabaseService = SupabaseService.getInstance();
