// lib/api-client.ts

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8000") as string

export class ApiError extends Error {
  public status: number
  public details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

/* =========================
   Shapes from your backend
   ========================= */

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface UserProfile {
  id: string | number
  email?: string | null
  full_name?: string | null
}

export interface Appointment {
  // adjust to your real shape
  id?: string | number
  [k: string]: unknown
}

export interface MessageItem {
  // adjust to your real shape
  id?: string | number
  [k: string]: unknown
}

export interface ProgressData {
  // adjust to your real shape
  [k: string]: unknown
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

type RequestOptions = RequestInit & {
  /** Optional query parameters for GET-like requests */
  query?: Record<string, string | number | boolean | undefined | null>
  /** If true, don’t add Authorization even if a token exists */
  omitAuth?: boolean
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData
}

function buildURL(base: string, endpoint: string, query?: RequestOptions["query"]) {
  const url = new URL(`${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue
      url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

function getStoredToken(): string | null {
  // Browser-only storage (SSR-safe)
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("auth_token")
  } catch {
    return null
  }
}

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  /** Optionally allow setting token programmatically (besides localStorage) */
  private overrideToken: string | null = null
  setAuthToken(token: string | null) {
    this.overrideToken = token
  }

  private authHeader(omitAuth?: boolean): Record<string, string> {
    if (omitAuth) return {}
    const token = this.overrideToken ?? getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as unknown as T
    }
    const ct = response.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      return (await response.json()) as T
    }
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      // Non-JSON fallback
      return text as unknown as T
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { headers, body, query, omitAuth, ...rest } = options
    const url = buildURL(this.baseURL, endpoint, query)

    const defaultHeaders: Record<string, string> = {
      ...(body && !isFormData(body) ? { "Content-Type": "application/json" } : {}),
      ...this.authHeader(omitAuth),
    }

    const init: RequestInit = {
      cache: "no-store",
      credentials: "same-origin",
      ...rest,
      headers: {
        ...defaultHeaders,
        ...(headers || {}),
      },
      body: body as BodyInit | null | undefined,
    }

    try {
      const response = await fetch(url, init)
      if (!response.ok) {
        let details: unknown = undefined
        try {
          details = await this.parseResponse<unknown>(response)
        } catch {}
        const message =
          (details && typeof details === "object" && (details as any).message) ||
          `HTTP ${response.status}`
        throw new ApiError(String(message), response.status, details)
      }
      return await this.parseResponse<T>(response)
    } catch (err) {
      if (err instanceof ApiError) throw err
      const isTypeError = err instanceof TypeError || (err as any)?.name === "TypeError"
      if (isTypeError) {
        throw new ApiError(
          "Unable to connect to server. Using offline mode with demo credentials.",
          0,
          { cause: "network" },
        )
      }
      throw new ApiError("Network error occurred. Please check your connection.", 0, {
        cause: (err as Error)?.message ?? "unknown",
      })
    }
  }

  /* ============
     Endpoints
     ============ */

  // ---------- Auth ----------
  async login(email: string, password: string): Promise<AuthResponse> {
    const formData = new FormData()
    formData.append("username", email)
    formData.append("password", password)

    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      headers: {},
      body: formData,
      omitAuth: true,
    })
  }

  async register(userData: { email: string; password: string; full_name: string }): Promise<{ message: string }> {
    // Avoid TS 'satisfies' to reduce CI/Vercel config issues
    return this.request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData as Record<string, JsonValue>),
      omitAuth: true,
    })
  }

  async getCurrentUser(): Promise<UserProfile> {
    return this.request<UserProfile>("/patients/me")
  }

  // ---------- Patient ----------
  async getPatientProfile(): Promise<UserProfile> {
    return this.request<UserProfile>("/patients/me")
  }

  async updatePatientProfile(data: Record<string, JsonValue>): Promise<UserProfile> {
    return this.request<UserProfile>("/patients/me", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // ---------- Appointments ----------
  async getAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>("/appointments/")
  }

  async createAppointment(appointmentData: Record<string, JsonValue>): Promise<Appointment> {
    return this.request<Appointment>("/appointments/", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    })
  }

  // ---------- Messages ----------
  async getMessages(): Promise<MessageItem[]> {
    return this.request<MessageItem[]>("/messages/")
  }

  async sendMessage(messageData: Record<string, JsonValue>): Promise<MessageItem> {
    return this.request<MessageItem>("/messages/", {
      method: "POST",
      body: JSON.stringify(messageData),
    })
  }

  // ---------- Progress ----------
  async getProgress(): Promise<ProgressData> {
    return this.request<ProgressData>("/patients/progress")
  }

  async updateProgress(progressData: Record<string, JsonValue>): Promise<ProgressData> {
    return this.request<ProgressData>("/patients/progress", {
      method: "POST",
      body: JSON.stringify(progressData),
    })
  }

  // ---------- Videos ----------
  async uploadVideo(videoFile: File, metadata: Record<string, JsonValue>): Promise<unknown> {
    const formData = new FormData()
    formData.append("video", videoFile)
    formData.append("metadata", JSON.stringify(metadata))
    return this.request<unknown>("/videos/upload", {
      method: "POST",
      headers: {},
      body: formData,
    })
  }

  async getVideos(): Promise<unknown[]> {
    return this.request<unknown[]>("/videos/")
  }
}

export const apiClient = new ApiClient()
