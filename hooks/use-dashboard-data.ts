// path: hooks/use-dashboard-data.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client"; // singleton as shown earlier

// ---- Public types your components use ----
export type Appointment = {
  id: string | number;
  at: string;                   // ISO
  staff: string | null;
  status: string;
  notes: string;
};

export type Message = {
  id: string | number;
  ts: string;                   // ISO
  summary: string;
  meta?: string;
};

export type Progress = {
  overallProgress: number;
  weeklyGoals: Array<{ id: string | number; name: string; current: number; target: number }>;
  wellness: { week: string; wellness: number; attendance: number; goals: number } | null;
};

type DashboardData = {
  appointments: Appointment[];
  messages: Message[];
  progress: Progress | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
};

// ---- API response shape (camelCase) ----
type DashboardApi = {
  kpis: { progressPercent: number };
  upcomingAppointments: Appointment[];
  weeklyGoals: Progress["weeklyGoals"];
  wellness: Progress["wellness"];
  activity: Array<{ id: string | number; ts: string; kind: string; summary: string; meta?: string }>;
  // ...other fields are ignored here
};

export function useDashboardData(opts?: { refreshOnFocus?: boolean }): DashboardData {
  const supabase = getSupabaseClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;

      const res = await fetch("/api/dashboard", {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        credentials: "include",
        signal: ac.signal,
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Non-JSON ${res.status}: ${txt.slice(0, 140)}…`);
      }

      const json = (await res.json()) as DashboardApi | { error?: string };
      if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);

      const data = json as DashboardApi;

      // Normalize to consumers of this hook
      const normalizedProgress: Progress = {
        overallProgress: Number(data.kpis?.progressPercent ?? 0),
        weeklyGoals: Array.isArray(data.weeklyGoals) ? data.weeklyGoals : [],
        wellness: data.wellness ?? null,
      };

      const msgs: Message[] = Array.isArray(data.activity)
        ? data.activity
            .filter((a) => a.kind === "notification")
            .map((a) => ({ id: a.id, ts: a.ts, summary: a.summary, meta: a.meta }))
        : [];

      setAppointments(Array.isArray(data.upcomingAppointments) ? data.upcomingAppointments : []);
      setMessages(msgs);
      setProgress(normalizedProgress);
      setLastUpdated(Date.now());
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOnce();
    return () => abortRef.current?.abort();
  }, [fetchOnce]);

  useEffect(() => {
    if (!opts?.refreshOnFocus) return;
    const onFocus = () => fetchOnce();
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [opts?.refreshOnFocus, fetchOnce]);

  return { appointments, messages, progress, loading, error, lastUpdated, refetch: fetchOnce };
}
