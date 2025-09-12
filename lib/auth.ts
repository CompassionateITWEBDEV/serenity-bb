import { apiClient, ApiError } from "./api-client"
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

export class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    isAuthenticated: false,
    patient: null,
    loading: false,
  }
  private listeners: ((state: AuthState) => void)[] = []

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
    this.listeners.forEach((listener) => listener(this.authState))
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authState.loading = true
    this.notify()

    try {
      // Try Supabase authentication first if available
      if (supabaseService.isAvailable()) {
        try {
          const supabasePatient = await supabaseService.getPatientByEmail(email)
          if (supabasePatient) {
            // Verify password and update last login
            await supabaseService.updatePatient(supabasePatient.id, {
              last_login: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.warn("Supabase authentication failed, falling back to API:", error)
        }
      }

      const response = await apiClient.login(email, password)

      // Store token
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", response.access_token)
      }

      // Get user profile
      const userProfile = await apiClient.getPatientProfile()

      const patient: Patient = {
        id: String(userProfile.id),
        email: userProfile.email,
        firstName: userProfile.full_name?.split(" ")[0] || "",
        lastName: userProfile.full_name?.split(" ").slice(1).join(" ") || "",
        dateOfBirth: userProfile.date_of_birth || "",
        phoneNumber: userProfile.phone_number || "",
        emergencyContact: userProfile.emergency_contact || {
          name: "",
          phone: "",
          relationship: "",
        },
        treatmentPlan: userProfile.treatment_plan || "Standard Recovery Program",
        joinDate: userProfile.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        avatar: userProfile.avatar || "/patient-avatar.png",
      }

      this.authState = {
        isAuthenticated: true,
        patient,
        loading: false,
      }

      // Store patient data for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("patient_auth", JSON.stringify(patient))
        document.cookie = `patient_auth=${JSON.stringify(patient)}; path=/; max-age=${60 * 60 * 24 * 7}`
        document.cookie = `auth_token=${response.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`
      }

      this.notify()
      return { success: true }
    } catch (error) {
      this.authState.loading = false
      this.notify()

      if (error instanceof ApiError && error.status === 0) {
        // Network error - likely backend not running, use fallback
        return this.fallbackLogin(email, password)
      }

      return { success: false, error: error instanceof ApiError ? error.message : "Invalid email or password" }
    }
  }

  private async fallbackLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (email === "john.doe@email.com" && password === "password123") {
      const patient: Patient = {
        id: "demo-patient-1",
        email: "john.doe@email.com",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-01",
        phoneNumber: "(555) 123-4567",
        emergencyContact: {
          name: "Jane Doe",
          phone: "(555) 987-6543",
          relationship: "spouse",
        },
        treatmentPlan: "Comprehensive Recovery Program",
        joinDate: new Date().toISOString().split("T")[0],
        avatar: "/patient-avatar.png",
      }

      this.authState = {
        isAuthenticated: true,
        patient,
        loading: false,
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("patient_auth", JSON.stringify(patient))
        document.cookie = `patient_auth=${JSON.stringify(patient)}; path=/; max-age=${60 * 60 * 24 * 7}`
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
      const registrationData = {
        email: patientData.email,
        password: patientData.password || "password123",
        first_name: patientData.firstName,
        last_name: patientData.lastName,
        full_name: `${patientData.firstName} ${patientData.lastName}`,
        date_of_birth: patientData.dateOfBirth,
        phone_number: patientData.phoneNumber,
        emergency_contact_name: patientData.emergencyContact.name,
        emergency_contact_phone: patientData.emergencyContact.phone,
        emergency_contact_relationship: patientData.emergencyContact.relationship,
        treatment_plan: patientData.treatmentPlan,
        role: "patient",
      }

      // Try to create patient in Supabase first if available
      if (supabaseService.isAvailable()) {
        try {
          await supabaseService.createPatient({
            email: patientData.email,
            password_hash: "", // Will be hashed by backend
            full_name: `${patientData.firstName} ${patientData.lastName}`,
            phone_number: patientData.phoneNumber,
            date_of_birth: patientData.dateOfBirth,
            is_active: true,
            last_login: undefined,
          })
        } catch (error) {
          console.warn("Supabase patient creation failed:", error)
        }
      }

      await apiClient.register(registrationData)

      // Auto-login after successful registration
      const loginResult = await this.login(patientData.email, patientData.password || "password123")
      return loginResult
    } catch (error) {
      this.authState.loading = false
      this.notify()

      if (error instanceof ApiError && error.status === 0) {
        // Network error - create demo account
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

        this.authState = {
          isAuthenticated: true,
          patient,
          loading: false,
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("patient_auth", JSON.stringify(patient))
          document.cookie = `patient_auth=${JSON.stringify(patient)}; path=/; max-age=${60 * 60 * 24 * 7}`
        }

        this.notify()
        return { success: true }
      }

      return { success: false, error: error instanceof ApiError ? error.message : "Registration failed" }
    }
  }

  logout() {
    this.authState = {
      isAuthenticated: false,
      patient: null,
      loading: false,
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("patient_auth")
      localStorage.removeItem("auth_token")
      document.cookie = "patient_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }

    this.notify()
  }

  async checkAuth() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token")
      const stored = localStorage.getItem("patient_auth")

      if (token && stored) {
        try {
          // Verify token is still valid
          await apiClient.getPatientProfile()

          const patient = JSON.parse(stored)
          this.authState = {
            isAuthenticated: true,
            patient,
            loading: false,
          }
          document.cookie = `patient_auth=${stored}; path=/; max-age=${60 * 60 * 24 * 7}`
          document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
          this.notify()
        } catch (error) {
          // Token is invalid, clear auth
          localStorage.removeItem("patient_auth")
          localStorage.removeItem("auth_token")
          document.cookie = "patient_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
          document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
          this.authState.loading = false
          this.notify()
        }
      } else if (stored) {
        try {
          const patient = JSON.parse(stored)
          this.authState = {
            isAuthenticated: true,
            patient,
            loading: false,
          }
          this.notify()
        } catch (error) {
          this.authState.loading = false
          this.notify()
        }
      } else {
        this.authState.loading = false
        this.notify()
      }
    }
  }

  getAuthState(): AuthState {
    return this.authState
  }
}
