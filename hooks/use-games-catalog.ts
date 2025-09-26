"use client";

import { useEffect, useState } from "react";
import { supabase, supaEnvOk } from "@/lib/supabase-browser";

export type GameCatalogRow = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
  duration_sec?: number | null;
  cover_url?: string | null;
  genre?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function useGamesCatalog() {
  const [games, setGames] = useState<GameCatalogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(supaEnvOk);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supaEnvOk) return;

    let ignore = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("title", { ascending: true });
      if (ignore) return;
      if (error) setError(error.message);
      setGames(data ?? []);
      setLoading(false);
    }

    load();

    const ch = supabase
      .channel("rt-games")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        (payload) => {
          setGames((prev) => {
            const row = payload.new as GameCatalogRow;
            if (payload.eventType === "INSERT") return [...prev, row].sort((a, b) => a.title.localeCompare(b.title));
            if (payload.eventType === "UPDATE") return prev.map((g) => (g.id === row.id ? row : g));
            if (payload.eventType === "DELETE") return prev.filter((g) => g.id !== (payload.old as GameCatalogRow).id);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(ch);
    };
  }, []);

  return { games, loading, error, envOk: supaEnvOk };
}
