// hooks/use-dashboard-data.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// singleton to avoid multiple clients
let _supabase: ReturnType<typeof createBrowserClient> | null = null;
function supabaseClient() {
  if (_supabase) return _supabase;
  _supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _supabase;
}

// API response (from /api/dashboard)
type DashboardApi = {
  kpis: { sessions: number; goals: number; tokens: number; progressPercent: number; unreadMessages: number };
  treatmentProgress: Array<{ id: string | number; name: string; status: string; type: "major" | "minor"; date: string | null }>;
  upcomingAppointments: Array<{ id: string | number; at: string; staff: string | null; status: string; notes: string }>;
  weeklyGoals: Array<{ id: string | number; name: string; current: number; target: number }>;
  tokenStats: { total: number; earned: number; spent: number; level: number };
  wellness: { week: string; wellness: number; attendance: number; goals: number } | null;
  activity: Array<{ id: string | number; ts: string; kind: string; summary: string; meta?: string }>;
  error?: string;
};

export function useDashboardData(opts?: { refreshOnFocus?: boolean }) {
  const supabase = supabaseClient();

  const [data, setData] = useState<DashboardApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

      const json = (await res.json()) as DashboardApi;
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setData(json);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to load dashboard");
      setData(null);
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
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, [opts?.refreshOnFocus, fetchOnce]);

  return { data, error, loading };
}
