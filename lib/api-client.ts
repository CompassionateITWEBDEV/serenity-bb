import { apiClient, type ApiClient } from "@/lib/api-client"
//                         ^—— no such export

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export class ApiError extends Error {
  public status: number
  public details?: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
        throw new ApiError(errorData.message || `HTTP ${response.status}`, response.status, errorData)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      console.error("API request failed:", error)

      // Network/connection errors
      if (error instanceof TypeError || (error as any).name === "TypeError") {
        throw new ApiError("Unable to connect to server. Using offline mode with demo credentials.", 0)
      }

      throw new ApiError("Network error occurred. Please check your connection.", 0)
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const formData = new FormData()
    formData.append("username", email)
    formData.append("password", password)

    return this.request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData - let browser handle it
      },
      body: formData,
    })
  }

  async register(userData: { email: string; password: string; full_name: string }) {
    return this.request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async getCurrentUser() {
    return this.request<any>("/patients/me")
  }

  // Patient endpoints
  async getPatientProfile() {
    return this.request<any>("/patients/me")
  }

  async updatePatientProfile(data: any) {
    return this.request<any>("/patients/me", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // Appointments endpoints
  async getAppointments() {
    return this.request<any[]>("/appointments/")
  }

  async createAppointment(appointmentData: any) {
    return this.request<any>("/appointments/", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    })
  }

  // Messages endpoints
  async getMessages() {
    return this.request<any[]>("/messages/")
  }

  async sendMessage(messageData: any) {
    return this.request<any>("/messages/", {
      method: "POST",
      body: JSON.stringify(messageData),
    })
  }

  // Progress endpoints
  async getProgress() {
    return this.request<any>("/patients/progress")
  }

  async updateProgress(progressData: any) {
    return this.request<any>("/patients/progress", {
      method: "POST",
      body: JSON.stringify(progressData),
    })
  }

  // Video endpoints
  async uploadVideo(videoFile: File, metadata: any) {
    const formData = new FormData()
    formData.append("video", videoFile)
    formData.append("metadata", JSON.stringify(metadata))

    return this.request<any>("/videos/upload", {
      method: "POST",
      headers: {},
      body: formData,
    })
  }

  async getVideos() {
    return this.request<any[]>("/videos/")
  }
}

export const apiClient = new ApiClient()
