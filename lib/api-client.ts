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
    // 204/205 have no body
    if (response.status === 204 || response.status === 205) return undefined as unknown as T

    const ct = response.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      return (await response.json()) as T
    }

    // Fallback: try text
    const text = await response.text()
    // Attempt to parse JSON anyway, but don’t crash if not JSON
    try {
      return JSON.parse(text) as T
    } catch {
      // @ts-expect-error – caller expects T, but server didn’t return JSON
      return text
    }
  }

  private async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { headers, body, query, omitAuth, ...rest } = options
    const url = buildURL(this.baseURL, endpoint, query)

    const defaultHeaders: Record<string, string> = {
      // For JSON bodies only; FormData must set its own boundary
      ...(body && !isFormData(body) ? { "Content-Type": "application/json" } : {}),
      ...this.authHeader(omitAuth),
    }

    const init: RequestInit = {
      // Avoid Next.js caching surprises for dynamic API calls
      cache: "no-store",
      // Keep credentials default; change to "include" if you later use cookie auth
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
        // Try to parse an error payload
        let details: unknown = undefined
        try {
          details = await this.parseResponse<unknown>(response)
        } catch {
          // ignore
        }
        const message =
          (details && typeof details === "object" && (details as any).message) ||
          `HTTP ${response.status}`
        throw new ApiError(String(message), response.status, details)
      }

      return await this.parseResponse<T>(response)
    } catch (err) {
      if (err instanceof ApiError) throw err

      // Network or runtime error
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

  // ---------- Auth ----------
  async login(email: string, password: string) {
    const formData = new FormData()
    formData.append("username", email)
    formData.append("password", password)

    return this.request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      // Don’t set Content-Type for FormData
      headers: {},
      body: formData,
      omitAuth: true,
    })
  }

  async register(userData: { email: string; password: string; full_name: string }) {
    return this.request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData satisfies Record<string, JsonValue>),
      omitAuth: true,
    })
  }

  async getCurrentUser() {
    return this.request<unknown>("/patients/me")
  }

  // ---------- Patient ----------
  async getPatientProfile() {
    return this.request<unknown>("/patients/me")
  }

  async updatePatientProfile(data: Record<string, JsonValue>) {
    return this.request<unknown>("/patients/me", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // ---------- Appointments ----------
  async getAppointments() {
    return this.request<unknown[]>("/appointments/")
  }

  async createAppointment(appointmentData: Record<string, JsonValue>) {
    return this.request<unknown>("/appointments/", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    })
  }

  // ---------- Messages ----------
  async getMessages() {
    return this.request<unknown[]>("/messages/")
  }

  async sendMessage(messageData: Record<string, JsonValue>) {
    return this.request<unknown>("/messages/", {
      method: "POST",
      body: JSON.stringify(messageData),
    })
  }

  // ---------- Progress ----------
  async getProgress() {
    return this.request<unknown>("/patients/progress")
  }

  async updateProgress(progressData: Record<string, JsonValue>) {
    return this.request<unknown>("/patients/progress", {
      method: "POST",
      body: JSON.stringify(progressData),
    })
  }

  // ---------- Videos ----------
  async uploadVideo(videoFile: File, metadata: Record<string, JsonValue>) {
    const formData = new FormData()
    formData.append("video", videoFile)
    formData.append("metadata", JSON.stringify(metadata))

    return this.request<unknown>("/videos/upload", {
      method: "POST",
      headers: {}, // let the browser set multipart boundary
      body: formData,
    })
  }

  async getVideos() {
    return this.request<unknown[]>("/videos/")
  }
}

export const apiClient = new ApiClient()
