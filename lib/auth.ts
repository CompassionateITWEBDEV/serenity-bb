// path: lib/auth.ts
"use client";

import type { Session, User } from "@supabase/supabase-js";
import { apiClient, ApiError, type UserProfile as ServerUserProfile } from "./api-client";
import { getSupabaseClient } from "@/lib/supabase/client"; // ✅ singleton

/* ===================== Types ===================== */

export interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  treatmentPlan: string;
  joinDate: string;
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  patient: Patient | null;
  loading: boolean;
}

/** Server profile fields beyond the minimal UserProfile we know about. */
type ServerUserExtras = {
  date_of_birth?: string | null;
  phone_number?: string | null;
  emergency_contact?: {
    name?: string | null;
    phone?: string | null;
    relationship?: string | null;
  } | null;
  treatment_plan?: string | null;
  created_at?: string | null;
  avatar?: string | null;
};

/* ===================== Supabase Client (singleton) ===================== */

function supabaseAvailable(): boolean {
  try {
    // Throws if envs are missing; prevents accidental multi-client creation
    getSupabaseClient();
    return true;
  } catch {
    return false;
  }
}

/* ===================== Mappers ===================== */

// Map your existing backend UserProfile (+extras) -> Patient
function toPatientFromApi(up: ServerUserProfile & Partial<ServerUserExtras>): Patient {
  const email = up.email ?? "";
  const fullName = (up.full_name ?? "").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";
  const created = (up.created_at ?? "").split("T")[0];

  return {
    id: String(up.id),
    email,
    firstName,
    lastName,
    dateOfBirth: up.date_of_birth ?? "",
    phoneNumber: up.phone_number ?? "",
    emergencyContact: {
      name: up.emergency_contact?.name ?? "",
      phone: up.emergency_contact?.phone ?? "",
      relationship: up.emergency_contact?.relationship ?? "",
    },
    treatmentPlan: up.treatment_plan ?? "Standard Recovery Program",
    joinDate: created || new Date().toISOString().split("T")[0],
    avatar: up.avatar ?? "/patient-avatar.png",
  };
}

// Map a row from Supabase `patients` + user metadata -> Patient
type PatientRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  treatment_program: string | null;
  created_at: string | null;
  avatar: string | null;
};

function toPatientFromSupabase(row: PatientRow | null, user: User): Patient {
  const metadata = (user.user_metadata ?? {}) as { firstName?: string; lastName?: string };
  const created = (row?.created_at ?? user.created_at ?? "").split("T")[0];

  const first = row?.first_name ?? metadata.firstName ?? (row?.full_name?.split(" ")[0] ?? "");
  const last =
    row?.last_name ??
    metadata.lastName ??
    (row?.full_name ? row.full_name.split(" ").slice(1).join(" ") : "");

  return {
    id: user.id,
    email: row?.email ?? user.email ?? "",
    firstName: first ?? "",
    lastName: last ?? "",
    dateOfBirth: row?.date_of_birth ?? "",
    phoneNumber: row?.phone_number ?? "",
    emergencyContact: {
      name: row?.emergency_contact_name ?? "",
      phone: row?.emergency_contact_phone ?? "",
      relationship: row?.emergency_contact_relationship ?? "",
    },
    treatmentPlan: row?.treatment_program ?? "Standard Recovery Program",
    joinDate: created || new Date().toISOString().split("T")[0],
    avatar: row?.avatar ?? "/patient-avatar.png",
  };
}

