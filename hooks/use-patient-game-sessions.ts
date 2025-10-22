"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

// Check if Supabase environment variables are available
const supaEnvOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export type GameSessionRow = {
  id: string;
  patient_id: string;
  game_id: string;
  score: number;
  duration_sec: number;
  created_at: string;
};

export function usePatientGameSessions(patientId?: string) {
  // ✅ hooks are declared unconditionally
  const [sessions, setSessions] = useState<GameSessionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(supaEnvOk && patientId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supaEnvOk || !patientId) return;

    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (ignore) return;
      if (error) setError(error.message);
      setSessions(data ?? []);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`rt-game-sessions-${patientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `patient_id=eq.${patientId}` },
        (payload) => {
          setSessions((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as GameSessionRow, ...prev];
            if (payload.eventType === "UPDATE") {
              const next = payload.new as GameSessionRow;
              return prev.map((s) => (s.id === next.id ? next : s));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as GameSessionRow;
              return prev.filter((s) => s.id !== old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      ignore = true;
    };
  }, [patientId]);

  return { sessions, loading, error, envOk: supaEnvOk };
}
