// path: app/dashboard/useDashboardData.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type DashboardData = {
  kpis: { sessions: number; goals: number; tokens: number; progressPercent: number; unreadMessages: number };
  treatmentProgress: Array<{ id: string | number; name: string; status: string; type: "major" | "minor"; date: string | null }>;
  upcomingAppointments: Array<{ id: string | number; at: string; staff: string | null; status: string; notes: string }>;
  weeklyGoals: Array<{ id: string | number; name: string; current: number; target: number }>;
  tokenStats: { total: number; earned: number; spent: number; level: number };
  wellness: { week: string; wellness: number; attendance: number; goals: number } | null;
  activity: Array<{ id: string | number; ts: string; kind: string; summary: string; meta?: string }>;
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Non-JSON ${res.status}: ${txt.slice(0, 120)}…`);
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setData(json as DashboardData);
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, error, loading, refresh: async () => { fetchedRef.current = false; } };
}
