// ======================================================================
// FILE: src/context/patient-overview-context.tsx
// Connectivity for new + existing patients (zeros for new)
// ======================================================================
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// ---- Shared types (same contract all widgets consume) ----
export type TreatmentItem = {
  title: string;
  subtitle: string;
  status: "Completed" | "In Progress" | "Ongoing";
  percent?: number | null;
  date?: string | null;
};
export type DashboardData = {
  isNewPatient: boolean;
  daysInProgram: number;
  sessionsCompleted: number;
  goalsAchieved: string;  // "x/y"
  progressScore: number;  // 0..100
  treatmentProgress: TreatmentItem[];
  displayName?: string | null;
};

// ---- Helpers (normalize unsafe/missing values) ----
const API = process.env.NEXT_PUBLIC_API_URL || "";
const toInt = (v: unknown, d = 0) => (v == null ? d : Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : d);
const clamp01 = (n: number) => Math.max(0, Math.min(100, n));
const parseGoals = (raw: unknown): { done: number; total: number } => {
  if (typeof raw === "string" && raw.includes("/")) {
    const [a, b] = raw.split("/").map((x) => toInt(x, 0));
    return { done: a, total: b || 10 };
  }
  if (raw && typeof raw === "object") {
    const any = raw as any;
    return { done: toInt(any.done ?? any.achieved ?? any.goals_done ?? 0, 0), total: toInt(any.total ?? any.goals_total ?? 10, 10) || 10 };
  }
  return { done: toInt(raw, 0), total: 10 };
};
const daysBetweenUTC = (iso?: string | null) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0;
};
const authHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};
async function getJSON<T>(path: string) {
  if (!API) throw new Error("Missing NEXT_PUBLIC_API_URL");
  const r = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json", ...authHeaders() }, cache: "no-store" });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as T;
}

// ---- Normalizers for two common API shapes (no backend change) ----
async function fetchShapeA(): Promise<DashboardData> {
  const raw = await getJSON<any>("/api/patients/me/dashboard");
  const days = toInt(raw?.days_in_program, daysBetweenUTC(raw?.patient_created_at));
  const sessions = toInt(raw?.sessions_completed);
  const score = clamp01(toInt(raw?.progress_score));
  const { done, total } = parseGoals(raw?.goals_achieved);
  const items: TreatmentItem[] = Array.isArray(raw?.treatment_progress)
    ? raw.treatment_progress.map((p: any) => ({
        title: String(p?.title ?? "Step"),
        subtitle: String(p?.subtitle ?? ""),
        status: (p?.status ?? "Ongoing") as any,
        percent: p?.percent != null ? clamp01(toInt(p.percent)) : null,
        date: p?.date ?? null,
      }))
    : [];
  const isNew = days === 0 || (sessions === 0 && score === 0 && done === 0);
  return {
    isNewPatient: isNew,
    daysInProgram: days,
    sessionsCompleted: sessions,
    goalsAchieved: `${done}/${total}`,
    progressScore: score,
    treatmentProgress: items,
    displayName: (raw?.user?.full_name ?? raw?.full_name ?? raw?.name ?? null) as any,
  };
}

async function fetchShapeB(): Promise<DashboardData> {
  const [me, steps] = await Promise.all([getJSON<any>("/api/patients/me"), getJSON<any>("/api/patients/me/steps")]);
  const days = toInt(me?.days_in_program, daysBetweenUTC(me?.start_date));
  const sessions = toInt(me?.stats?.sessions ?? me?.sessions_completed);
  const score = clamp01(toInt(me?.stats?.score ?? me?.progress_score));
  const { done, total } = parseGoals({ done: me?.stats?.goals_done, total: me?.stats?.goals_total });
  const items: TreatmentItem[] = Array.isArray(steps)
    ? steps.map((s: any) => ({
        title: String(s?.title ?? "Step"),
        subtitle: String(s?.subtitle ?? ""),
        status: (s?.status ?? "Ongoing") as any,
        percent: s?.percent != null ? clamp01(toInt(s.percent)) : null,
        date: s?.date ?? null,
      }))
    : [];
  const isNew = days === 0 || (sessions === 0 && score === 0 && done === 0);
  return {
    isNewPatient: isNew,
    daysInProgram: days,
    sessionsCompleted: sessions,
    goalsAchieved: `${done}/${total}`,
    progressScore: score,
    treatmentProgress: items,
    displayName: (me?.user?.full_name ?? me?.full_name ?? null) as any,
  };
}

// ---- Context implementation ----
type Ctx = {
  overview: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};
const PatientOverviewCtx = createContext<Ctx | null>(null);

export function PatientOverviewProvider({ patientId, children }: { patientId: string | number; children: React.ReactNode }) {
  const [overview, setOverview] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try single-endpoint dashboard first, then composed endpoints.
      const data = await fetchShapeA().catch(() => fetchShapeB());
      setOverview(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load overview");
      // Safe zero state for brand-new patient if API not ready yet
      setOverview({
        isNewPatient: true,
        daysInProgram: 0,
        sessionsCompleted: 0,
        goalsAchieved: "0/10",
        progressScore: 0,
        treatmentProgress: [],
        displayName: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!patientId) return;
    refresh();
    // Poll every 30s
    timerRef.current = window.setInterval(refresh, 30_000);
    // Also refresh on window focus
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [patientId, refresh]);

  const value = useMemo<Ctx>(() => ({ overview, loading, error, refresh }), [overview, loading, error, refresh]);

  return <PatientOverviewCtx.Provider value={value}>{children}</PatientOverviewCtx.Provider>;
}

export function usePatientOverview(): Ctx {
  const ctx = useContext(PatientOverviewCtx);
  if (!ctx) throw new Error("usePatientOverview must be used within PatientOverviewProvider");
  return ctx;
}

// ======================================================================
// EXAMPLE WIRING — minimal versions of your widgets using the hook
// (Replace/merge into your existing components)
// ======================================================================

