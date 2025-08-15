// lib/auth.ts
"use client"

import { apiClient, ApiError, type UserProfile as ServerUserProfile } from "./api-client"
import { supabaseService } from "./supabase"

export interface Patient {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  treatmentPlan: string
  joinDate: string
  avatar?: string
}

export interface AuthState {
  isAuthenticated: boolean
  patient: Patient | null
  loading: boolean
}

/** Server profile fields beyond the minimal UserProfile we know about. */
type ServerUserExtras = {
  date_of_birth?: string | null
  phone_number?: string | null
  emergency_contact?: {
    name?: string | null
    phone?: string | null
    relationship?: string | null
  } | null
  treatment_plan?: string | null
  created_at?: string | null
  avatar?: string | null
}

/** Safely map a server user to our Patient shape. */
function toPatient(up: ServerUserProfile & Partial<ServerUserExtras>): Patient {
  const email = up.email ?? ""
  const fullName = (up.full_name ?? "").trim()
  const parts = fullName.split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ""
  const lastName = parts.slice(1).join(" ") || ""
  const created = (up.created_at ?? "").split("T")[0]

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
  }
}

export class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    isAuthenticated: false,
    patient: null,
    loading: false,
  }
  private listeners: Array<(state: AuthState) => void> = []

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    for (const l of this.listeners) l(this.authState)
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authState.loading = true
    this.notify()

    try {
      // Try Supabase hinting first (non-blocking)
      if (supabaseService.isAvailable()) {
        try {
          const supabasePatient = await supabaseService.getPatientByEmail(email)
          if (supabasePatient) {
            await supabaseService.updatePatient(supabasePatient.id, {
              last_login: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.warn("Supabase pre-check failed (ignored):", e)
        }
      }

      // API auth
      const auth = await apiClient.login(email, password)

      // Store token (in addition to ApiClient reading from localStorage)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("auth_token", auth.access_token)
        } catch {}
      }

      // Fetch profile (typed)
      const userProfile = (await apiClient.getCurrentUser()) as ServerUserProfile & Partial<ServerUserExtras>
      const patient = toPatient(userProfile)

      this.authState = { isAuthenticated: true, patient, loading: false }

      if (typeof window !== "undefined") {
        try {
          const serialized = JSON.stringify(patient)
          localStorage.setItem("patient_auth", serialized)
          document.cookie = `patient_auth=${serialized}; path=/; max-age=${60 * 60 * 24 * 7}`
          document.cookie = `auth_token=${auth.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`
        } catch {}
      }

      this.notify()
      return { success: true }
    } catch (error) {
      this.authState.loading = false
      this.notify()

      if (error instanceof ApiError && error.status === 0) {
        // Network/offline fallback
        return this.fallbackLogin(email, password)
      }

      return {
        success: false,
        error: error instanceof ApiError ? error.message : "Invalid email or password",
      }
    }
  }

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
      }

      this.authState = { isAuthenticated: true, patient, loading: false }

      if (typeof window !== "undefined") {
        try {
          const serialized = JSON.stringify(patient)
          localStorage.setItem("patient_auth", serialized)
          document.cookie = `patient_auth=${serialized}; path=/; max-age=${60 * 60 * 24 * 7}`
        } catch {}
      }

      this.notify()
      return { success: true }
    }

    return { success: false, error: "Invalid email or password. Please check your credentials." }
  }

  async signup(
    patientData: Omit<Patient, "id" | "joinDate"> & { password?: string },
  ): Promise<{ success: boolean; error?: string }> {
    this.authState.loading = true
    this.notify()

    try {
      // Try Supabase creation (non-blocking)
      if (supabaseService.isAvailable()) {
        try {
          await supabaseService.createPatient({
            email: patientData.email,
            password_hash: "", // hashed by backend
            full_name: `${patientData.firstName} ${patientData.lastName}`,
            phone_number: patientData.phoneNumber,
            date_of_birth: patientData.dateOfBirth,
            is_active: true,
            last_login: undefined,
          })
        } catch (e) {
          console.warn("Supabase create failed (ignored):", e)
        }
      }

      await apiClient.register({
        email: patientData.email,
        password: patientData.password || "password123",
        full_name: `${patientData.firstName} ${patientData.lastName}`,
      })

      // Auto-login after registration
      return this.login(patientData.email, patientData.password || "password123")
    } catch (error) {
      this.authState.loading = false
      this.notify()

      if (error instanceof ApiError && error.status === 0) {
        // Offline/demo account
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
        }

        this.authState = { isAuthenticated: true, patient, loading: false }

        if (typeof window !== "undefined") {
          try {
            const serialized = JSON.stringify(patient)
            localStorage.setItem("patient_auth", serialized)
            document.cookie = `patient_auth=${serialized}; path=/; max-age=${60 * 60 * 24 * 7}`
          } catch {}
        }

        this.notify()
        return { success: true }
      }

      return { success: false, error: error instanceof ApiError ? error.message : "Registration failed" }
    }
  }

  logout() {
    this.authState = { isAuthenticated: false, patient: null, loading: false }

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("patient_auth")
        localStorage.removeItem("auth_token")
        document.cookie = "patient_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      } catch {}
    }

    this.notify()
  }

  async checkAuth() {
    if (typeof window === "undefined") return

    const token = localStorage.getItem("auth_token")
    const stored = localStorage.getItem("patient_auth")

    if (token && stored) {
      try {
        // Verify token is still valid
        await apiClient.getCurrentUser()

        const patient = JSON.parse(stored) as Patient
        this.authState = { isAuthenticated: true, patient, loading: false }
        document.cookie = `patient_auth=${stored}; path=/; max-age=${60 * 60 * 24 * 7}`
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
        this.notify()
        return
      } catch {
        // Token invalid → clear
        try {
          localStorage.removeItem("patient_auth")
          localStorage.removeItem("auth_token")
        } catch {}
        document.cookie = "patient_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        this.authState.loading = false
        this.notify()
        return
      }
    }

    if (stored && !token) {
      try {
        const patient = JSON.parse(stored) as Patient
        this.authState = { isAuthenticated: true, patient, loading: false }
        this.notify()
      } catch {
        this.authState.loading = false
        this.notify()
      }
      return
    }

    this.authState.loading = false
    this.notify()
  }

  getAuthState(): AuthState {
    return this.authState
  }
}