/* ===================== Storage helpers ===================== */
// Why: keep legacy app behavior without touching Supabase's own cookies
function saveAuth(patient: Patient, token?: string | null) {
  try {
    const serialized = JSON.stringify(patient);
    localStorage.setItem("patient_auth", serialized);
    document.cookie = `patient_auth=${encodeURIComponent(serialized)}; path=/; max-age=${60 * 60 * 24 * 7}`;
    if (token) {
      localStorage.setItem("auth_token", token);
      document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}`;
    }
  } catch {
    // ignore storage errors
  }
}

function clearAuth() {
  try {
    localStorage.removeItem("patient_auth");
    localStorage.removeItem("auth_token");
    document.cookie = "patient_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch {}
}

/* ===================== Auth Service ===================== */

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    patient: null,
    loading: false,
  };
  private listeners: Array<(state: AuthState) => void> = [];

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) l(this.authState);
  }

  /* ---------- LOGIN ---------- */
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authState.loading = true;
    this.notify();

    // Prefer Supabase if configured (singleton)
    if (supabaseAvailable()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data?.user) throw new Error(error?.message || "Invalid credentials");

        // Fetch patient row (RLS: user must see own row)
        const { data: row } = await supabase
          .from("patients")
          .select(
            "user_id, first_name, last_name, full_name, email, phone_number, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, treatment_program, created_at, avatar"
          )
          .eq("user_id", data.user.id)
          .maybeSingle();

        const patient = toPatientFromSupabase(row as PatientRow | null, data.user);

        // Persist legacy tokens (navbar, etc.)
        const token = data.session?.access_token ?? null;
        saveAuth(patient, token);

        this.authState = { isAuthenticated: true, patient, loading: false };
        this.notify();
        return { success: true };
      } catch (e) {
        // fall through to API fallback
      }
    }

    // Fallback to your existing backend API
    try {
      const auth = await apiClient.login(email, password);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("auth_token", auth.access_token);
        } catch {}
      }

      const userProfile = (await apiClient.getCurrentUser()) as ServerUserProfile & Partial<ServerUserExtras>;
      const patient = toPatientFromApi(userProfile);

      saveAuth(patient, auth.access_token);
      this.authState = { isAuthenticated: true, patient, loading: false };
      this.notify();
      return { success: true };
    } catch (error) {
      this.authState.loading = false;
      this.notify();

      if (error instanceof ApiError && error.status === 0) {
        return this.fallbackLogin(email, password);
      }

      return { success: false, error: error instanceof ApiError ? error.message : "Invalid email or password" };
    }
  }

  /* ---------- SIGNUP ---------- */
  async signup(
    patientData: Omit<Patient, "id" | "joinDate"> & { password?: string }
  ): Promise<{ success: boolean; error?: string }> {
    this.authState.loading = true;
    this.notify();

    if (supabaseAvailable()) {
      try {
        const supabase = getSupabaseClient();
        const { email, password } = {
          email: patientData.email,
          password: patientData.password || "password123",
        };

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "patient",
              firstName: patientData.firstName,
              lastName: patientData.lastName,
            },
          },
        });
        if (error) throw error;

        // If email confirm is ON, session may be null; stop here.
        if (!data.session || !data.user) {
          this.authState.loading = false;
          this.notify();
          return { success: true };
        }

        await supabase
          .from("patients")
          .upsert({
            user_id: data.user.id,
            first_name: patientData.firstName,
            last_name: patientData.lastName,
            full_name: `${patientData.firstName} ${patientData.lastName}`,
            email: patientData.email,
            phone_number: patientData.phoneNumber,
            date_of_birth: patientData.dateOfBirth,
            emergency_contact_name: patientData.emergencyContact?.name ?? null,
            emergency_contact_phone: patientData.emergencyContact?.phone ?? null,
            emergency_contact_relationship: patientData.emergencyContact?.relationship ?? null,
            treatment_program: patientData.treatmentPlan,
          })
          .throwOnError();

        const patient = toPatientFromSupabase(null, data.user);
        saveAuth(patient, data.session.access_token);

        this.authState = { isAuthenticated: true, patient, loading: false };
        this.notify();
        return { success: true };
      } catch {
        // fall through to API signup
      }
    }

    try {
      await apiClient.register({
        email: patientData.email,
        password: patientData.password || "password123",
        full_name: `${patientData.firstName} ${patientData.lastName}`,
      });

      return this.login(patientData.email, patientData.password || "password123");
    } catch (error) {
      this.authState.loading = false;
      this.notify();

      if (error instanceof ApiError && error.status === 0) {
        const patient: Patient = {
          id: `demo-${Date.now()}`,
          email: patientData.email,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          dateOfBirth: patientData.dateOfBirth,
          phoneNumber: patientData.phoneNumber,
          emergencyContact: patientData.emergencyContact,
          treatmentPlan: patientData.treatmentPlan,
          joinDate: new Date().toISOString().split("T")[0],
          avatar: "/patient-avatar.png",
        };
        saveAuth(patient, null);
        this.authState = { isAuthenticated: true, patient, loading: false };
        this.notify();
        return { success: true };
      }

      return { success: false, error: error instanceof ApiError ? error.message : "Registration failed" };
    }
  }

  /* ---------- LOGOUT ---------- */
  async logout() {
    if (supabaseAvailable()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    clearAuth();
    this.authState = { isAuthenticated: false, patient: null, loading: false };
    this.notify();
  }

  /* ---------- CHECK AUTH ---------- */
  async checkAuth() {
    if (typeof window === "undefined") return;

    this.authState.loading = true;
    this.notify();

    // Prefer Supabase session (singleton client)
    if (supabaseAvailable()) {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const session: Session | null = data.session;

        if (session?.user) {
          const { data: row } = await supabase
            .from("patients")
            .select(
              "user_id, first_name, last_name, full_name, email, phone_number, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, treatment_program, created_at, avatar"
            )
            .eq("user_id", session.user.id)
            .maybeSingle();

          const patient = toPatientFromSupabase(row as PatientRow | null, session.user);
          saveAuth(patient, session.access_token);
          this.authState = { isAuthenticated: true, patient, loading: false };
          this.notify();
          return;
        }
      } catch {
        // continue to legacy fallback
      }
    }

    // Legacy/API token path
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const stored = typeof window !== "undefined" ? localStorage.getItem("patient_auth") : null;

    if (token && stored) {
      try {
        await apiClient.getCurrentUser(); // validate token
        const patient = JSON.parse(stored) as Patient;
        saveAuth(patient, token);
        this.authState = { isAuthenticated: true, patient, loading: false };
        this.notify();
        return;
      } catch {
        clearAuth();
      }
    }

    if (stored && !token) {
      try {
        const patient = JSON.parse(stored) as Patient;
        this.authState = { isAuthenticated: true, patient, loading: false };
        this.notify();
        return;
      } catch {
        // fall through
      }
    }

    this.authState = { isAuthenticated: false, patient: null, loading: false };
    this.notify();
  }

  /* ---------- DEMO FALLBACK ---------- */
  private async fallbackLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (email === "john.doe@email.com" && password === "password123") {
      const patient: Patient = {
        id: "demo-patient-1",
        email,
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-01",
        phoneNumber: "(555) 123-4567",
        emergencyContact: { name: "Jane Doe", phone: "(555) 987-6543", relationship: "spouse" },
        treatmentPlan: "Comprehensive Recovery Program",
        joinDate: new Date().toISOString().split("T")[0],
        avatar: "/patient-avatar.png",
      };
      saveAuth(patient, null);
      this.authState = { isAuthenticated: true, patient, loading: false };
      this.notify();
      return { success: true };
    }
    return { success: false, error: "Invalid email or password. Please check your credentials." };
  }

  /* ---------- GETTER ---------- */
  getAuthState(): AuthState {
    return this.authState;
  }
}
