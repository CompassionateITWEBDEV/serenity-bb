// /lib/api-client.ts
// Minimal, robust API client with /api base normalization and FormData-safe headers.

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const NORMALIZED = RAW_BASE.replace(/\/$/, "");
const API_BASE_URL = NORMALIZED.endsWith("/api") ? NORMALIZED : `${NORMALIZED}/api`;

export class ApiError extends Error {
  public status: number;
  public details?: any;
  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private baseURL: string;
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${path}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    const headers: HeadersInit = {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const config: RequestInit = { ...options, headers };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let message = response.statusText || `HTTP ${response.status}`;
        let details: any;
        try { details = await response.json(); message = details?.message || message; } catch {}
        throw new ApiError(message, response.status, details);
      }
      const text = await response.text();
      return (text ? (JSON.parse(text) as T) : ({} as unknown as T));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      const isTypeErr = error?.name === "TypeError" || error instanceof TypeError;
      if (isTypeErr) throw new ApiError("Unable to connect to server.", 0);
      throw new ApiError("Network error occurred.", 0);
    }
  }

  // ==== Auth ====
  async login(email: string, password: string) {
    const payload = { email, password };
    return this.request<{ access_token: string; token_type: string; user?: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  }) {
    const payload = {
      email: userData.email,
      password: userData.password,
      first_name: userData.first_name ?? (userData.full_name?.split(" ")[0] || ""),
      last_name: userData.last_name ?? (userData.full_name?.split(" ").slice(1).join(" ") || ""),
      full_name: userData.full_name,
    };
    return this.request<{ message?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getCurrentUser() {
    return this.request<any>("/auth/me");
  }
  async updateCurrentUser(update: { first_name?: string; last_name?: string; phone?: string }) {
    return this.request<any>("/auth/me", { method: "PUT", body: JSON.stringify(update) });
  }

  // ==== Patient ====
  async getPatientProfile() {
    return this.request<any>("/patients/profile");
  }
  async updatePatientProfile(data: Record<string, any>) {
    return this.request<any>("/patients/profile", { method: "PUT", body: JSON.stringify(data) });
  }

  // ==== Appointments ====
  async getAppointments() {
    return this.request<any[]>("/appointments/");
  }
  async createAppointment(appointmentData: any) {
    return this.request<any>("/appointments/", { method: "POST", body: JSON.stringify(appointmentData) });
  }

  // ==== Messages ====
  async getMessages() {
    return this.request<any[]>("/messages/");
  }
  async sendMessage(messageData: any) {
    return this.request<any>("/messages/", { method: "POST", body: JSON.stringify(messageData) });
  }

  // ==== Progress ====
  async getProgress() {
    return this.request<any>("/patients/progress");
  }
  async updateProgress(progressData: any) {
    return this.request<any>("/patients/progress", { method: "POST", body: JSON.stringify(progressData) });
  }

  // ==== Videos ====
  async uploadVideo(videoFile: File, metadata: any) {
    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("metadata", JSON.stringify(metadata));
    return this.request<any>("/videos/upload", { method: "POST", headers: {}, body: formData });
  }
  async getVideos() {
    return this.request<any[]>("/videos/");
  }
}

export const apiClient = new ApiClient();
